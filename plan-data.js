(function () {
  const startDate = "2026-09-07";
  const travelPeriod = { startDate: "2026-09-23", endDate: "2026-10-02" };
  const weeklyPaperCounts = [1, 1, 2, 1, 1, 2, 1];
  const projectCatalog = [
    { id: "routine-raith", module: "制程", name: "Raith 学习（1周）", days: "" },
    { id: "routine-ebeam-fin", module: "制程", name: "EBeam Fin 实验（3周，旅行顺延）", days: "" },
    { id: "routine-experiment", module: "制程", name: "实验预留", days: "" },
  ];
  const testBank = [];
  for (let book = 9; book <= 21; book += 1) {
    for (let test = 1; test <= 4; test += 1) {
      testBank.push({ code: `C${book}T${test}`, title: `Cambridge ${book} Test ${test}` });
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
    const count = traveling ? (date === "2026-09-24" ? 1 : 0) : weeklyPaperCounts[weekday];
    const row = {
      id: `auto-${date}`, date,
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekday],
      dayType: traveling ? "旅行" : "正常",
      ieltsPriority: count ? "固定" : "暂停",
      ieltsPlan: count ? "" : "中秋旅行",
      ieltsModule: count ? "" : "不排雅思真题",
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
        row.projectPlan = `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；白天预留，18:00 开始 IELTS`;
      } else if (weekday === 3) {
        row.projectType = "学务";
        row.projectModule = "书报课程";
        row.projectPlan = "中午坐车回中央；书报讨论；晚上返回。上午 07:00–11:00 IELTS（含整理）";
      }
    }

    for (let index = 0; index < count && nextTest < testBank.length; index += 1) {
      const paper = testBank[nextTest++];
      const preferredHour = weekday === 3 ? 7 : ([2, 5].includes(weekday) && index === 0) || traveling ? 8 : 18;
      const timeLabel = `${String(preferredHour).padStart(2, "0")}:00–${preferredHour + 4}:00`;
      row.trainingItems.push({
        id: `full-${date}-${paper.code}`, order: index + 1, kind: "full",
        label: `完整真题 · ${preferredHour < 12 ? "上午" : "晚上"}`,
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
      ? date === "2026-09-24" ? "旅行例外：上午1份 IELTS，预留4小时；不排实验" : "旅行期间不排雅思与实验"
      : weekday === 3 ? "周三仅上午1份；中午出发前完成训练与整理"
        : [2, 5].includes(weekday) ? "周二／五早晚各1份；每套独立整理；当日 IELTS 预留8小时"
          : "周一／四／六／日：白天实验，晚上1份 IELTS；当日 IELTS 预留4小时";
    if (nextTest === testBank.length) row.limits = `完成C21T4；当日IELTS预留${row.trainingItems.length * 4}小时，之后不再排新真题`;
    mainPlan.push(row);
  }

  window.IELTS_PLANNER_DATA = {
    generatedAt: "2026-09-07T00:00:00.000+08:00",
    source: "9/7起顺排C9T1至C21T4；周二五早晚各1份，周三上午1份，周一四六日实验晚上1份；保留中秋旅行及9/24例外；Raith一周后EBeam Fin三周，旅行暂停顺延。",
    mainPlan, dailyTemplates: [], projectCatalog,
    autoPlan: { startDate, routineStartDate: startDate, endDate: mainPlan.at(-1).date, examDate: "2026-11-06", travelPeriod, weeklyPaperCounts },
    researchPhases: [
      { name: "Raith 学习", startDate, endDate: "2026-09-13", activeDays: 7 },
      { name: "EBeam Fin 实验", startDate: "2026-09-14", endDate: "2026-10-14", activeDays: 21 },
    ],
    testBank: {
      range: "Cambridge 9–21", perBook: 4, total: testBank.length,
      excludedCodes: [], scheduled: nextTest, scheduledSlots: nextTest,
      scheduledCodes: testBank.map((item) => item.code), remainingCodes: [], retakeCodes: [],
    },
    planVersion: "2026-09-07-c9t1-c21t4-routine-v16",
    resetFromDate: startDate,
  };
})();
