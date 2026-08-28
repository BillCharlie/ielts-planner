(function () {
  const plan = {
    startDate: "2026-09-01",
    routineStartDate: "2026-09-07",
    examDate: "2026-11-06",
  };
  const starterPaperCounts = new Map([
    ["2026-09-01", 1],
    ["2026-09-02", 1],
    ["2026-09-03", 1],
    ["2026-09-05", 2],
  ]);
  const fixedTestCodesByDate = new Map([
    ["2026-09-01", ["C9T1"]],
    ["2026-09-03", ["C9T3"]],
  ]);
  const excludedTestCodes = new Set(["C9T2"]);

  function addDays(iso, days) {
    const date = new Date(`${iso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function weekdayZh(iso) {
    const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return names[new Date(`${iso}T00:00:00Z`).getUTCDay()];
  }

  function fullPaper(date, order, total) {
    const suffix = total > 1 ? ` ${order === 1 ? "A" : "B"}` : "";
    return {
      id: `full-${date}-${order}`,
      order,
      kind: "full",
      label: "完整真题",
      title: `完整真题${suffix}`,
      module: "Listening + Reading + Writing + Speaking 完整计时",
      duration: "约 3 小时",
      detail: "完成后记录分数、错因与下一步修正",
    };
  }

  function baseRow(date) {
    return {
      id: `auto-${date}`,
      date,
      weekday: weekdayZh(date),
      dayType: "正常",
      ieltsPriority: "固定",
      ieltsPlan: "",
      ieltsModule: "",
      cambridge: "",
      trainingItems: [],
      projectType: "",
      projectPlan: "",
      projectModule: "",
      limits: "",
      status: "未开始",
      actual: "",
    };
  }

  function assignFullPapers(row, count, module, limits) {
    row.ieltsPlan = `${count} 份完整真题`;
    row.ieltsModule = module;
    row.trainingItems = Array.from({ length: count }, (_, index) => fullPaper(row.date, index + 1, count));
    row.limits = limits;
    return row;
  }

  function rowForDate(date) {
    const row = baseRow(date);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();

    if (date === plan.examDate) {
      row.dayType = "考试日";
      row.ieltsPlan = "IELTS 二战正式考试";
      row.ieltsModule = "正式考试";
      row.trainingItems = [{
        id: `exam-${date}`,
        order: 1,
        kind: "exam",
        label: "正式考试",
        title: "IELTS 二战",
        module: "依准考资讯报到并完成考试",
        duration: "考试日",
        detail: "Speaking 具体时间与地点待通知后补登",
      }];
      row.limits = "考试优先：不排制程与其他真题；单词只做轻量复习";
      return row;
    }

    if (date < plan.routineStartDate) {
      const paperCount = starterPaperCounts.get(date) || 0;
      if (paperCount) {
        return assignFullPapers(row, paperCount, paperCount > 1 ? "完整计时 + 分开复盘" : "完整计时 + 当日复盘", "9/1–9/6 指定 IELTS 排程");
      }
      row.dayType = "休息";
      row.ieltsPlan = "休息／缓冲";
      row.ieltsModule = "不排雅思真题";
      row.limits = "保留休息与调整";
      return row;
    }

    if (weekday === 1) {
      return assignFullPapers(row, 2, "完整计时 + 分开复盘", "周一 IELTS 主训练日：2 份完整真题");
    }

    if (weekday === 2) {
      row.projectType = "实验专案";
      row.projectPlan = "全天制程日";
      row.projectModule = "制程";
      return assignFullPapers(row, 1, "制程后完成真题与复盘", "周二全天制程 + 1 份完整真题");
    }

    if (weekday === 3) {
      row.projectType = "学务";
      row.projectPlan = "半天制程 + 书报讨论 + Meeting";
      row.projectModule = "书报课程";
      return assignFullPapers(row, 1, "书报讨论与 Meeting 后完成真题与复盘", "周三半天制程／书报讨论／Meeting + 1 份完整真题");
    }

    if ([4, 5].includes(weekday)) {
      row.projectType = "实验专案";
      row.projectPlan = "半天制程";
      row.projectModule = "制程";
      return assignFullPapers(row, 2, "非制程时段完成两份真题并分开复盘", "周四／五：半天制程 + 2 份完整真题");
    }

    if (weekday === 6) {
      row.projectType = "实验专案";
      row.projectPlan = "半天制程";
      row.projectModule = "制程";
      return assignFullPapers(row, 1, "非制程半天完成真题与复盘", "周六：半天制程 + 1 份完整真题");
    }

    row.dayType = "休息";
    row.ieltsPlan = "休息／缓冲";
    row.ieltsModule = "不排雅思真题";
    row.limits = "周日不排 IELTS 真题";
    return row;
  }

  const mainPlan = [];
  for (let cursor = plan.startDate; cursor <= plan.examDate; cursor = addDays(cursor, 1)) {
    mainPlan.push(rowForDate(cursor));
  }

  const testBank = [];
  for (let book = 9; book <= 21; book += 1) {
    for (let test = 1; test <= 4; test += 1) {
      const code = `C${book}T${test}`;
      if (!excludedTestCodes.has(code)) {
        testBank.push({ book, test, code, title: `Cambridge ${book} Test ${test}` });
      }
    }
  }

  const scheduledPapers = mainPlan.flatMap((row) => row.trainingItems
    .filter((item) => item.kind === "full")
    .map((item) => ({ row, item })));
  const testByCode = new Map(testBank.map((item) => [item.code, item]));
  const fixedTestCodes = new Set(Array.from(fixedTestCodesByDate.values()).flat());
  const firstRoundQueue = testBank.filter((item) => !fixedTestCodes.has(item.code));
  let firstRoundIndex = 0;
  let retakeIndex = 0;
  scheduledPapers.forEach(({ row, item }) => {
    const fixedCode = fixedTestCodesByDate.get(row.date)?.[item.order - 1];
    let assigned = fixedCode ? testByCode.get(fixedCode) : null;
    let round = 1;
    if (!assigned && firstRoundIndex < firstRoundQueue.length) {
      assigned = firstRoundQueue[firstRoundIndex];
      firstRoundIndex += 1;
    } else if (!assigned) {
      assigned = testBank[retakeIndex % testBank.length];
      round = Math.floor(retakeIndex / testBank.length) + 2;
      retakeIndex += 1;
    }
    item.id = `full-${row.date}-${assigned.code}`;
    item.title = assigned.title;
    item.cambridge = assigned.code;
    item.full = assigned.title;
    item.round = round;
    item.module = `${assigned.title}｜Listening + Reading + Writing + Speaking 完整计时`;
  });
  mainPlan.forEach((row) => {
    row.cambridge = row.trainingItems
      .filter((item) => item.kind === "full")
      .map((item) => item.cambridge)
      .join(" + ");
  });

  const scheduledCodes = scheduledPapers.map(({ item }) => item.cambridge);
  const scheduledCodeSet = new Set(scheduledCodes);
  const remainingCodes = testBank.filter((item) => !scheduledCodeSet.has(item.code)).map((item) => item.code);
  const retakeCodes = scheduledPapers.filter(({ item }) => item.round > 1).map(({ item }) => item.cambridge);

  window.IELTS_PLANNER_DATA = {
    generatedAt: "2026-08-28T00:00:00.000+08:00",
    source: "Automatic IELTS and process routine ending with the IELTS retake on 2026-11-06.",
    mainPlan,
    dailyTemplates: [],
    autoPlan: plan,
    testBank: {
      range: "Cambridge 9–21（不含 C9T2）",
      perBook: 4,
      total: testBank.length,
      excludedCodes: Array.from(excludedTestCodes),
      scheduled: scheduledCodeSet.size,
      scheduledCodes,
      remainingCodes,
      scheduledSlots: scheduledPapers.length,
      retakeCodes,
    },
    planVersion: "2026-08-28-ielts-routine-v8",
    resetFromDate: "2026-09-01"
  };
})();
