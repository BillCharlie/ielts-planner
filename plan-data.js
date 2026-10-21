(function () {
  const startDate = "2026-10-21";
  // 清掉上一版 10/20 的排程与小时表，新的计划统一从 10/21 开始。
  const resetFromDate = "2026-10-20";
  // 11/10–11/14 人在日本：雅思与实验都停，之后顺延。
  const travelPeriod = { startDate: "2026-11-10", endDate: "2026-11-14", label: "日本行程" };
  // 周日3 周一3 周二1 周三0 周四1 周五2 周六1 ＝ 每周 11 篇。
  // 周三整天留给回中央书报讨论，完全不排雅思。
  const weeklyPaperCounts = [3, 3, 1, 0, 1, 2, 1];
  // 目前没有逐日覆写：全程单一周规则。
  const dailyPaperCounts = {};
  // 已经做过，不再排入。
  const excludedCodes = ["C9T1"];
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
  let activeDays = 0;
  for (let date = startDate; nextTest < testBank.length; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const traveling = date >= travelPeriod.startDate && date <= travelPeriod.endDate;
    const count = traveling ? 0 : dailyPaperCounts[date] ?? weeklyPaperCounts[weekday];
    const row = {
      id: `auto-${date}`, date,
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekday],
      dayType: traveling ? "旅行" : "正常",
      ieltsPriority: count ? "固定" : "暂停",
      ieltsPlan: count ? "" : traveling ? travelPeriod.label : "书报讨论日，不排雅思",
      ieltsModule: count ? "" : traveling ? "不排雅思真题" : "整天留给书报讨论",
      cambridge: "", trainingItems: [],
      projectType: "", projectPlan: "", projectModule: "",
      limits: "", status: "未开始", actual: "",
    };

    if (!traveling) {
      activeDays += 1;
      row.projectPhase = activeDays <= 7 ? "Raith 学习" : activeDays <= 28 ? "EBeam Fin 实验" : "实验预留";
      row.projectWeek = activeDays <= 7 ? 1 : activeDays <= 28 ? Math.ceil((activeDays - 7) / 7) : null;
      if ([1, 4, 6, 0].includes(weekday)) {
        row.projectType = "实验专案";
        row.projectModule = "制程";
        row.projectItemId = activeDays <= 7 ? "routine-raith" : activeDays <= 28 ? "routine-ebeam-fin" : "routine-experiment";
        row.projectPlan = count >= 3
          ? `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；当日 IELTS 06:00／11:00／18:00，实验仅保留必要记录与准备`
          : `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；白天预留，18:00 开始 IELTS`;
      } else if (weekday === 3) {
        row.projectType = "学务";
        row.projectModule = "书报课程";
        row.projectPlan = "中午坐车回中央；书报讨论；晚上返回。整天不排雅思";
      }
    }

    // 题库见底时实际份数可能少于周规则；时段要按实际份数决定，
    // 否则最后一天只剩 1 套也会被当成「两份日的上午场」排到 08:00。
    const placed = Math.min(count, testBank.length - nextTest);
    for (let index = 0; index < placed; index += 1) {
      const paper = testBank[nextTest++];
      // 三份日拆成 06:00／11:00／18:00；两份日维持上午＋晚上。
      const morningHour = weekday === 3 ? 7 : 8;
      const preferredHour = placed >= 3 ? [6, 11, 18][index] : placed >= 2 ? (index === 0 ? morningHour : 18) : weekday === 3 ? 7 : 18;
      const timeLabel = `${String(preferredHour).padStart(2, "0")}:00–${preferredHour + 4}:00`;
      const periodLabel = preferredHour < 8 ? "清晨" : preferredHour < 12 ? "上午" : preferredHour < 17 ? "下午" : "晚上";
      row.trainingItems.push({
        id: `full-${date}-${paper.code}`, order: index + 1, kind: "full",
        label: `完整真题 · ${periodLabel}`,
        title: paper.title, cambridge: paper.code, full: paper.title,
        module: `${timeLabel}｜听力40分钟 + 阅读60分钟 + 写作60分钟 + 口语15分钟 + 整理60分钟`,
        duration: "3小时55分钟（预留4小时）",
        detail: "完整计时175分钟，完成后独立留1小时整理；剩余5分钟缓冲",
        preferredHour, blockHours: 4, durationMinutes: 235, status: "未开始",
      });
    }
    if (row.trainingItems.length) {
      row.ieltsPlan = row.trainingItems.map((item) => `${item.label} ${item.cambridge}`).join("；");
      row.ieltsModule = `每套听读写说175分钟 + 整理60分钟；当日 IELTS 总时间：${row.trainingItems.length * 235}分钟，预留${row.trainingItems.length * 4}小时`;
      row.cambridge = row.trainingItems.map((item) => item.cambridge).join(" + ");
    }
    row.limits = traveling
      ? `${travelPeriod.label}：不排雅思与实验`
      : count >= 3
        ? "当日3份：06:00、11:00、18:00各1份；每套独立整理；当日 IELTS 预留12小时"
        : count >= 2
        ? weekday === 3
          ? "周三2份：上午出发前1份，晚上返回后1份；每套独立整理；当日 IELTS 预留8小时"
          : "当日2份：上午1份、晚上1份；每套独立整理；当日 IELTS 预留8小时"
        : count === 0 ? "周三：中午坐车回中央书报讨论，整天不排雅思"
          : [1, 4, 6, 0].includes(weekday) ? "周一／四／六／日：白天实验，晚上1份 IELTS；当日 IELTS 预留4小时"
            : "当日1份 IELTS；预留4小时";
    if (nextTest === testBank.length) row.limits = `完成C21T4；当日IELTS预留${row.trainingItems.length * 4}小时，之后不再排新真题`;
    mainPlan.push(row);
  }

  window.IELTS_PLANNER_DATA = {
    generatedAt: "2026-10-21T00:00:00.000+08:00",
    source: "10/21起顺排剩余51套（C9T1已做，不再排）；考试日 12/19；全程单一周规则：周日与周一各3份、周五2份、周二四六各1份、周三完全不排，每周11份；日本行程 11/10-11/14 不排，之后顺延；三份日排06:00／11:00／18:00；Raith一周后EBeam Fin三周，旅行暂停顺延。",
    mainPlan, dailyTemplates: [], projectCatalog,
    autoPlan: { startDate, routineStartDate: startDate, endDate: mainPlan.at(-1).date, examDate: "2026-12-19", travelPeriod, weeklyPaperCounts, dailyPaperCounts },
    researchPhases: [
      { name: "Raith 学习", startDate, endDate: "2026-10-27", activeDays: 7 },
      { name: "EBeam Fin 实验", startDate: "2026-10-28", endDate: "2026-11-22", activeDays: 21 },
    ],
    testBank: {
      range: "Cambridge 9–21", perBook: 4, total: testBank.length,
      excludedCodes, scheduled: nextTest, scheduledSlots: nextTest,
      scheduledCodes: testBank.map((item) => item.code), remainingCodes: [], retakeCodes: [],
    },
    planVersion: "2026-10-21-advisor-reset-v31",
    resetFromDate,
  };
})();
