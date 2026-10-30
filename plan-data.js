(function () {
  const startDate = "2026-11-01";
  const routineStartDate = "2026-10-27";
  // 只重排 11/1 起的内容，10/31 及以前的完成记录继续保留。
  const resetFromDate = startDate;
  // 11/10–11/14 人在日本：雅思与实验都停。
  const travelPeriod = { startDate: "2026-11-10", endDate: "2026-11-14", label: "日本行程" };
  // 周日1 周一2 周二1 周三1 周四1 周五2 周六1 ＝ 每周 9 份。
  // 每天至少 1 份、最多 2 份；只有周一与周五排 2 份，强度最平均。
  // 全程每天 1 份排不完：扣掉日本五天会排到 12/23，比 12/19 考试还晚。
  const weeklyPaperCounts = [1, 2, 1, 1, 1, 2, 1];
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
  // Raith / EBeam 阶段仍从 10/27 起算；11/1 重排时前五天已经计入。
  let activeDays = 5;
  for (let date = startDate; nextTest < testBank.length; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const traveling = date >= travelPeriod.startDate && date <= travelPeriod.endDate;
    const count = traveling ? 0 : dailyPaperCounts[date] ?? weeklyPaperCounts[weekday];
    const row = {
      id: `auto-${date}`, date,
      weekday: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][weekday],
      dayType: traveling ? "旅行" : "正常",
      ieltsPriority: count ? "固定" : "暂停",
      ieltsPlan: count ? "" : travelPeriod.label,
      ieltsModule: count ? "" : "不排雅思真题",
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
        row.projectPlan = placed >= 3
          ? `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；当日 IELTS 06:00／11:00／18:00，实验仅保留必要记录与准备`
          : placed >= 2
            ? `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；当日 IELTS 08:00／18:00，实验安排在中间空档`
            : `${row.projectPhase}${row.projectWeek ? ` · 第${row.projectWeek}周` : ""}；白天预留，18:00 开始 IELTS`;
      } else if (weekday === 3) {
        row.projectType = "学务";
        row.projectModule = "书报课程";
        row.projectPlan = "上午07:00完成1份 IELTS；中午坐车回中央；书报讨论；晚上返回";
      }
    }

    // 题库见底时实际份数可能少于周规则；时段要按实际份数决定，
    // 否则最后一天只剩 1 套也会被当成「两份日的上午场」排到 08:00。
    for (let index = 0; index < placed; index += 1) {
      const paper = testBank[nextTest++];
      // 周三在出发前完成，其余日子固定晚上训练。
      const morningHour = weekday === 3 ? 7 : 8;
      const preferredHour = placed >= 2 ? (index === 0 ? morningHour : 18) : weekday === 3 ? 7 : 18;
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
      : count >= 2
        ? "当日2份：上午1份、晚上1份；每套独立整理；当日 IELTS 预留8小时"
        : weekday === 3
          ? "周三上午出发前1份 IELTS；预留4小时"
          : "当日1份 IELTS；预留4小时";
    if (nextTest === testBank.length) row.limits = `完成C21T4；当日IELTS预留${row.trainingItems.length * 4}小时，之后不再排新真题`;
    mainPlan.push(row);
  }

  window.IELTS_PLANNER_DATA = {
    generatedAt: "2026-10-30T00:00:00.000+08:00",
    source: "11/1起顺排剩余51套（C9T1已做，不再排）；每个非旅行日至少1份、最多2份，只有周一与周五排2份（每周9份）；日本行程 11/10-11/14 不排雅思与实验；周三上午07:00出发前完成，其余日子18:00；Raith与EBeam Fin沿用原日期。",
    mainPlan, dailyTemplates: [], projectCatalog,
    autoPlan: { startDate, routineStartDate, endDate: mainPlan.at(-1).date, examDate: "2026-12-19", travelPeriod, weeklyPaperCounts, dailyPaperCounts, minDailyPapers: 1, maxDailyPapers: 2 },
    researchPhases: [
      { name: "Raith 学习", startDate: routineStartDate, endDate: "2026-11-02", activeDays: 7 },
      { name: "EBeam Fin 实验", startDate: "2026-11-03", endDate: "2026-11-28", activeDays: 21 },
    ],
    testBank: {
      range: "Cambridge 9–21", perBook: 4, total: testBank.length,
      excludedCodes, scheduled: nextTest, scheduledSlots: nextTest,
      scheduledCodes: testBank.map((item) => item.code), remainingCodes: [], retakeCodes: [],
    },
    planVersion: "2026-11-01-min1-max2-v38",
    resetFromDate,
  };
})();
