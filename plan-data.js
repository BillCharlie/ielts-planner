(function () {
  const plan = {
    startDate: "2026-08-24",
    starterEndDate: "2026-08-28",
    routineStartDate: "2026-09-07",
    examDate: "2026-11-06",
  };

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
      limits: "每天 20 个单词；从日历的单词按钮打开",
      status: "未开始",
      actual: "",
    };
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

    if (date >= plan.startDate && date <= plan.starterEndDate) {
      row.ieltsPlan = "1 份完整真题";
      row.ieltsModule = "完整计时 + 当日复盘";
      row.trainingItems = [fullPaper(date, 1, 1)];
      row.limits = "8/24–8/28 每天 1 份完整真题 + 20 个单词";
      return row;
    }

    if (date < plan.routineStartDate) {
      row.dayType = "休息";
      row.ieltsPlan = "休息／缓冲";
      row.ieltsModule = "不排雅思真题";
      row.limits = "保留休息与调整；仍维持每天 20 个单词";
      return row;
    }

    if (weekday === 1) {
      row.ieltsPlan = "2 份完整真题";
      row.ieltsModule = "完整计时 + 分开复盘";
      row.trainingItems = [fullPaper(date, 1, 2), fullPaper(date, 2, 2)];
      row.limits = "周一 IELTS 主训练日：2 份完整真题 + 20 个单词";
      return row;
    }

    if (weekday === 2) {
      row.projectType = "实验专案";
      row.projectPlan = "全天制程日";
      row.projectModule = "制程";
      row.ieltsPlan = "不排雅思真题";
      row.ieltsModule = "制程日";
      row.limits = "周二全天制程；不排 IELTS 真题；只保留 20 个单词";
      return row;
    }

    if (weekday === 3) {
      row.projectType = "学务";
      row.projectPlan = "半天制程 + 书报讨论 + Meeting";
      row.projectModule = "书报课程";
      row.ieltsPlan = "不排雅思真题";
      row.ieltsModule = "书报讨论与 Meeting";
      row.limits = "周三不排 IELTS 真题；只保留 20 个单词";
      return row;
    }

    if ([4, 5, 6].includes(weekday)) {
      row.projectType = "实验专案";
      row.projectPlan = "半天制程";
      row.projectModule = "制程";
      row.ieltsPlan = "1 份完整真题";
      row.ieltsModule = "非制程半天完成真题与复盘";
      row.trainingItems = [fullPaper(date, 1, 1)];
      row.limits = "周四／五／六：半天制程 + 1 份完整真题 + 20 个单词";
      return row;
    }

    row.ieltsPlan = "整理复习 + 错题归档";
    row.ieltsModule = "本周真题、单词与错题整理";
    row.limits = "周日不做新真题；整理复习 + 20 个单词";
    return row;
  }

  const mainPlan = [];
  for (let cursor = plan.startDate; cursor <= plan.examDate; cursor = addDays(cursor, 1)) {
    mainPlan.push(rowForDate(cursor));
  }

  window.IELTS_PLANNER_DATA = {
    generatedAt: "2026-08-16T00:00:00.000+08:00",
    source: "Automatic IELTS and process routine ending with the IELTS retake on 2026-11-06.",
    mainPlan,
    dailyTemplates: [],
    autoPlan: plan,
    planVersion: "2026-08-16-ielts-routine-v2",
    resetFromDate: "2026-08-24"
  };
})();
