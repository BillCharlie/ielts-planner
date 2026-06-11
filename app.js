(function () {
  const PASSWORD = "Bill";
  const ACCESS_KEY = "ieltsPlannerAccessSaved";
  const STATE_KEY = "ieltsPlannerStateV1";
  const TOKEN_KEY = "ieltsPlannerCloudToken";
  const API_BASE_KEY = "ieltsPlannerApiBase";
  const API_BASE = resolveApiBase();
  const HOURS = Array.from({ length: 18 }, (_, index) => index + 6);
  const EXPERIMENT_MODULES = ["制程", "量测", "TCAD", "光罩"];
  const ACADEMIC_MODULES = ["课程", "书报课程", "组会", "研讨会"];
  const ALL_PLAN_MODULES = [...EXPERIMENT_MODULES, ...ACADEMIC_MODULES];
  const data = window.IELTS_PLANNER_DATA || { mainPlan: [], dailyTemplates: [] };
  let state = loadState();
  let mainPlan = state.planRows?.length ? state.planRows : [...(data.mainPlan || []), ...(state.extraPlanRows || [])];
  const dailyTemplates = data.dailyTemplates || [];
  let mainByDate = new Map(mainPlan.map((item) => [item.date, item]));
  const dailyByDate = new Map(dailyTemplates.map((item) => [item.date, item]));
  let authToken = localStorage.getItem(TOKEN_KEY) || "";
  let cloudSaveTimer = null;
  let applyingRemoteState = false;

  let selectedDate = mainPlan[0]?.date || isoToday();
  let visibleMonth = selectedDate.slice(0, 7);
  let activeHour = 9;
  let deferredInstallPrompt = null;
  let highlightedPlanDate = "";

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindElements();
    bindAuth();
    bindNavigation();
    bindCalendarControls();
    bindPlanControls();
    bindPwa();
    showInitialView();
    registerServiceWorker();
  }

  function bindElements() {
    [
      "authView",
      "appView",
      "authForm",
      "passwordInput",
      "authError",
      "navCalendar",
      "navPlan",
      "dateRangeLabel",
      "installButton",
      "lockButton",
      "calendarView",
      "planView",
      "prevMonth",
      "nextMonth",
      "monthTitle",
      "monthGrid",
      "selectedDayType",
      "selectedDateTitle",
      "fillTemplateButton",
      "placeMainTasksButton",
      "clearAllButton",
      "reminderPanel",
      "summaryIelts",
      "summaryIeltsDetail",
      "summaryProjectType",
      "summaryProject",
      "summaryStatus",
      "summaryLimits",
      "taskPicker",
      "copyTaskButton",
      "saveDayButton",
      "saveStatus",
      "hourGrid",
      "planSearch",
      "extendPlanButton",
      "planRangeTitle",
      "moduleCatalog",
      "planWarningStrip",
      "planTableBody",
    ].forEach((id) => {
      el[id] = document.getElementById(id);
    });
  }

  function bindAuth() {
    el.authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = el.passwordInput.value.trim();
      el.authError.textContent = "Connecting cloud sync...";
      try {
        await loginRemote(password);
        localStorage.setItem(ACCESS_KEY, "true");
        el.passwordInput.value = "";
        el.authError.textContent = "";
        openApp();
        showSaved("Cloud sync ready");
        return;
      } catch (error) {
        if (password !== PASSWORD) {
          el.authError.textContent = "Wrong password.";
          return;
        }
        console.warn("Cloud login failed; using local cache.", error);
      }
      if (el.passwordInput.value.trim() !== PASSWORD) {
        el.authError.textContent = "密码不对。";
        return;
      }
      localStorage.setItem(ACCESS_KEY, "true");
      el.passwordInput.value = "";
      el.authError.textContent = "";
      openApp();
    });

    el.lockButton.addEventListener("click", () => {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(TOKEN_KEY);
      authToken = "";
      el.appView.hidden = true;
      el.authView.hidden = false;
      el.passwordInput.focus();
    });
  }

  function bindNavigation() {
    el.navCalendar.addEventListener("click", () => setView("calendar"));
    el.navPlan.addEventListener("click", () => setView("plan"));
  }

  function bindCalendarControls() {
    el.prevMonth.addEventListener("click", () => {
      visibleMonth = addMonths(visibleMonth, -1);
      renderCalendar();
    });

    el.nextMonth.addEventListener("click", () => {
      visibleMonth = addMonths(visibleMonth, 1);
      renderCalendar();
    });

    el.fillTemplateButton.addEventListener("click", () => {
      applyDailyTemplate(selectedDate);
      renderSelectedDay();
      renderCalendar();
      showSaved("已填入建议");
    });

    el.placeMainTasksButton.addEventListener("click", () => {
      placeMainTasks(selectedDate);
      renderSelectedDay();
      renderCalendar();
      showSaved("已排入主任务");
    });

    el.clearAllButton.addEventListener("click", () => {
      clearAllCalendarSlots();
    });

    el.copyTaskButton.addEventListener("click", () => {
      const task = tasksForDate(selectedDate).find((item) => item.id === el.taskPicker.value);
      if (!task) return;
      setSlot(selectedDate, activeHour, { text: task.text, taskId: task.id });
      renderSelectedDay();
      renderCalendar();
      showSaved("已复制");
    });

    el.saveDayButton.addEventListener("click", () => {
      saveCurrentDaySlots();
      renderCalendar();
      renderReminders();
      showSaved("当日已保存");
    });
  }

  function bindPlanControls() {
    el.planSearch.addEventListener("input", renderPlanTable);
    el.extendPlanButton.addEventListener("click", () => {
      extendPlan(7);
      renderAll();
      showSaved("已延伸7天");
    });
  }

  function bindPwa() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      el.installButton.hidden = false;
    });

    el.installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      el.installButton.hidden = true;
    });
  }

  function showInitialView() {
    if (localStorage.getItem(ACCESS_KEY) === "true") {
      openApp();
      if (authToken) refreshCloudState();
    } else {
      el.authView.hidden = false;
      el.passwordInput.focus();
    }
  }

  function openApp() {
    el.authView.hidden = true;
    el.appView.hidden = false;
    el.dateRangeLabel.textContent = `${formatDate(mainPlan[0]?.date)} - ${formatDate(mainPlan.at(-1)?.date)}`;
    el.planRangeTitle.textContent = `${formatDate(mainPlan[0]?.date)} - ${formatDate(mainPlan.at(-1)?.date)}`;
    renderAll();
  }

  function setView(viewName) {
    const isCalendar = viewName === "calendar";
    el.navCalendar.classList.toggle("active", isCalendar);
    el.navPlan.classList.toggle("active", !isCalendar);
    el.calendarView.classList.toggle("active", isCalendar);
    el.planView.classList.toggle("active", !isCalendar);
    if (!isCalendar) renderPlanTable();
  }

  function renderAll() {
    renderModuleCatalog();
    renderCalendar();
    renderSelectedDay();
    renderPlanTable();
  }

  function renderCalendar() {
    el.monthTitle.textContent = monthLabel(visibleMonth);
    el.monthGrid.innerHTML = "";

    const [year, month] = visibleMonth.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month - 1, 1 - startOffset);

    for (let index = 0; index < 42; index += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const iso = toIso(current);
      const plan = mainByDate.get(iso);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day-cell";
      button.classList.toggle("rest-day", isRestDay(plan));
      button.classList.toggle("normal-day", !!plan && !isRestDay(plan));
      button.classList.toggle("outside", iso.slice(0, 7) !== visibleMonth);
      button.classList.toggle("selected", iso === selectedDate);
      button.classList.toggle("has-warning", !!plan && missingTasksForDate(iso).length > 0);
      button.classList.toggle("has-done", scheduledTaskIds(iso).size > 0);
      button.classList.toggle("day-complete", isDayFullySaved(iso));
      const hasPlanWarning = !!plan && missingTasksForDate(iso).length > 0;
      const projectMeta = plan && !isRestDay(plan) ? projectSummaryText(plan, iso) : "";
      const monthMeta = plan ? projectMeta || plan.cambridge || plan.ieltsPlan : "";
      button.innerHTML = `
        <span class="day-num">${current.getDate()}${hasPlanWarning ? '<i class="warning-dot"></i>' : ""}</span>
        <span class="day-meta">${safe(monthMeta)}</span>
      `;
      button.addEventListener("click", () => {
        selectedDate = iso;
        visibleMonth = iso.slice(0, 7);
        renderCalendar();
        renderSelectedDay();
      });
      el.monthGrid.appendChild(button);
    }
  }

  function renderSelectedDay() {
    const plan = mainByDate.get(selectedDate) || {};
    const template = dailyByDate.get(selectedDate) || {};
    el.selectedDayType.innerHTML = `${formatDate(selectedDate)} ${tagForDay(normalizedDayType(plan))}`;
    el.selectedDateTitle.textContent = `${plan.weekday || template.weekday || ""} ${plan.ieltsPlan || template.mainTask || "自由计划"}`;
    el.summaryIelts.textContent = plan.ieltsPlan || "无";
    el.summaryIeltsDetail.textContent = [plan.ieltsModule, plan.cambridge].filter(Boolean).join(" / ");
    el.summaryProjectType.textContent = normalizedProjectType(plan) || "无";
    el.summaryProject.textContent = projectSummaryText(plan, selectedDate) || template.notes || "今天没有实验专案/学务主任务。";
    el.summaryStatus.textContent = getPlanOverride(selectedDate, "status") || plan.status || "未开始";
    el.summaryLimits.textContent = plan.limits || template.notes || "";

    renderTaskPicker();
    renderReminders();
    renderHourGrid();
  }

  function renderTaskPicker() {
    const tasks = tasksForDate(selectedDate);
    el.taskPicker.innerHTML = "";
    tasks.forEach((task) => {
      const option = document.createElement("option");
      option.value = task.id;
      option.textContent = task.label;
      el.taskPicker.appendChild(option);
    });
  }

  function renderReminders() {
    const missing = missingTasksForDate(selectedDate);
    if (!missing.length) {
      el.reminderPanel.hidden = true;
      el.reminderPanel.textContent = "";
      return;
    }
    el.reminderPanel.hidden = false;
    el.reminderPanel.innerHTML = `<strong>还没排进小时表：</strong>${missing.map((item) => `<div>${safe(item.label)}</div>`).join("")}`;
  }

  function renderHourGrid() {
    const daySlots = state.schedule[selectedDate] || {};
    el.hourGrid.innerHTML = "";
    HOURS.forEach((hour) => {
      const slot = normalizeSlot(daySlots[hour]);
      const row = document.createElement("article");
      row.className = "hour-row";
      row.dataset.hour = String(hour);
      row.classList.toggle("active", hour === activeHour);

      const time = document.createElement("div");
      time.className = "hour-time";
      time.textContent = `${pad(hour)}:00-${pad(hour + 1)}:00`;

      const textarea = document.createElement("textarea");
      textarea.value = slot.text;
      textarea.placeholder = "自由编辑";
      textarea.addEventListener("focus", () => {
        activeHour = hour;
        renderHourActiveState();
      });
      textarea.addEventListener("input", () => {
        markHourUnsaved(row);
      });

      const select = document.createElement("select");
      select.className = "task-ref";
      select.innerHTML = `<option value="">无对应事项</option>${tasksForDate(selectedDate)
        .map((task) => `<option value="${safeAttr(task.id)}">${safe(task.label)}</option>`)
        .join("")}`;
      select.value = slot.taskId || "";
      select.addEventListener("change", () => {
        const task = tasksForDate(selectedDate).find((item) => item.id === select.value);
        if (task && !textarea.value.trim()) textarea.value = task.text;
        markHourUnsaved(row);
      });

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "inline-save-button";
      if (isHourSaved(selectedDate, hour)) {
        saveButton.classList.add("saved");
        saveButton.textContent = "已保存";
      } else {
        saveButton.textContent = "待保存";
      }
      saveButton.addEventListener("click", () => {
        setSlot(selectedDate, hour, {
          text: textarea.value,
          taskId: select.value,
        }, { saved: true });
        markHourSaved(row);
        renderCalendar();
        renderReminders();
        showSaved("已保存");
      });

      row.append(time, textarea, select, saveButton);
      el.hourGrid.appendChild(row);
    });
  }

  function markHourUnsaved(row) {
    row.classList.add("unsaved");
    const button = row.querySelector(".inline-save-button");
    if (button) {
      button.classList.remove("saved");
      button.textContent = "待保存";
    }
    const hour = Number(row.dataset.hour);
    if (Number.isFinite(hour) && state.savedSlots?.[selectedDate]?.[hour]) {
      delete state.savedSlots[selectedDate][hour];
      if (!Object.keys(state.savedSlots[selectedDate]).length) delete state.savedSlots[selectedDate];
      saveState();
      renderCalendar();
    }
  }

  function markHourSaved(row) {
    row.classList.remove("unsaved");
    const button = row.querySelector(".inline-save-button");
    if (button) {
      button.classList.add("saved");
      button.textContent = "已保存";
    }
  }

  function saveCurrentDaySlots() {
    document.querySelectorAll(".hour-row").forEach((row) => {
      const hour = Number(row.dataset.hour);
      const textarea = row.querySelector("textarea");
      const select = row.querySelector(".task-ref");
      if (!Number.isFinite(hour)) return;
      setSlot(selectedDate, hour, {
        text: textarea?.value || "",
        taskId: select?.value || "",
      }, { saved: true });
      markHourSaved(row);
    });
  }

  function clearAllCalendarSlots() {
    if (!Object.keys(state.schedule || {}).length && !Object.keys(state.savedSlots || {}).length) {
      showSaved("没有可清除的小时计划");
      return;
    }
    const confirmed = window.confirm("确定要清除所有日期的小时计划吗？主计划不会被删除。");
    if (!confirmed) return;
    state.schedule = {};
    state.savedSlots = {};
    saveState();
    renderSelectedDay();
    renderCalendar();
    renderReminders();
    showSaved("已清除全部小时计划");
  }

  function renderHourActiveState() {
    document.querySelectorAll(".hour-row").forEach((row, index) => {
      row.classList.toggle("active", HOURS[index] === activeHour);
    });
  }

  function renderModuleCatalog() {
    el.moduleCatalog.innerHTML = `
      ${moduleCatalogSectionMarkup("实验专案", EXPERIMENT_MODULES)}
      ${moduleCatalogSectionMarkup("学务", ACADEMIC_MODULES)}
    `;

    el.moduleCatalog.querySelectorAll(".module-add-button").forEach((button) => {
      button.addEventListener("click", () => {
        const module = button.dataset.module;
        const nameInput = el.moduleCatalog.querySelector(`.module-new-name[data-module="${cssEscape(module)}"]`);
        const daysInput = el.moduleCatalog.querySelector(`.module-new-days[data-module="${cssEscape(module)}"]`);
        addModuleItem(module, nameInput.value.trim(), daysInput.value);
        nameInput.value = "";
        daysInput.value = "";
        renderModuleCatalog();
        renderPlanTable();
        renderSelectedDay();
        showSaved("已新增模块项目");
      });
    });

    el.moduleCatalog.querySelectorAll(".catalog-name-input").forEach((input) => {
      input.addEventListener("input", () => {
        updateModuleItem(input.dataset.id, { name: input.value });
        renderPlanTable();
        renderSelectedDay();
        showSaved("已保存");
      });
    });

    el.moduleCatalog.querySelectorAll(".catalog-days-input").forEach((input) => {
      input.addEventListener("input", () => {
        updateModuleItem(input.dataset.id, { days: input.value });
        renderPlanTable();
        renderSelectedDay();
        showSaved("已保存");
      });
    });

    el.moduleCatalog.querySelectorAll(".catalog-delete-button").forEach((button) => {
      button.addEventListener("click", () => {
        deleteModuleItem(button.dataset.id);
        renderModuleCatalog();
        renderPlanTable();
        renderSelectedDay();
        renderCalendar();
        showSaved("已删除");
      });
    });
  }

  function moduleCatalogSectionMarkup(title, modules) {
    return `
      <section class="module-catalog-section">
        <h2 class="module-section-title">${safe(title)}</h2>
        <div class="module-catalog-grid">
          ${modules.map((module) => moduleCardMarkup(module)).join("")}
        </div>
      </section>
    `;
  }

  function moduleCardMarkup(module) {
      const items = getModuleItems(module);
      const itemRows = items.length
        ? items
            .map(
              (item) => `
                <div class="module-item-row" data-id="${safeAttr(item.id)}">
                  <input class="catalog-name-input" data-id="${safeAttr(item.id)}" value="${safeAttr(item.name)}" aria-label="${safeAttr(module)}项目名称" />
                  <input class="catalog-days-input" data-id="${safeAttr(item.id)}" type="number" min="1" max="90" step="1" value="${safeAttr(item.days || "")}" placeholder="天数" aria-label="${safeAttr(module)}预计天数" />
                  <button class="catalog-delete-button" type="button" data-id="${safeAttr(item.id)}"${item.locked ? " disabled" : ""}>删</button>
                </div>
              `,
            )
            .join("")
        : `<div class="module-empty">还没有自定义项目</div>`;
      return `
        <article class="module-card">
          <h2>${safe(module)}</h2>
          <div class="module-add-row">
            <input class="module-new-name" data-module="${safeAttr(module)}" placeholder="${safeAttr(module)}项目名" />
            <input class="module-new-days" data-module="${safeAttr(module)}" type="number" min="1" max="90" step="1" placeholder="天数" />
            <button class="module-add-button" type="button" data-module="${safeAttr(module)}">新增</button>
          </div>
          <div class="module-item-list">${itemRows}</div>
        </article>
      `;
  }

  function renderPlanTable() {
    const query = el.planSearch.value.trim().toLowerCase();
    const rows = mainPlan.filter((item) => {
      if (!query) return true;
      return Object.values(item).join(" ").toLowerCase().includes(query);
    });

    el.planTableBody.innerHTML = "";
    rows.forEach((item) => {
      const row = document.createElement("tr");
      row.className = isRestDay(item) ? "plan-row-rest" : "plan-row-normal";
      row.classList.toggle("row-highlight", highlightedPlanDate === item.date);
      row.innerHTML = `
        <td data-label="日期">
          <input class="plan-edit-input plan-date-input" data-field="date" data-date="${safeAttr(item.date)}" type="date" value="${safeAttr(item.date)}" />
          <button class="date-button" type="button">${safe(item.weekday || weekdayZh(item.date))}</button>
        </td>
        <td data-label="日类型">
          <select class="plan-edit-input" data-field="dayType" data-date="${safeAttr(item.date)}">
            ${["正常", "休息"].map((type) => `<option value="${type}">${type}</option>`).join("")}
          </select>
        </td>
        <td class="project-cell" data-label="实验专案 / 学务">
          <select class="plan-edit-input project-type-select" data-field="projectType" data-date="${safeAttr(item.date)}">
            ${(isRestDay(item) ? ["休息"] : ["", "实验专案", "学务"]).map((type) => `<option value="${type}">${type || "未安排"}</option>`).join("")}
          </select>
          <div class="project-planner-slot">${projectPlannerMarkup(item)}</div>
        </td>
        <td data-label="IELTS / 模块">
          <textarea class="plan-edit-textarea" data-field="ieltsPlan" data-date="${safeAttr(item.date)}" placeholder="IELTS">${safe(item.ieltsPlan || "")}</textarea>
          <textarea class="plan-edit-textarea" data-field="ieltsModule" data-date="${safeAttr(item.date)}" placeholder="模块">${safe(item.ieltsModule || "")}</textarea>
          <input class="plan-edit-input" data-field="cambridge" data-date="${safeAttr(item.date)}" value="${safeAttr(item.cambridge || "")}" placeholder="Cambridge进度" />
        </td>
        <td data-label="备注"><textarea class="actual-input" data-date="${safeAttr(item.date)}" placeholder="备注">${safe(getPlanOverride(item.date, "actual") || item.actual || "")}</textarea></td>
        <td class="row-actions" data-label="操作">
          <button class="row-save-button" type="button" data-date="${safeAttr(item.date)}">已保存</button>
          <button class="row-action-button" type="button" data-action="up" data-date="${safeAttr(item.date)}">上</button>
          <button class="row-action-button" type="button" data-action="down" data-date="${safeAttr(item.date)}">下</button>
          <button class="row-action-button" type="button" data-action="insert" data-date="${safeAttr(item.date)}">插入</button>
          <button class="row-action-button" type="button" data-action="copy" data-date="${safeAttr(item.date)}">复制</button>
          <button class="row-action-button danger" type="button" data-action="delete" data-date="${safeAttr(item.date)}">删</button>
        </td>
      `;
      row.querySelector(".date-button").addEventListener("click", () => {
        selectedDate = item.date;
        visibleMonth = item.date.slice(0, 7);
        setView("calendar");
        renderCalendar();
        renderSelectedDay();
      });

      row.querySelectorAll(".plan-edit-input, .plan-edit-textarea").forEach((input) => {
        if (input.dataset.field === "dayType") input.value = normalizedDayType(item);
        else if (input.dataset.field === "projectType") input.value = normalizedProjectType(item);
        else if (input.dataset.field) input.value = item[input.dataset.field] || "";
        input.addEventListener("change", () => {
          if (input.dataset.field === "dayType") applyDayTypeDraft(row, input.value);
          if (input.dataset.field === "projectType") updateProjectPlannerDraft(row);
          markPlanRowUnsaved(row);
        });
        input.addEventListener("input", () => {
          if (input.dataset.field === "projectType") updateProjectPlannerDraft(row);
          markPlanRowUnsaved(row);
        });
      });

      const actualInput = row.querySelector(".actual-input");
      actualInput.addEventListener("input", () => {
        markPlanRowUnsaved(row);
      });

      bindProjectItemSelect(row);

      row.querySelector(".row-save-button").addEventListener("click", () => {
        savePlanRowFromElement(row, item.date);
        markPlanRowSaved(row);
        renderAll();
        showSaved("已保存");
      });

      row.querySelectorAll(".row-action-button").forEach((button) => {
        button.addEventListener("click", () => {
          const targetDate = handleRowAction(item.date, button.dataset.action);
          highlightedPlanDate = targetDate || "";
          renderAll();
          clearPlanHighlight(targetDate);
          showSaved("已更新行");
        });
      });

      el.planTableBody.appendChild(row);
    });

    const warningCount = mainPlan.reduce((count, item) => count + (missingTasksForDate(item.date).length ? 1 : 0), 0);
    el.planWarningStrip.textContent = warningCount
      ? `还有 ${warningCount} 天的总体计划事项未排入小时表。`
      : "所有总体计划事项都已经排入小时表。";
  }

  function applyDailyTemplate(date) {
    const template = dailyByDate.get(date);
    if (!template) return;
    const mapping = [
      [7, template.morningEarly],
      [9, template.morningCore],
      [10, template.morningCore],
      [11, template.morningCore],
      [14, template.afternoon],
      [15, template.afternoon],
      [16, template.afternoon],
      [18, template.evening],
      [19, template.night],
      [20, template.night],
      [21, template.night],
    ];
    mapping.forEach(([hour, text]) => {
      if (text) setSlot(date, hour, { text });
    });
  }

  function placeMainTasks(date) {
    const taskHours = { ielts: 9, project: 14, daily: 18, swim: 20 };
    const usedHours = new Set();
    tasksForDate(date).forEach((task, index) => {
      let hour = taskHours[task.kind] || Math.min(23, 9 + index);
      while (usedHours.has(hour) && hour < 23) hour += 1;
      usedHours.add(hour);
      setSlot(date, hour, { text: task.text, taskId: task.id });
    });
  }

  function tasksForDate(date) {
    const plan = mainByDate.get(date);
    const template = dailyByDate.get(date);
    const tasks = [];
    const noIelts = isNoIeltsDay(plan);
    if (plan && !noIelts) {
      const hasSpecificPlan = plan.ieltsPlan && !/休息日|休息/.test(plan.ieltsPlan);
      tasks.push({
        id: `${date}:ielts`,
        kind: "ielts",
        label: hasSpecificPlan ? `IELTS｜${plan.ieltsPlan}` : "IELTS｜每日提醒",
        text: hasSpecificPlan
          ? [plan.ieltsPlan, plan.ieltsModule, plan.cambridge].filter(Boolean).join(" - ")
          : "IELTS每日提醒 - 10到20分钟单词、听力或口语轻量维护",
        keywords: hasSpecificPlan ? [plan.ieltsPlan, plan.cambridge, "IELTS"].filter(Boolean) : ["IELTS", "雅思"],
      });
    }
    if (plan?.projectType && !isRestDay(plan)) {
      const projectText = projectSummaryText(plan, date);
      tasks.push({
        id: `${date}:project`,
        kind: "project",
        label: projectText,
        text: projectText,
        keywords: [plan.projectType, getSelectedModule(plan), projectText].filter(Boolean),
      });
    }
    if (template?.mainTask && !isRestText(template.mainTask) && !tasks.some((task) => task.text.includes(template.mainTask))) {
      tasks.push({
        id: `${date}:daily`,
        kind: "daily",
        label: `每日主任务｜${template.mainTask}`,
        text: [template.mainTask, template.notes].filter(Boolean).join(" - "),
        keywords: [template.mainTask].filter(Boolean),
      });
    }
    tasks.push({
      id: `${date}:swim`,
      kind: "swim",
      label: "游泳｜每日必须提醒",
      text: template?.swim ? `游泳 - ${template.swim}` : "游泳 - 晚泳 20:30-21:30；必要时早泳",
      keywords: ["游泳", "早泳", "晚泳"],
    });
    if (!tasks.length) {
      tasks.push({
        id: `${date}:free`,
        kind: "free",
        label: "自由安排",
        text: template?.notes || "自由安排",
        keywords: [],
      });
    }
    return tasks;
  }

  function missingTasksForDate(date) {
    const tasks = tasksForDate(date).filter((task) => !task.id.endsWith(":free"));
    const ids = scheduledTaskIds(date);
    const text = dayScheduleText(date);
    return tasks.filter((task) => {
      if (ids.has(task.id)) return false;
      return !task.keywords.some((keyword) => keyword && text.includes(keyword));
    });
  }

  function scheduledTaskIds(date) {
    const ids = new Set();
    Object.values(state.schedule[date] || {}).forEach((slot) => {
      const normalized = normalizeSlot(slot);
      if (normalized.taskId) ids.add(normalized.taskId);
    });
    return ids;
  }

  function isDayFullySaved(date) {
    const slots = state.savedSlots?.[date] || {};
    return HOURS.every((hour) => Object.prototype.hasOwnProperty.call(slots, hour));
  }

  function isHourSaved(date, hour) {
    return Object.prototype.hasOwnProperty.call(state.savedSlots?.[date] || {}, hour);
  }

  function dayScheduleText(date) {
    return Object.values(state.schedule[date] || {})
      .map((slot) => normalizeSlot(slot).text)
      .join("\n");
  }

  function setSlot(date, hour, patch, options = {}) {
    if (!state.schedule[date]) state.schedule[date] = {};
    const previous = normalizeSlot(state.schedule[date][hour]);
    state.schedule[date][hour] = {
      text: patch.text ?? previous.text,
      taskId: patch.taskId ?? previous.taskId,
    };
    if (!state.savedSlots) state.savedSlots = {};
    if (options.saved) {
      if (!state.savedSlots[date]) state.savedSlots[date] = {};
      state.savedSlots[date][hour] = true;
    } else if (state.savedSlots[date]) {
      delete state.savedSlots[date][hour];
      if (!Object.keys(state.savedSlots[date]).length) delete state.savedSlots[date];
    }
    saveState();
  }

  function normalizeSlot(slot) {
    if (!slot) return { text: "", taskId: "" };
    if (typeof slot === "string") return { text: slot, taskId: "" };
    return { text: slot.text || "", taskId: slot.taskId || "" };
  }

  function getPlanOverride(date, field) {
    return state.planOverrides[date]?.[field] || "";
  }

  function setPlanOverride(date, field, value) {
    if (!state.planOverrides[date]) state.planOverrides[date] = {};
    state.planOverrides[date][field] = value;
    saveState();
  }

  function markPlanRowUnsaved(row) {
    row.classList.add("unsaved");
    const button = row.querySelector(".row-save-button");
    if (button) {
      button.classList.add("unsaved");
      button.textContent = "保存";
    }
  }

  function markPlanRowSaved(row) {
    row.classList.remove("unsaved");
    const button = row.querySelector(".row-save-button");
    if (button) {
      button.classList.remove("unsaved");
      button.textContent = "已保存";
    }
  }

  function applyDayTypeDraft(row, dayType) {
    const projectType = row.querySelector('[data-field="projectType"]');
    const ieltsPlan = row.querySelector('[data-field="ieltsPlan"]');
    const ieltsModule = row.querySelector('[data-field="ieltsModule"]');
    const cambridge = row.querySelector('[data-field="cambridge"]');
    if (dayType === "休息") {
      if (projectType) {
        projectType.innerHTML = `<option value="休息">休息</option>`;
        projectType.value = "休息";
      }
      if (ieltsPlan) ieltsPlan.value = "休息";
      if (ieltsModule) ieltsModule.value = "休息";
      if (cambridge) cambridge.value = "";
      row.classList.remove("plan-row-normal");
      row.classList.add("plan-row-rest");
      updateProjectPlannerDraft(row);
      return;
    }
    if (projectType && projectType.value === "休息") {
      projectType.innerHTML = `<option value="">未安排</option><option value="实验专案">实验专案</option><option value="学务">学务</option>`;
      projectType.value = "";
    }
    if (ieltsPlan && isRestText(ieltsPlan.value)) ieltsPlan.value = "IELTS每日提醒";
    if (ieltsModule && isRestText(ieltsModule.value)) ieltsModule.value = "自由安排";
    row.classList.remove("plan-row-rest");
    row.classList.add("plan-row-normal");
    updateProjectPlannerDraft(row);
  }

  function updateProjectPlannerDraft(row) {
    const slot = row.querySelector(".project-planner-slot");
    const date = row.querySelector('[data-field="date"]')?.value || row.querySelector(".row-save-button")?.dataset.date || selectedDate;
    const projectType = row.querySelector('[data-field="projectType"]')?.value || "";
    if (!slot) return;
    if (projectType === "休息") {
      slot.innerHTML = "";
      return;
    }
    if (!projectType) {
      slot.innerHTML = "";
      return;
    }
    if (projectType === "学务") {
      const existing = mainByDate.get(date) || {};
      const draft = {
        ...existing,
        date,
        dayType: "正常",
        projectType: "学务",
        projectModule: ACADEMIC_MODULES.includes(existing.projectModule) ? existing.projectModule : ACADEMIC_MODULES[0],
      };
      slot.innerHTML = projectPlannerMarkup(draft);
      bindProjectItemSelect(row);
      return;
    }
    const existing = mainByDate.get(date) || {};
    const draft = {
      ...existing,
      date,
      dayType: "正常",
      projectType: "实验专案",
      projectModule: EXPERIMENT_MODULES.includes(existing.projectModule) ? existing.projectModule : EXPERIMENT_MODULES[0],
    };
    slot.innerHTML = projectPlannerMarkup(draft);
    bindProjectItemSelect(row);
  }

  function bindProjectItemSelect(row) {
    const projectItemSelect = row.querySelector(".project-item-select");
    if (!projectItemSelect) return;
    projectItemSelect.addEventListener("change", () => {
      const option = projectItemSelect.selectedOptions[0];
      const label = row.querySelector(".project-progress-label");
      if (label) label.textContent = option?.dataset.progress || option?.textContent || "";
      markPlanRowUnsaved(row);
    });
  }

  function savePlanRowFromElement(row, originalDate) {
    const dateInput = row.querySelector('[data-field="date"]');
    const nextDate = dateInput?.value || originalDate;
    const draft = {
      date: nextDate,
      dayType: row.querySelector('[data-field="dayType"]')?.value || "正常",
      projectType: row.querySelector('[data-field="projectType"]')?.value || "",
      ieltsPlan: row.querySelector('[data-field="ieltsPlan"]')?.value || "",
      ieltsModule: row.querySelector('[data-field="ieltsModule"]')?.value || "",
      cambridge: row.querySelector('[data-field="cambridge"]')?.value || "",
      actual: row.querySelector(".actual-input")?.value || "",
      projectItemId: row.querySelector(".project-item-select")?.value || "",
    };
    updatePlanRow(originalDate, "date", draft.date);
    updatePlanRow(draft.date, "dayType", draft.dayType);
    updatePlanRow(draft.date, "projectType", draft.projectType);
    updatePlanRow(draft.date, "ieltsPlan", draft.ieltsPlan);
    updatePlanRow(draft.date, "ieltsModule", draft.ieltsModule);
    updatePlanRow(draft.date, "cambridge", draft.cambridge);
    setPlanOverride(draft.date, "actual", draft.actual);
    if (draft.projectItemId) setProjectItemSelected(draft.date, draft.projectItemId);
    highlightedPlanDate = draft.date;
    clearPlanHighlight(draft.date);
  }

  function updatePlanRow(date, field, value, options = {}) {
    if (!field) return;
    const index = mainPlan.findIndex((item) => item.date === date);
    if (index < 0) return;
    const row = mainPlan[index];
    const previousDate = row.date;
    row[field] = value;
    if (field === "date") {
      row.weekday = weekdayZh(value);
      moveDateKey(state.modulePlans, previousDate, value);
      moveDateKey(state.planOverrides, previousDate, value);
      moveDateKey(state.schedule, previousDate, value);
      moveDateKey(state.savedSlots, previousDate, value);
      if (selectedDate === previousDate) selectedDate = value;
    }
    if (field === "dayType") {
      applyDayTypeToRow(row, value);
    }
    if (field === "projectType" && value === "休息") {
      applyDayTypeToRow(row, "休息");
    }
    persistPlanRows();
    rebuildPlanIndexes();
    saveState();
  }

  function applyDayTypeToRow(row, dayType) {
    if (dayType === "休息") {
      row.dayType = "休息";
      row.ieltsPriority = "休息";
      row.ieltsPlan = "休息";
      row.ieltsModule = "休息";
      row.cambridge = "";
      row.projectType = "休息";
      row.projectModule = "";
      row.projectPlan = "";
      row.limits = "休息日";
      return;
    }
    row.dayType = "正常";
    if (isRestText(row.projectType)) row.projectType = "实验专案";
    if (isRestText(row.ieltsPlan)) row.ieltsPlan = "IELTS每日提醒";
    if (isRestText(row.ieltsModule)) row.ieltsModule = "自由安排";
    if (isRestText(row.ieltsPriority)) row.ieltsPriority = "自订";
    if (row.projectType === "实验专案" && !EXPERIMENT_MODULES.includes(row.projectModule)) row.projectModule = EXPERIMENT_MODULES[0];
    if (row.projectType === "学务" && !ACADEMIC_MODULES.includes(row.projectModule)) row.projectModule = ACADEMIC_MODULES[0];
    row.limits = row.limits === "休息日" ? "" : row.limits;
  }

  function handleRowAction(date, action) {
    const index = mainPlan.findIndex((item) => item.date === date);
    if (index < 0) return "";
    let highlightDate = date;
    if (action === "up" && index > 0) {
      [mainPlan[index - 1], mainPlan[index]] = [mainPlan[index], mainPlan[index - 1]];
    }
    if (action === "down" && index < mainPlan.length - 1) {
      [mainPlan[index], mainPlan[index + 1]] = [mainPlan[index + 1], mainPlan[index]];
    }
    if (action === "insert") {
      const inserted = createBlankPlanRow(addDays(mainPlan[index].date, 1));
      mainPlan.splice(index + 1, 0, inserted);
      highlightDate = inserted.date;
    }
    if (action === "copy") {
      const copied = clonePlanRow(mainPlan[index]);
      mainPlan.splice(index + 1, 0, copied);
      highlightDate = copied.date;
    }
    if (action === "delete" && mainPlan.length > 1) {
      const [removed] = mainPlan.splice(index, 1);
      delete state.modulePlans[removed.date];
      delete state.planOverrides[removed.date];
      delete state.schedule[removed.date];
      delete state.savedSlots?.[removed.date];
      if (selectedDate === removed.date) selectedDate = mainPlan[Math.max(0, index - 1)].date;
      highlightDate = mainPlan[Math.min(index, mainPlan.length - 1)]?.date || "";
    }
    persistPlanRows();
    rebuildPlanIndexes();
    saveState();
    return highlightDate;
  }

  function clearPlanHighlight(date) {
    if (!date) return;
    window.setTimeout(() => {
      if (highlightedPlanDate !== date) return;
      highlightedPlanDate = "";
      renderPlanTable();
    }, 2200);
  }

  function createBlankPlanRow(date) {
    return {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      weekday: weekdayZh(date),
      dayType: "延伸",
      ieltsPriority: "",
      ieltsPlan: "IELTS每日提醒",
      ieltsModule: "自由安排",
      cambridge: "",
      projectType: "实验专案",
      projectPlan: "",
      projectModule: "制程",
      limits: "",
      status: "未开始",
      actual: "",
    };
  }

  function clonePlanRow(row) {
    const nextDate = addDays(row.date, 1);
    return {
      ...JSON.parse(JSON.stringify(row)),
      id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: nextDate,
      weekday: weekdayZh(nextDate),
      actual: "",
      status: "未开始",
    };
  }

  function persistPlanRows() {
    state.planRows = mainPlan;
  }

  function moveDateKey(object, from, to) {
    if (!object || from === to || !(from in object)) return;
    object[to] = object[from];
    delete object[from];
  }

  function projectPlannerMarkup(item) {
    const type = normalizedProjectType(item);
    if (type !== "实验专案" && type !== "学务") return "";
    const modules = modulesForProjectType(type);
    const selectedItem = getSelectedProjectItem(item);
    const progress = projectItemProgressForDate(item.date, selectedItem.id);
    const progressLabel = `${selectedItem.name}${progress ? ` ${progress}` : ""}`;
    const options = projectItemOptionsMarkup(item.projectModule, selectedItem.id, item.date, modules);
    return `
      <div class="module-planner">
        <select class="project-item-select" aria-label="选择${safeAttr(type)}" data-date="${safeAttr(item.date)}">${options}</select>
        <label>
          <span class="project-progress-label">${safe(progressLabel)}</span>
        </label>
      </div>
    `;
  }

  function getSelectedModule(item) {
    const selectedItem = getSelectedProjectItem(item);
    if (selectedItem?.module) return selectedItem.module;
    if (ALL_PLAN_MODULES.includes(item.projectModule)) return item.projectModule;
    return inferModule(item.projectPlan);
  }

  function inferModule(text) {
    const value = text || "";
    if (/光罩|黄光|显影|对准|Runcard|runcard|Pad|recess/.test(value)) return "光罩";
    if (/量测|Id|Vg|Vd|CV|TLM|曲线|指标/.test(value)) return "量测";
    if (/TCAD|AI-TCAD|baseline|run list|收敛/.test(value)) return "TCAD";
    return "制程";
  }

  function setModuleSelected(date, module) {
    if (!state.modulePlans[date]) state.modulePlans[date] = { selected: module };
    state.modulePlans[date].selected = module;
    saveState();
  }

  function setProjectItemSelected(date, itemId) {
    const item = getProjectItemById(itemId);
    if (!item) return;
    const row = mainByDate.get(date);
    if (row) row.projectModule = item.module;
    if (!state.modulePlans[date]) state.modulePlans[date] = {};
    state.modulePlans[date].itemId = itemId;
    state.modulePlans[date].selected = item.module;
    persistPlanRows();
    saveState();
  }

  function projectSummaryText(plan, date) {
    if (!plan?.projectType) return "";
    if (normalizedProjectType(plan) === "实验专案" || normalizedProjectType(plan) === "学务") {
      const item = getSelectedProjectItem(plan);
      const progress = projectItemProgressForDate(date, item.id);
      return `${item.name}${progress ? ` ${progress}` : ""}`;
    }
    return normalizedProjectType(plan);
  }

  function projectItemProgressForDate(date, itemId) {
    const item = getProjectItemById(itemId);
    if (!item) return "";
    const total = Number(item.days);
    if (!total) return "";
    const expectedType = ACADEMIC_MODULES.includes(item.module) ? "学务" : "实验专案";
    const projectDates = mainPlan
      .filter((row) => normalizedProjectType(row) === expectedType && getSelectedProjectItem(row).id === itemId)
      .map((row) => row.date)
      .sort();
    const index = projectDates.indexOf(date);
    if (index < 0) return "";
    return `${index + 1}/${total}天`;
  }

  function getProjectItemOptions(preferredModule, modules = EXPERIMENT_MODULES) {
    const preferred = modules.includes(preferredModule) ? preferredModule : "";
    const orderedModules = preferred
      ? [preferred, ...modules.filter((module) => module !== preferred)]
      : modules;
    return orderedModules.flatMap((module) => getModuleItemsWithDefault(module));
  }

  function projectItemOptionsMarkup(preferredModule, selectedId, date, modules = EXPERIMENT_MODULES) {
    const preferred = modules.includes(preferredModule) ? preferredModule : "";
    const orderedModules = preferred
      ? [preferred, ...modules.filter((module) => module !== preferred)]
      : modules;
    return orderedModules
      .map((module) => {
        const options = getModuleItemsWithDefault(module)
          .map((option) => {
            const selected = option.id === selectedId ? " selected" : "";
            const progress = projectItemProgressForDate(date, option.id);
            const suffix = progress || (option.days ? `预计${option.days}天` : "");
            const display = `${option.name}${suffix ? ` · ${suffix}` : ""}`;
            const progressLabel = `${option.name}${progress ? ` ${progress}` : ""}`;
            return `<option value="${safeAttr(option.id)}" data-progress="${safeAttr(progressLabel)}"${selected}>${safe(display)}</option>`;
          })
          .join("");
        return `<optgroup label="${safeAttr(module)}">${options}</optgroup>`;
      })
      .join("");
  }

  function getSelectedProjectItem(row) {
    const modules = modulesForProjectType(normalizedProjectType(row));
    const stored = state.modulePlans[row.date]?.itemId;
    const storedItem = getProjectItemById(stored);
    if (storedItem && modules.includes(storedItem.module)) return storedItem;
    const module = modules.includes(row.projectModule) ? row.projectModule : modules[0];
    return getModuleItemsWithDefault(module)[0];
  }

  function modulesForProjectType(type) {
    if (type === "学务") return ACADEMIC_MODULES;
    if (type === "实验专案") return EXPERIMENT_MODULES;
    return EXPERIMENT_MODULES;
  }

  function getModuleItems(module) {
    return state.moduleCatalog?.[module] || [];
  }

  function getModuleItemsWithDefault(module) {
    const items = getModuleItems(module);
    if (items.length) return items;
    return [{ id: `default:${module}`, module, name: module, days: "" }];
  }

  function getProjectItemById(itemId) {
    if (!itemId) return null;
    if (itemId.startsWith("default:")) {
      const module = itemId.slice("default:".length);
      if (ALL_PLAN_MODULES.includes(module)) return { id: itemId, module, name: module, days: "" };
    }
    return ALL_PLAN_MODULES.flatMap((module) => getModuleItems(module)).find((item) => item.id === itemId) || null;
  }

  function addModuleItem(module, name, days) {
    if (!ALL_PLAN_MODULES.includes(module)) return;
    if (!state.moduleCatalog) state.moduleCatalog = {};
    if (!state.moduleCatalog[module]) state.moduleCatalog[module] = [];
    const cleanName = name || `${module}${state.moduleCatalog[module].length + 1}`;
    state.moduleCatalog[module].push({
      id: `${module}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      module,
      name: cleanName,
      days: days || "",
    });
    saveState();
  }

  function updateModuleItem(itemId, patch) {
    const item = getProjectItemById(itemId);
    if (!item || itemId.startsWith("default:")) return;
    Object.assign(item, patch);
    saveState();
  }

  function deleteModuleItem(itemId) {
    const item = getProjectItemById(itemId);
    if (!item || itemId.startsWith("default:") || item.locked) return;
    state.moduleCatalog[item.module] = getModuleItems(item.module).filter((candidate) => candidate.id !== itemId);
    Object.values(state.modulePlans || {}).forEach((plan) => {
      if (plan.itemId === itemId) delete plan.itemId;
    });
    saveState();
  }

  function extendPlan(days) {
    const additions = [];
    let cursor = mainPlan.at(-1)?.date || isoToday();
    for (let index = 0; index < days; index += 1) {
      cursor = addDays(cursor, 1);
      additions.push({
        id: `extra-${cursor}`,
        date: cursor,
        weekday: weekdayZh(cursor),
        dayType: "延伸",
        ieltsPriority: "自订",
        ieltsPlan: "IELTS每日提醒",
        ieltsModule: "自由安排",
        cambridge: "",
        projectType: "实验专案",
        projectPlan: "",
        projectModule: "制程",
        limits: "延伸日程，可自行调整",
        status: "未开始",
        actual: "",
      });
    }
    state.extraPlanRows = [...(state.extraPlanRows || []), ...additions];
    mainPlan = [...mainPlan, ...additions];
    persistPlanRows();
    rebuildPlanIndexes();
    saveState();
  }

  function rebuildPlanIndexes() {
    mainByDate = new Map(mainPlan.map((item) => [item.date, item]));
    el.dateRangeLabel.textContent = `${formatDate(mainPlan[0]?.date)} - ${formatDate(mainPlan.at(-1)?.date)}`;
    el.planRangeTitle.textContent = `${formatDate(mainPlan[0]?.date)} - ${formatDate(mainPlan.at(-1)?.date)}`;
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return normalizeState(parsed);
    } catch {
      return normalizeState({});
    }
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    scheduleCloudSave();
  }

  function normalizeState(parsed) {
    const normalized = {
      schedule: parsed.schedule || {},
      planOverrides: parsed.planOverrides || {},
      modulePlans: parsed.modulePlans || {},
      moduleTotals: parsed.moduleTotals || {},
      moduleCatalog: parsed.moduleCatalog || {},
      savedSlots: parsed.savedSlots || {},
      extraPlanRows: parsed.extraPlanRows || [],
      planRows: parsed.planRows || [],
      planVersion: parsed.planVersion || "",
    };
    ensureAcademicCatalog(normalized);
    return migratePlanState(normalized);
  }

  function ensureAcademicCatalog(candidate) {
    if (!candidate.moduleCatalog) candidate.moduleCatalog = {};
    ACADEMIC_MODULES.forEach((module) => {
      if (!candidate.moduleCatalog[module]?.length) {
        candidate.moduleCatalog[module] = [{
          id: `default-academic:${module}`,
          module,
          name: module,
          days: "",
          locked: true,
        }];
      }
    });
  }

  function migratePlanState(candidate) {
    const planVersion = data.planVersion || "";
    if (!planVersion || candidate.planVersion === planVersion) return candidate;
    const resetFromDate = data.resetFromDate || "2026-06-02";
    candidate.planRows = JSON.parse(JSON.stringify(data.mainPlan || []));
    candidate.extraPlanRows = [];
    candidate.modulePlans = {};
    candidate.moduleCatalog = {};
    candidate.moduleTotals = {};
    candidate.savedSlots = {};
    ensureAcademicCatalog(candidate);
    Object.keys(candidate.schedule || {}).forEach((date) => {
      if (date >= resetFromDate) delete candidate.schedule[date];
    });
    Object.keys(candidate.planOverrides || {}).forEach((date) => {
      if (date >= resetFromDate) delete candidate.planOverrides[date];
    });
    candidate.planVersion = planVersion;
    return candidate;
  }

  function resolveApiBase() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("api");
    if (fromUrl) {
      const cleaned = fromUrl.replace(/\/$/, "");
      localStorage.setItem(API_BASE_KEY, cleaned);
      return cleaned;
    }
    return (window.IELTS_API_BASE || localStorage.getItem(API_BASE_KEY) || "").replace(/\/$/, "");
  }

  async function loginRemote(password) {
    const response = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error("cloud-login-failed");
    const result = await response.json();
    authToken = result.token || "";
    if (!authToken) throw new Error("cloud-token-missing");
    localStorage.setItem(TOKEN_KEY, authToken);
    const remoteState = await fetchRemoteState();
    if (hasUsefulState(remoteState)) {
      applyRemoteState(remoteState);
    } else {
      await pushRemoteState();
    }
  }

  async function refreshCloudState() {
    try {
      const remoteState = await fetchRemoteState();
      if (hasUsefulState(remoteState)) {
        applyRemoteState(remoteState);
        showSaved("Cloud sync updated");
      }
    } catch (error) {
      console.warn("Cloud refresh failed.", error);
    }
  }

  async function fetchRemoteState() {
    if (!authToken) return null;
    const response = await fetch(`${API_BASE}/api/state`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!response.ok) throw new Error("cloud-state-fetch-failed");
    const result = await response.json();
    return result.state || {};
  }

  function applyRemoteState(remoteState) {
    const incomingVersion = remoteState?.planVersion || "";
    applyingRemoteState = true;
    state = normalizeState(remoteState || {});
    mainPlan = state.planRows?.length ? state.planRows : [...(data.mainPlan || []), ...(state.extraPlanRows || [])];
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    rebuildPlanIndexes();
    if (!mainByDate.has(selectedDate)) {
      selectedDate = mainPlan[0]?.date || isoToday();
      visibleMonth = selectedDate.slice(0, 7);
    }
    renderAll();
    applyingRemoteState = false;
    if (authToken && state.planVersion && state.planVersion !== incomingVersion) {
      pushRemoteState().catch((error) => console.warn("Cloud migration save failed.", error));
    }
  }

  function hasUsefulState(candidate) {
    if (!candidate) return false;
    return Boolean(
      candidate.planRows?.length ||
        candidate.extraPlanRows?.length ||
        Object.keys(candidate.schedule || {}).length ||
        Object.keys(candidate.moduleCatalog || {}).length
    );
  }

  function scheduleCloudSave() {
    if (!authToken || applyingRemoteState) return;
    window.clearTimeout(cloudSaveTimer);
    cloudSaveTimer = window.setTimeout(() => {
      pushRemoteState().catch((error) => {
        console.warn("Cloud save failed.", error);
        if (el.saveStatus) el.saveStatus.textContent = "Cloud save failed; local cache kept.";
      });
    }, 450);
  }

  async function pushRemoteState() {
    if (!authToken) return;
    const response = await fetch(`${API_BASE}/api/state`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state }),
    });
    if (!response.ok) throw new Error("cloud-state-save-failed");
  }

  function showSaved(message) {
    el.saveStatus.textContent = message;
    window.clearTimeout(showSaved.timer);
    showSaved.timer = window.setTimeout(() => {
      el.saveStatus.textContent = "";
    }, 1400);
  }

  function tagForDay(dayType) {
    const type = dayType === "休息" ? "休息" : "正常";
    let cls = "";
    if (type.includes("休息")) cls = "rest";
    return `<span class="tag ${cls}">${safe(type)}</span>`;
  }

  function isRestText(text) {
    return `${text || ""}`.includes("休息") || `${text || ""}`.includes("考试周") || `${text || ""}`.includes("端午");
  }

  function isNoIeltsDay(plan) {
    if (!plan) return false;
    if (`${plan.ieltsPlan || ""}`.includes("端午听力")) return false;
    return isRestDay(plan) || /不排雅思|暂停/.test(`${plan.ieltsPlan} ${plan.ieltsModule}`);
  }

  function normalizedDayType(row) {
    return isRestDay(row) ? "休息" : "正常";
  }

  function normalizedProjectType(row) {
    if (!row?.date) return "";
    if (isRestDay(row)) return "休息";
    if (row.projectType === "学务") return "学务";
    if (row.projectType === "实验专案") return "实验专案";
    return "";
  }

  function isRestDay(row) {
    if (!row) return false;
    return /休息|端午/.test(`${row.dayType || ""} ${row.projectType || ""} ${row.ieltsPlan || ""}`);
  }

  function trimLabel(text) {
    const value = `${text || ""}`;
    return value.length > 24 ? `${value.slice(0, 24)}...` : value;
  }

  function monthLabel(monthValue) {
    const [year, month] = monthValue.split("-");
    return `${year} 年 ${Number(month)} 月`;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [year, month, day] = iso.split("-");
    return `${year}/${month}/${day}`;
  }

  function addMonths(monthValue, delta) {
    const [year, month] = monthValue.split("-").map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function addDays(iso, days) {
    const date = new Date(`${iso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function weekdayZh(iso) {
    const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return names[new Date(`${iso}T00:00:00Z`).getUTCDay()];
  }

  function isoToday() {
    return toIso(new Date());
  }

  function toIso(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function safe(value) {
    return `${value ?? ""}`
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeAttr(value) {
    return safe(value).replace(/`/g, "&#096;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return CSS.escape(value);
    return `${value}`.replace(/"/g, '\\"');
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }
})();
