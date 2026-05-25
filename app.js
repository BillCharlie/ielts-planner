(function () {
  const PASSWORD = "Bill";
  const ACCESS_KEY = "ieltsPlannerAccessSaved";
  const STATE_KEY = "ieltsPlannerStateV1";
  const HOURS = Array.from({ length: 18 }, (_, index) => index + 6);
  const data = window.IELTS_PLANNER_DATA || { mainPlan: [], dailyTemplates: [] };
  const mainPlan = data.mainPlan || [];
  const dailyTemplates = data.dailyTemplates || [];
  const mainByDate = new Map(mainPlan.map((item) => [item.date, item]));
  const dailyByDate = new Map(dailyTemplates.map((item) => [item.date, item]));

  const state = loadState();
  let selectedDate = mainPlan[0]?.date || isoToday();
  let visibleMonth = selectedDate.slice(0, 7);
  let activeHour = 9;
  let deferredInstallPrompt = null;

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
      "reminderPanel",
      "summaryIelts",
      "summaryIeltsDetail",
      "summaryProjectType",
      "summaryProject",
      "summaryStatus",
      "summaryLimits",
      "taskPicker",
      "copyTaskButton",
      "saveStatus",
      "hourGrid",
      "planSearch",
      "planWarningStrip",
      "planTableBody",
    ].forEach((id) => {
      el[id] = document.getElementById(id);
    });
  }

  function bindAuth() {
    el.authForm.addEventListener("submit", (event) => {
      event.preventDefault();
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

    el.copyTaskButton.addEventListener("click", () => {
      const task = tasksForDate(selectedDate).find((item) => item.id === el.taskPicker.value);
      if (!task) return;
      setSlot(selectedDate, activeHour, { text: task.text, taskId: task.id });
      renderSelectedDay();
      renderCalendar();
      showSaved("已复制");
    });
  }

  function bindPlanControls() {
    el.planSearch.addEventListener("input", renderPlanTable);
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
    } else {
      el.authView.hidden = false;
      el.passwordInput.focus();
    }
  }

  function openApp() {
    el.authView.hidden = true;
    el.appView.hidden = false;
    el.dateRangeLabel.textContent = `${formatDate(mainPlan[0]?.date)} - ${formatDate(mainPlan.at(-1)?.date)}`;
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
      button.classList.toggle("outside", iso.slice(0, 7) !== visibleMonth);
      button.classList.toggle("selected", iso === selectedDate);
      button.classList.toggle("has-warning", missingTasksForDate(iso).length > 0);
      button.classList.toggle("has-done", scheduledTaskIds(iso).size > 0);
      const monthMeta = plan ? plan.cambridge || plan.ieltsPlan : "";
      button.innerHTML = `
        <span class="day-num">${current.getDate()}${missingTasksForDate(iso).length ? '<i class="warning-dot"></i>' : ""}</span>
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
    el.selectedDayType.innerHTML = `${formatDate(selectedDate)} ${tagForDay(plan.dayType || template.dayType || "")}`;
    el.selectedDateTitle.textContent = `${plan.weekday || template.weekday || ""} ${plan.ieltsPlan || template.mainTask || "自由计划"}`;
    el.summaryIelts.textContent = plan.ieltsPlan || "无";
    el.summaryIeltsDetail.textContent = [plan.ieltsModule, plan.cambridge].filter(Boolean).join(" / ");
    el.summaryProjectType.textContent = plan.projectType || "无";
    el.summaryProject.textContent = plan.projectPlan || template.notes || "今天没有制程/项目主任务。";
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
        setSlot(selectedDate, hour, { text: textarea.value, taskId: slot.taskId });
        renderCalendar();
        renderReminders();
        showSaved("已保存");
      });

      const select = document.createElement("select");
      select.className = "task-ref";
      select.innerHTML = `<option value="">无对应事项</option>${tasksForDate(selectedDate)
        .map((task) => `<option value="${safeAttr(task.id)}">${safe(task.label)}</option>`)
        .join("")}`;
      select.value = slot.taskId || "";
      select.addEventListener("change", () => {
        const task = tasksForDate(selectedDate).find((item) => item.id === select.value);
        setSlot(selectedDate, hour, {
          text: task && !textarea.value.trim() ? task.text : textarea.value,
          taskId: select.value,
        });
        renderSelectedDay();
        renderCalendar();
        showSaved("已保存");
      });

      row.append(time, textarea, select);
      el.hourGrid.appendChild(row);
    });
  }

  function renderHourActiveState() {
    document.querySelectorAll(".hour-row").forEach((row, index) => {
      row.classList.toggle("active", HOURS[index] === activeHour);
    });
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
      row.innerHTML = `
        <td><button class="date-button" type="button">${formatDate(item.date)}<br>${safe(item.weekday)}</button></td>
        <td>${tagForDay(item.dayType)}<br><span class="muted">${safe(item.ieltsPriority)}</span></td>
        <td><strong>${safe(item.ieltsPlan)}</strong><br><span class="muted">${safe(item.cambridge)}</span></td>
        <td>${safe(item.ieltsModule)}</td>
        <td><strong>${safe(item.projectType || "")}</strong><br>${safe(item.projectPlan || "")}</td>
        <td>
          <select class="status-select" data-date="${safeAttr(item.date)}">
            ${["未开始", "进行中", "已完成", "延期"].map((status) => `<option value="${status}">${status}</option>`).join("")}
          </select>
        </td>
        <td><textarea class="actual-input" data-date="${safeAttr(item.date)}" placeholder="备注">${safe(getPlanOverride(item.date, "actual") || item.actual || "")}</textarea></td>
      `;
      row.querySelector(".date-button").addEventListener("click", () => {
        selectedDate = item.date;
        visibleMonth = item.date.slice(0, 7);
        setView("calendar");
        renderCalendar();
        renderSelectedDay();
      });

      const statusSelect = row.querySelector(".status-select");
      statusSelect.value = getPlanOverride(item.date, "status") || item.status || "未开始";
      statusSelect.addEventListener("change", () => {
        setPlanOverride(item.date, "status", statusSelect.value);
        renderSelectedDay();
        showSaved("已保存");
      });

      const actualInput = row.querySelector(".actual-input");
      actualInput.addEventListener("input", () => {
        setPlanOverride(item.date, "actual", actualInput.value);
        showSaved("已保存");
      });

      el.planTableBody.appendChild(row);
    });

    const warningCount = mainPlan.reduce((count, item) => count + (missingTasksForDate(item.date).length ? 1 : 0), 0);
    el.planWarningStrip.textContent = warningCount
      ? `还有 ${warningCount} 天的主计划事项未排入小时表。`
      : "所有主计划事项都已经排入小时表。";
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
      [19, template.evening],
      [20, template.night],
      [21, template.night],
    ];
    mapping.forEach(([hour, text]) => {
      if (text) setSlot(date, hour, { text });
    });
  }

  function placeMainTasks(date) {
    const tasks = tasksForDate(date);
    const slots = [9, 14, 20];
    tasks.forEach((task, index) => {
      const hour = slots[index] || Math.min(23, 9 + index);
      setSlot(date, hour, { text: task.text, taskId: task.id });
    });
  }

  function tasksForDate(date) {
    const plan = mainByDate.get(date);
    const template = dailyByDate.get(date);
    const tasks = [];
    if (plan?.ieltsPlan && !isRestText(plan.ieltsPlan)) {
      tasks.push({
        id: `${date}:ielts`,
        label: `IELTS｜${plan.ieltsPlan}`,
        text: [plan.ieltsPlan, plan.ieltsModule, plan.cambridge].filter(Boolean).join(" - "),
        keywords: [plan.ieltsPlan, plan.cambridge].filter(Boolean),
      });
    }
    if (plan?.projectPlan && !isRestText(plan.projectType)) {
      tasks.push({
        id: `${date}:project`,
        label: `${plan.projectType || "项目"}｜${trimLabel(plan.projectPlan)}`,
        text: [plan.projectType, plan.projectPlan].filter(Boolean).join(" - "),
        keywords: [plan.projectType, plan.projectPlan].filter(Boolean),
      });
    }
    if (template?.mainTask && !isRestText(template.mainTask) && !tasks.some((task) => task.text.includes(template.mainTask))) {
      tasks.push({
        id: `${date}:daily`,
        label: `每日主任务｜${template.mainTask}`,
        text: [template.mainTask, template.notes].filter(Boolean).join(" - "),
        keywords: [template.mainTask].filter(Boolean),
      });
    }
    if (!tasks.length) {
      tasks.push({
        id: `${date}:free`,
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

  function dayScheduleText(date) {
    return Object.values(state.schedule[date] || {})
      .map((slot) => normalizeSlot(slot).text)
      .join("\n");
  }

  function setSlot(date, hour, patch) {
    if (!state.schedule[date]) state.schedule[date] = {};
    const previous = normalizeSlot(state.schedule[date][hour]);
    state.schedule[date][hour] = {
      text: patch.text ?? previous.text,
      taskId: patch.taskId ?? previous.taskId,
    };
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

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return {
        schedule: parsed.schedule || {},
        planOverrides: parsed.planOverrides || {},
      };
    } catch {
      return { schedule: {}, planOverrides: {} };
    }
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function showSaved(message) {
    el.saveStatus.textContent = message;
    window.clearTimeout(showSaved.timer);
    showSaved.timer = window.setTimeout(() => {
      el.saveStatus.textContent = "";
    }, 1400);
  }

  function tagForDay(dayType) {
    const type = dayType || "正常";
    let cls = "";
    if (type.includes("休息")) cls = "rest";
    if (type.includes("Meeting")) cls = "meeting";
    if (type.includes("考试")) cls = "exam";
    if (type.includes("端午")) cls = "travel";
    return `<span class="tag ${cls}">${safe(type)}</span>`;
  }

  function isRestText(text) {
    return !text || `${text}`.includes("休息") || `${text}`.includes("考试周") || `${text}`.includes("端午");
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

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }
})();
