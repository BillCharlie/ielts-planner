(function () {
  const startDate = "2026-11-02";
  const routineStartDate = "2026-10-27";
  // 11/1 以前的记录保留；IELTS 从今天 11/2 整体重新开始。
  const resetFromDate = startDate;
  // 11/10–11/14 人在日本：雅思与实验都停。
  const travelPeriod = { startDate: "2026-11-10", endDate: "2026-11-14", label: "日本行程" };
  // 周日1 周一2 周二1 周三1 周四1 周五2 周六1 ＝ 每周 9 份。
  // 每天至少 1 份、最多 2 份；只有周一与周五排 2 份，强度最平均。
  // 全程每天 1 份排不完：扣掉日本五天会排到 12/23，比 12/19 考试还晚。
  const weeklyPaperCounts = [1, 2, 1, 1, 1, 2, 1];
  const dailyPaperCounts = {
    "2026-11-02": 1,
    "2026-11-03": 1,
    "2026-11-04": 2,
    "2026-11-05": 0,
    "2026-11-06": 0,
    "2026-11-07": 2,
    "2026-11-08": 2,
    "2026-11-09": 2,
    "2026-11-14": 0,
    "2026-11-15": 1,
    "2026-11-16": 1,
    "2026-11-17": 1,
    "2026-11-18": 0,
    "2026-11-19": 1,
    "2026-11-20": 1,
    "2026-11-28": 2,
  };
  const dailyPreferredHours = {
    "2026-11-15": [18],
    "2026-11-20": [8],
  };
  const dailyPreferredPeriods = {
    "2026-11-28": ["下午", "晚上"],
  };
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
  // Raith / EBeam 阶段仍从 10/27 起算；11/2 重排时前六天已经计入。
  let activeDays = 6;
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
    generatedAt: "2026-11-02T00:00:00.000+08:00",
    source: "IELTS 从 11/2 整体重新开始，11/2只排一份；11/3一份，11/4两份，11/5–11/6休息，11/7–11/9每天两份，11/10–11/14日本行程暂停，11/15晚上一份，11/16–11/17每天一份，11/18休息，11/19一份，11/20上午一份，11/28下午与晚上各一份；其余日期沿用周一、周五两份，其他日一份。除明确指定的时段外，所有训练均标记为任意时段。",
    mainPlan, dailyTemplates: [], projectCatalog,
    autoPlan: { startDate, routineStartDate, endDate: mainPlan.at(-1).date, examDate: "2026-12-19", travelPeriod, weeklyPaperCounts, dailyPaperCounts, dailyPreferredHours, dailyPreferredPeriods, minDailyPapers: 1, maxDailyPapers: 2 },
    researchPhases: [
      { name: "Raith 学习", startDate: routineStartDate, endDate: "2026-11-02", activeDays: 7 },
      { name: "EBeam Fin 实验", startDate: "2026-11-03", endDate: "2026-11-28", activeDays: 21 },
    ],
    testBank: {
      range: "Cambridge 9–21", perBook: 4, total: testBank.length,
      excludedCodes, scheduled: nextTest, scheduledSlots: nextTest,
      scheduledCodes: testBank.map((item) => item.code), remainingCodes: [], retakeCodes: [],
    },
    planVersion: "2026-11-28-afternoon-evening-v42",
    resetFromDate,
  };
})();
