(function () {
  const startDate = "2026-11-28";
  const routineStartDate = "2026-10-27";
  // 11/27 以前的记录保留；IELTS 从 11/28 按当前进度重新开始。
  const resetFromDate = startDate;
  // 11/10–11/14 人在日本：雅思与实验都停。
  const travelPeriod = { startDate: "2026-11-10", endDate: "2026-11-14", label: "日本行程" };
  // 从 11/28 起每天固定 1 份，全部标为任意时段。
  const weeklyPaperCounts = [1, 1, 1, 1, 1, 1, 1];
  const dailyPaperCounts = {};
  const dailyPreferredHours = {};
  const dailyPreferredPeriods = {};
  // 11/27 以前已经排过的 C9-C13 保留历史，不再重复排入新队列。
  const excludedCodes = [];
  for (let book = 9; book <= 13; book += 1) {
    for (let test = 1; test <= 4; test += 1) excludedCodes.push(`C${book}T${test}`);
  }
  const projectCatalog = [
    { id: "routine-raith", module: "制程", name: "Raith 学习（1周）", days: "" },
    { id: "routine-ebeam-fin", module: "制程", name: "EBeam Fin 实验（3周，旅行顺延）", days: "" },
    { id: "routine-experiment", module: "制程", name: "实验预留", days: "" },
  ];
  const testBank = [];
  for (let book = 9; book <= 21; book += 1) {
    for (let test = 1; test <= 4; test += 1) {
      const code = `C${book}T${test}`;
      if (excludedCodes.includes(code)) continue;
      testBank.push({ code, title: `Cambridge ${book} Test ${test}` });
    }
  }

  function addDays(iso, days) {
    const date = new Date(`${iso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  const mainPlan = [];
  let nextTest = 0;
  // Raith / EBeam 阶段仍从 10/27 起算；11/28 重排前已有 27 个非旅行日计入。
  let activeDays = 27;
  for (let date = startDate; nextTest < testBank.length; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const traveling = date >= travelPeriod.startDate && date <= travelPeriod.endDate;
    const count = traveling ? 0 : dailyPaperCounts[date] ?? weeklyPaperCounts[weekday];
    const row = {
      id: `auto-${date}`, date,
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekday],
      dayType: traveling ? "旅行" : "正常",
      ieltsPriority: count ? "固定" : "暂停",
      ieltsPlan: count ? "" : traveling ? travelPeriod.label : "当日不排 IELTS",
      ieltsModule: count ? "" : traveling ? "不排雅思真题" : "休息／其他事务",
      cambridge: "", trainingItems: [],
      projectType: "", projectPlan: "", projectModule: "",
      limits: "", status: "未开始", actual: "",
    };
    // 题库见底时，最后一天的实际份数可能少于该星期的标准份数。
    const placed = Math.min(count, testBank.length - nextTest);

    if (!traveling) {
      activeDays += 1;
      row.projectPhase = activeDays <= 7 ? "Raith 学习" : activeDays <= 28 ? "EBeam Fin 实验" : "实验预留";
      row.projectWeek = activeDays <= 7 ? 1 : activeDays <= 28 ? Math.ceil((activeDays - 7) / 7) : null;
      if ([1, 4, 6, 0].includes(weekday)) {
        row.projectType = "实验专案";
        row.projectModule = "制程";
        row.projectItemId = activeDays <= 7 ? "routine-raith" : activeDays <= 28 ? "routine-ebeam-fin" : "routine-experiment";
        const periodPlan = dailyPreferredPeriods[date]?.length
          ? dailyPreferredPeriods[date].join("、")
          : "任意时段";
        row.projectPlan = placed >= 2
            ? `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；当日 IELTS 2份（${periodPlan}），实验按进度安排`
            : placed === 1
              ? `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；${Number.isInteger(dailyPreferredHours[date]?.[0]) ? `${String(dailyPreferredHours[date][0]).padStart(2, "0")}:00 开始 IELTS` : "IELTS 1份（任意时段）"}`
              : `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；当日不排 IELTS`;
      } else if (weekday === 3) {
        row.projectType = "学务";
        row.projectModule = "书报课程";
        row.projectPlan = placed >= 2
          ? "IELTS 2份（任意时段）；中午坐车回中央；书报讨论；晚上返回"
          : placed === 1
            ? "IELTS 1份（任意时段）；中午坐车回中央；书报讨论；晚上返回"
            : "中午坐车回中央；书报讨论；晚上返回；当日不排 IELTS";
      }
    }

    // 题库见底时实际份数可能少于周规则；时段要按实际份数决定，
    // 否则最后一天只剩 1 套也会被当成「两份日的上午场」排到 08:00。
    for (let index = 0; index < placed; index += 1) {
      const paper = testBank[nextTest++];
      // 只有用户明确指定的日期才带具体小时；其余训练均保持任意时段。
      const preferredHour = Number.isInteger(dailyPreferredHours[date]?.[index])
        ? dailyPreferredHours[date][index]
        : null;
      const preferredPeriod = dailyPreferredPeriods[date]?.[index] || "";
      const timeLabel = Number.isInteger(preferredHour)
        ? `${String(preferredHour).padStart(2, "0")}:00–${preferredHour + 4}:00`
        : preferredPeriod || "任意时段";
      const periodLabel = Number.isInteger(preferredHour)
        ? preferredHour < 12 ? "上午" : preferredHour < 17 ? "下午" : "晚上"
        : preferredPeriod || "任意时段";
      row.trainingItems.push({
        id: `full-${date}-${paper.code}`, order: index + 1, kind: "full",
        label: `完整真题 · ${periodLabel}`,
        title: paper.title, cambridge: paper.code, full: paper.title,
        module: `${timeLabel}｜听力40分钟 + 阅读60分钟 + 写作60分钟 + 口语15分钟 + 整理60分钟`,
        duration: "3小时55分钟（预留4小时）",
        detail: "完整计时175分钟，完成后独立留1小时整理；剩余5分钟缓冲",
        preferredHour, preferredPeriod, blockHours: 4, durationMinutes: 235, status: "未开始",
      });
    }
    if (row.trainingItems.length) {
      row.ieltsPlan = row.trainingItems.map((item) => `${item.label} ${item.cambridge}`).join("；");
      row.ieltsModule = `每套听读写说175分钟 + 整理60分钟；当日 IELTS 总时间：${row.trainingItems.length * 235}分钟，预留${row.trainingItems.length * 4}小时`;
      row.cambridge = row.trainingItems.map((item) => item.cambridge).join(" + ");
    }
    row.limits = traveling
      ? `${travelPeriod.label}：不排雅思与实验`
      : count === 0
        ? "当日不排 IELTS"
        : count >= 2
        ? dailyPreferredPeriods[date]?.length
          ? `当日2份：${dailyPreferredPeriods[date].join("、")}各1份；每套独立整理；当日 IELTS 预留8小时`
          : "当日2份：均为任意时段；每套独立整理；当日 IELTS 预留8小时"
        : dailyPreferredHours[date]?.[0] < 12
          ? "当日上午1份 IELTS；预留4小时"
          : Number.isInteger(dailyPreferredHours[date]?.[0])
            ? "当日晚上1份 IELTS；预留4小时"
            : "当日任意时段1份 IELTS；预留4小时";
    if (nextTest === testBank.length) row.limits = `完成C21T4；当日IELTS预留${row.trainingItems.length * 4}小时，之后不再排新真题`;
    mainPlan.push(row);
  }

  window.IELTS_PLANNER_DATA = {
    generatedAt: "2026-11-24T00:00:00.000+08:00",
    source: "IELTS 从 11/28 按现有进度重新开始，由 C14T1 连续排到 C21T4；每天固定一份，全部标记为任意时段，每份预留4小时。预计考试日调整为 2027/1/15。",
    mainPlan, dailyTemplates: [], projectCatalog,
    autoPlan: { startDate, routineStartDate, endDate: mainPlan.at(-1).date, examDate: "2027-01-15", travelPeriod, weeklyPaperCounts, dailyPaperCounts, dailyPreferredHours, dailyPreferredPeriods, minDailyPapers: 1, maxDailyPapers: 1 },
    researchPhases: [
      { name: "Raith 学习", startDate: routineStartDate, endDate: "2026-11-02", activeDays: 7 },
      { name: "EBeam Fin 实验", startDate: "2026-11-03", endDate: "2026-11-28", activeDays: 21 },
    ],
    testBank: {
      range: "Cambridge 14–21", perBook: 4, total: testBank.length,
      excludedCodes, scheduled: nextTest, scheduledSlots: nextTest,
      scheduledCodes: testBank.map((item) => item.code), remainingCodes: [], retakeCodes: [],
    },
    planVersion: "2026-11-28-daily-one-v45",
    resetFromDate,
  };
})();
