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
  const RESEARCH_GATES = [
    { id: "g1", code: "G1", name: "Process Ready", date: "2026-10-14", proof: "Fin lithography + etch recipe freeze；linewidth、etch depth、sidewall 有记录", pass: "进入正式 D / E-mode device", miss: "8 月毕业风险开始上升" },
    { id: "g2", code: "G2", name: "Device Ready", date: "2026-12-15", proof: "第一批 D-mode + E-mode Fin 完成，并开始 electrical measurement", pass: "Plan A 维持绿灯", miss: "8 月毕业进入黄灯" },
    { id: "g3", code: "G3", name: "Data Ready", date: "2027-03-31", proof: "Id–Vg / Id–Vd / Vth / Ron / leakage / C–V / Ohmic / TCAD comparison 齐全", pass: "7–8 月毕业仍然现实", miss: "停止硬追，正式切换 Plan B" },
    { id: "g4", code: "G4", name: "Thesis Ready", date: "2027-05-31", proof: "完整硕论初稿已交给老师，口试简报框架建立", pass: "送审并安排 7 月口试", miss: "口试顺延到秋季" },
  ];
  const APPLICATION_GATES = [
    { id: "a1", code: "A1", name: "Taiwan PhD Ready", date: "2027-03-15", displayDate: "2027/03/15 内部备齐 · 预计3月下旬至4月上旬报名", proof: "116学年度博士考试入学：台大电子所／阳明交大目标、CV、研究计划、成绩单与推荐信备齐", pass: "核对116正式简章；开放后两天内提交，并分别确认报名、材料、推荐信截止", miss: "按学校正式截止补齐；2027时程仍待公告，不沿用秋季甄试日期" },
    { id: "a2", code: "A2", name: "HK Application Window", date: "2026-11-20", displayDate: "09/01—11/20 · 官方截止预计 12/01", proof: "HKU／HKUST／CityU／PolyU 的导师版 CV、proposal、两位推荐人和完整申请均已准备；HKPFS 第一、第二志愿已经锁定", pass: "11/20 内部封版，12/1 前只做复核并完成 RGC 初申与学校完整申请", miss: "不得把月底当作主申请截止；只保留最后复核与系统异常缓冲" },
    { id: "a3", code: "A3", name: "Europe PhD Pipeline", date: "2026-12-15", displayDate: "12/15—2027/03", proof: "建立 project vacancy 清单；每个职位都有对应 CV、motivation letter 与研究证据", pass: "1–3 月持续投递并进入 technical interview", miss: "减少泛投，集中有 funding 与 fab access 的职位" },
  ];
  const GATE_GANTT_MONTHS = ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05"];
  const RESEARCH_GANTT_BARS = [
    { gateId: "g1", start: "2026-09-07", end: "2026-10-14", lane: 1 },
    { gateId: "g2", start: "2026-10-15", end: "2026-12-15", lane: 1 },
    { gateId: "g3", start: "2026-12-16", end: "2027-03-31", lane: 1 },
    { gateId: "g4", start: "2027-04-01", end: "2027-05-31", lane: 1 },
  ];
  const APPLICATION_GANTT_BARS = [
    { gateId: "a1", start: "2027-01-01", end: "2027-04-10", lane: 2 },
    { gateId: "a2", start: "2026-09-01", end: "2026-11-20", lane: 2 },
    { gateId: "a3", start: "2026-12-15", end: "2027-03-31", lane: 1 },
  ];
  const ROADMAP_TASKS = [
    { id: "raith-learn", phase: "现在", category: "FinFET", title: "Raith 学习一周", detail: "9/7–9/13；周二／四／六／日安排学习与操作练习", due: "09/13" },
    { id: "ebeam-fin-1", phase: "现在", category: "FinFET", title: "EBeam Fin 实验第1周", detail: "9/14–9/20；实验日周二／四／六／日，记录条件与结果", due: "09/20" },
    { id: "ebeam-fin-2", phase: "接下来", category: "FinFET", title: "EBeam Fin 实验第2周", detail: "9/21–9/22、10/3–10/7；9/23–10/2旅行暂停，按原实验日推进", due: "10/07" },
    { id: "ebeam-fin-3", phase: "接下来", category: "FinFET", title: "EBeam Fin 实验第3周", detail: "10/8–10/14；完成测试与结果整理", due: "10/14" },
    { id: "fin-doe", phase: "接下来", category: "FinFET", title: "完成 Fin exposure / etch DOE", detail: "EBeam Fin三周完成后整理 dose、linewidth、etch depth、sidewall，10/14核对G1", due: "10/14" },
    { id: "ielts-window", phase: "现在", category: "IELTS", title: "核对 IELTS 二战报名资料", detail: "考试日已定 2026/11/06；确认场次、证件与报到资讯", due: "11/06" },
    { id: "ielts-diagnostic", phase: "现在", category: "IELTS", title: "完成 L / R 计时诊断", detail: "Writing / Speaking 同步做基线记录", due: "08/31" },
    { id: "speaking-admin", phase: "现在", category: "IELTS", title: "补登 Speaking 场次", detail: "收到通知后记录考试时间、地点、报到方式与前后 buffer", due: "待通知" },
    { id: "iedms-assets", phase: "现在", category: "会议", title: "IEDMS figure inventory", detail: "论文 figure → poster → 口头解释，不重新做研究", due: "08/31" },
    { id: "cv-process", phase: "现在", category: "FinFET", title: "启动 C–V test process", detail: "建立 test structure 与 measurement flow", due: "09/15" },
    { id: "advisor-exit", phase: "现在", category: "沟通", title: "和老师确认毕业 exit criteria", detail: "带 G1–G4 询问 7–8 月口试的必要成果", due: "09/15" },
    { id: "tcad-archive", phase: "现在", category: "TCAD / AI", title: "封存 TCAD model 与参数版本", detail: "让 experiment comparison 可以重现", due: "09/30" },
    { id: "iedms-freeze", phase: "接下来", category: "会议", title: "IEDMS poster freeze", detail: "完成版面、输出与 3 / 10 分钟讲法", due: "10/15" },
    { id: "regrowth", phase: "接下来", category: "FinFET", title: "Ohmic Regrowth test", detail: "建立条件、结果与 contact 行为对照", due: "10/31" },
    { id: "iwn-freeze", phase: "接下来", category: "会议", title: "IWN poster freeze", detail: "IEDMS 后集中完成，11/04 后只改错误", due: "11/04" },
    { id: "devices", phase: "接下来", category: "FinFET", title: "第一批 D / E-mode Fin 完成", detail: "建立待量测 device matrix", due: "11/30" },
    { id: "first-data", phase: "接下来", category: "FinFET", title: "第一批完整 electrical data", detail: "Id–Vg、Id–Vd、Vth、Ron、leakage；必要时 BV", due: "12/15" },
    { id: "recommend-tw", phase: "稍后", category: "PhD · TW", title: "台湾考试入学推荐信", detail: "2027/2请老师支持春季考试入学；附最新CV、研究成果、目标系所与待确认截止", due: "2027/02/15" },
    { id: "tw-shortlist", phase: "稍后", category: "PhD · TW", title: "台湾考试入学导师与材料清单", detail: "2027/1确认台大电子所与阳明交大方向，整理研究计划、成绩单和毕业时间", due: "2027/01/31" },
    { id: "tw-brochure", phase: "稍后", category: "PhD · TW", title: "核对116博士考试入学简章", detail: "2027/2起检查公告；确认组别是否招生、资格、书审／笔试／口试、推荐信与材料截止", due: "2027/03/10" },
    { id: "tw-ready", phase: "稍后", category: "PhD · TW", title: "台湾申请材料内部备齐", detail: "个人准备节点3/15，不是学校截止；按正式简章更新后提交", due: "2027/03/15" },
    { id: "tw-submit", phase: "稍后", category: "PhD · TW", title: "台湾博士考试入学报名", detail: "预计2027/3月下旬至4月上旬；报名、上传及推荐信分别确认，116日期待公告", due: "2027/03–04 待公告" },
    { id: "tw-interview", phase: "稍后", category: "PhD · TW", title: "台湾博士考试／口试", detail: "预计2027/4–5月；按系所简章准备研究简报及可能的笔试，逐校记录时间", due: "2027/04–05 待公告" },
    { id: "tw-result", phase: "稍后", category: "PhD · TW", title: "台湾放榜与报到", detail: "预计2027/5月追踪结果；确认报到、毕业证书及入学节点", due: "2027/05 待公告" },
    { id: "recommend-overseas", phase: "接下来", category: "PhD · HK / EU", title: "香港／欧洲申请推荐信", detail: "IWN 结束后加入两场会议成果与最新 Fin 进度，附 CV v3、目标清单与 deadline", due: "11/20" },
    { id: "hk-shortlist", phase: "现在", category: "PhD · HK", title: "完成香港四校导师长名单", detail: "HKU、HKUST、CityU、PolyU 各保留 2–4 位与 GaN、III-N、TCAD、power device 或 fabrication 匹配的导师", due: "08/31" },
    { id: "hk-contact-wave", phase: "现在", category: "PhD · HK", title: "完成第一轮香港导师联系", detail: "确认 2027 intake、funding、实验室名额与研究契合度；同步检查 2027/28 新版简章", due: "09/20" },
    { id: "hk-materials", phase: "接下来", category: "PhD · HK", title: "四校申请材料完成", detail: "完成主 CV、四校适配版本、research proposal、成绩单与成果附件", due: "10/15" },
    { id: "hk-hkpfs-priority", phase: "接下来", category: "PhD · HKPFS", title: "锁定 HKPFS 两个志愿", detail: "RGC 最多只能填两个 programme choices；确认第一、第二志愿及对应导师", due: "11/10" },
    { id: "hk-internal-freeze", phase: "接下来", category: "PhD · HK", title: "香港申请内部封版", detail: "四校表单、附件、推荐人邀请和 HKPFS 选项全部完成；之后只允许复核与修正", due: "11/20" },
    { id: "hk-rgc-submit", phase: "接下来", category: "PhD · HKPFS", title: "提交 RGC HKPFS 初步申请", detail: "预计硬截止为 12/01 12:00 HKT；取得 HKPFS reference number", due: "12/01 12:00" },
    { id: "hk-school-submit", phase: "接下来", category: "PhD · HK", title: "完成四校完整申请", detail: "预计 HKPFS 学校端硬截止为 12/01 23:59 HKT；确认付款、附件和推荐信状态", due: "12/01 23:59" },
    { id: "hk-interview-prep", phase: "稍后", category: "PhD · HK", title: "香港 PhD 面试与 follow-up", detail: "准备研究简报、研究契合度、未来计划与毕业时间说明；持续追踪 3–5 月结果", due: "2027/03" },
    { id: "tcad-compare", phase: "稍后", category: "TCAD / AI", title: "完成 TCAD–experiment 核心比较图", detail: "串联 electrostatics、Fin width、Vth 与 leakage", due: "2027/02" },
    { id: "paper-draft", phase: "稍后", category: "论文", title: "Fin / TCAD journal paper 初稿", detail: "只保留能支撑主张的结果", due: "2027/02" },
    { id: "data-freeze", phase: "稍后", category: "FinFET", title: "主要实验 data freeze", detail: "3 月后不再无限制开 wafer 或扩张 DOE", due: "2027/03" },
    { id: "thesis-half", phase: "稍后", category: "论文", title: "Thesis 初稿达到 50–60%", detail: "Methods、results、discussion 可供老师审阅", due: "2027/04" },
    { id: "thesis-full", phase: "稍后", category: "论文", title: "完整 Thesis 初稿交老师", detail: "同时提出口试日期与修改 buffer", due: "2027/05" },
    { id: "defense", phase: "稍后", category: "论文", title: "完成硕士口试", detail: "Plan A 目标；若 Gate 未过则依 Plan B 顺延", due: "2027/07" },
  ];
  const ROADMAP_TASK_PLACEMENTS = {
    "raith-learn": ["2026/09", "research"],
    "ebeam-fin-1": ["2026/09", "research"],
    "ebeam-fin-2": ["2026/10", "research"],
    "ebeam-fin-3": ["2026/10", "research"],
    "fin-doe": ["2026/10", "research"],
    "ielts-window": ["2026/11", "external"],
    "ielts-diagnostic": ["2026/08", "external"],
    "speaking-admin": ["2026/11", "external"],
    "iedms-assets": ["2026/08", "external"],
    "cv-process": ["2026/09", "research"],
    "advisor-exit": ["2026/09", "research"],
    "tcad-archive": ["2026/09", "research"],
    "iedms-freeze": ["2026/10", "external"],
    "regrowth": ["2026/10", "research"],
    "iwn-freeze": ["2026/11", "external"],
    "devices": ["2026/11", "research"],
    "first-data": ["2026/12", "research"],
    "recommend-tw": ["2027/02", "application"],
    "tw-shortlist": ["2027/01", "application"],
    "tw-brochure": ["2027/03", "application"],
    "tw-ready": ["2027/03", "application"],
    "tw-submit": ["2027/03", "application"],
    "tw-interview": ["2027/04", "application"],
    "tw-result": ["2027/05", "application"],
    "recommend-overseas": ["2026/11", "application"],
    "hk-shortlist": ["2026/08", "application"],
    "hk-contact-wave": ["2026/09", "application"],
    "hk-materials": ["2026/10", "application"],
    "hk-hkpfs-priority": ["2026/11", "application"],
    "hk-internal-freeze": ["2026/11", "application"],
    "hk-rgc-submit": ["2026/12", "application"],
    "hk-school-submit": ["2026/12", "application"],
    "hk-interview-prep": ["2027/01", "application"],
    "tcad-compare": ["2027/02", "research"],
    "paper-draft": ["2027/02", "external"],
    "data-freeze": ["2027/03", "research"],
    "thesis-half": ["2027/04", "external"],
    "thesis-full": ["2027/05", "external"],
    "defense": ["2027/07", "external"],
  };
  const ROADMAP_MONTHS = [
    ["2026/08", "Process R&D", "Fin exposure / etch DOE；整理 linewidth、dose、etch depth、sidewall", "IELTS 二战已定 11/06；重新诊断；IEDMS figure inventory；C–V 规划", "台湾导师清单与 CV v1；HKU／HKUST／CityU／PolyU 导师长名单；等待 2027/28 简章", "A / B 正常推进"],
    ["2026/09", "Recipe freeze", "9/7–9/13 Raith学习；9/14起EBeam Fin三周；9/23–10/2旅行暂停", "IELTS 核心训练；IEDMS poster 50–70%", "台湾改走2027春季考试入学；香港预计9/1开放门户／HKPFS，9/20前完成第一轮导师联系", "G1 随实验顺延至10/14"],
    ["2026/10", "Device launch", "10/3恢复EBeam Fin，10/14完成G1；随后正式 D / E-mode Fin、Ohmic Regrowth test", "IEDMS 已接受；10/15 poster freeze；10/22–23 参会；IELTS 维持训练", "台湾积累研究成果，2027春季考试入学；香港四校材料10/15 ready", "A：正式 wafer 已开始"],
    ["2026/11", "Fabrication sprint", "11/30 完成第一批 Fin；建立 measurement matrix", "11/04 IWN poster freeze；11/06 IELTS 二战；11/08–13 IWN", "台湾更新CV与成果；11/10锁定HKPFS两个志愿；IWN后请HK／欧洲推荐信；11/20香港内部封版", "B 最晚延至 12 月"],
    ["2026/12", "First data", "Electrical measurement；C–V / Regrowth correlation", "整理 TCAD 对照与 journal story", "香港预计 12/1 12:00 RGC 初申、23:59 学校完整申请；之后面试追踪；12/15 启动欧洲", "12/15 通过 G2"],
    ["2027/01", "Diagnose", "分析第一批结果；重测异常 device", "Paper / thesis chapter 开始", "台湾考试入学导师／材料清单；欧洲主投；香港面试、补件与follow-up", "A：只做有限补实验"],
    ["2027/02", "Controlled iteration", "第二轮 device / 必要补测", "TCAD–experiment comparison；paper 初稿", "台湾推荐信与研究计划，检查116简章；欧洲rolling positions；香港面试／offer追踪", "A：实验开始 freeze"],
    ["2027/03", "Data freeze", "主要 dataset 收敛", "Fin paper 投稿或接近投稿；thesis 架构", "台湾3/15内部备齐；预计3月下旬开始考试入学报名（待公告）；香港／欧洲面试并行", "3/31 通过 G3，否则切 B"],
    ["2027/04", "Write", "只补必要量测；不做开放式新制程", "硕论初稿 50–60%", "台湾预计4月上旬报名收尾、4–5月考试／口试（待公告）；比较题目、PI、funding、fab access", "A：写作主导；B：data 收敛"],
    ["2027/05", "Thesis ready", "原则上不开新 wafer", "5/31 完整初稿给老师", "台湾预计5月放榜与报到（待公告）；确定去向与弹性start date", "A 通过 G4；B 开始主写"],
    ["2027/06", "Defense prep", "补最后必要数据；研究交接", "送审／申请口试；简报问答", "签证／行政", "A：Defense ready；B：30–50%"],
    ["2027/07", "Plan A defense", "完成交接文件", "Plan A：硕士口试与修改", "确认报到节点", "A：口试；B：Thesis 60–80%"],
    ["2027/08", "Target graduation", "结案／资料封存", "Plan A：修改、离校、毕业", "若 A 成功则衔接 PhD", "A：目标毕业；B：Thesis final"],
    ["2027/09", "Buffer", "只处理口试必要修正", "Plan B：口试准备", "维持 offer，确认延后报到", "B：Defense ready"],
    ["2027/10", "Plan B defense", "收尾与交接", "Plan B：口试、修改", "更新 availability", "B：硕士口试"],
    ["2027/11", "Conservative window", "完成行政与离校", "Plan B：毕业窗口", "PhD 衔接", "B：目标毕业"],
    ["2027/12", "Final buffer", "只保留必要 contingency", "最终毕业缓冲", "完成转场", "B：最晚毕业窗口"],
  ];
  const PHD_REGION_PRESETS = [
    { id: "hk", code: "HK", name: "香港", hint: "集中式 PhD 申请与导师联系", schools: ["HKUST", "HKU", "CUHK", "CityU", "PolyU"] },
    { id: "tw", code: "TW", name: "台湾", hint: "学校招生规则与导师意愿并行确认", schools: ["NTU"] },
    { id: "eu", code: "EU", name: "欧洲", hint: "以导师、实验室或 project vacancy 为单位", schools: ["KU Leuven / imec", "TU Delft", "EPFL", "Fraunhofer IISB"] },
  ];
  const PHD_APPLICATION_STATUSES = ["研究中", "准备联系", "已联系", "待回复", "准备申请", "已送出", "面试", "Offer", "暂停"];
  const data = window.IELTS_PLANNER_DATA || { mainPlan: [], dailyTemplates: [] };
  let state = loadState();
  let mainPlan = state.planRows?.length ? state.planRows : [...(data.mainPlan || []), ...(state.extraPlanRows || [])];
  const dailyTemplates = data.dailyTemplates || [];
  let mainByDate = new Map(mainPlan.map((item) => [item.date, item]));
  const dailyByDate = new Map(dailyTemplates.map((item) => [item.date, item]));
  let authToken = localStorage.getItem(TOKEN_KEY) || "";
  let cloudSaveTimer = null;
  let applyingRemoteState = false;

  let calendarToday = isoToday();
  let selectedDate = calendarToday;
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
    bindRoadmapControls();
    bindPhdControls();
    bindPwa();
    showInitialView();
    scheduleCalendarDateRefresh();
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
      "navRoadmap",
      "navPhd",
      "dateRangeLabel",
      "installButton",
      "lockButton",
      "calendarView",
      "planView",
      "roadmapView",
      "prevMonth",
      "nextMonth",
      "monthTitle",
      "monthGrid",
      "testBankProgress",
      "testBankRemaining",
      "selectedDayType",
      "selectedDateTitle",
      "vocabularyButton",
      "vocabularyPanel",
      "vocabularyDate",
      "vocabularyCount",
      "vocabularyForm",
      "vocabularyInput",
      "vocabularyTranslationInput",
      "exportVocabularyButton",
      "vocabularyDayCount",
      "vocabularyGrid",
      "vocabularyEmpty",
      "weeklyVocabulary",
      "weeklyVocabularyCount",
      "weeklyVocabularyGroups",
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
      "roadmapResetButton",
      "roadmapGateCountdown",
      "roadmapTaskProgress",
      "roadmapTrackStatus",
      "roadmapGateGroups",
      "roadmapResearchGateGrid",
      "roadmapApplicationGateGrid",
      "roadmapTimelineBody",
      "roadmapTaskGroups",
      "phdView",
      "phdSchoolCount",
      "phdAdvisorCount",
      "phdCvCount",
      "phdActiveCount",
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
    el.navRoadmap.addEventListener("click", () => setView("roadmap"));
    el.navPhd.addEventListener("click", () => setView("phd"));
    el.navCalendar.addEventListener("click", () => setView("calendar"));
    el.navPlan.addEventListener("click", () => setView("plan"));
  }

  function bindCalendarControls() {
    el.vocabularyButton.addEventListener("click", () => {
      const willOpen = el.vocabularyPanel.hidden;
      el.vocabularyPanel.hidden = !willOpen;
      el.vocabularyButton.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) renderVocabulary();
    });

    el.vocabularyForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addVocabularyCard(selectedDate, el.vocabularyInput.value, el.vocabularyTranslationInput.value);
    });

    el.vocabularyPanel.addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-delete-vocabulary]");
      if (deleteButton) {
        deleteVocabularyCard(deleteButton.dataset.vocabularyDate, deleteButton.dataset.deleteVocabulary);
        return;
      }
      const flipButton = event.target.closest("[data-flip-vocabulary]");
      if (!flipButton) return;
      const card = flipButton.closest(".word-card");
      const isFlipped = card.classList.toggle("is-flipped");
      flipButton.setAttribute("aria-pressed", String(isFlipped));
      flipButton.setAttribute("aria-label", isFlipped ? "显示英文" : "显示中文翻译");
      card.querySelector(".word-card-front")?.setAttribute("aria-hidden", String(isFlipped));
      card.querySelector(".word-card-back")?.setAttribute("aria-hidden", String(!isFlipped));
    });

    el.exportVocabularyButton.addEventListener("click", exportVocabularyCards);

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

    el.clearAllButton?.addEventListener("click", () => {
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

  function bindRoadmapControls() {
    el.roadmapResetButton.addEventListener("click", () => {
      if (!window.confirm("要把研究 Gate 和任务进度全部归零吗？PhD 申请追踪不会被清除。")) return;
      state.roadmap = defaultRoadmapState();
      saveState();
      renderRoadmap();
      showSaved("研究进度已归零");
    });

    el.roadmapGateGroups.addEventListener("change", (event) => {
      const input = event.target.closest("[data-roadmap-gate]");
      if (!input) return;
      state.roadmap.gates[input.dataset.roadmapGate] = input.checked;
      saveState();
      renderRoadmap();
    });

    el.roadmapTaskGroups.addEventListener("change", (event) => {
      const monthlyInput = event.target.closest("[data-roadmap-monthly]");
      if (monthlyInput) {
        state.roadmap.monthly ||= {};
        state.roadmap.monthly[monthlyInput.dataset.roadmapMonthly] = monthlyInput.checked;
        saveState();
        renderRoadmap();
        return;
      }
      const input = event.target.closest("[data-roadmap-task]");
      if (!input) return;
      state.roadmap.tasks[input.dataset.roadmapTask] = input.checked;
      saveState();
      renderRoadmap();
    });

  }

  function enableDragScroll(container) {
    if (!container) return;
    let down = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    container.addEventListener("pointerdown", (event) => {
      // Reset first so a stale drag never swallows the next real click.
      moved = false;
      // Only hijack a plain mouse drag on empty panel space — let touch/pen use
      // native swipe, and never steal drags from controls or the inner timeline.
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      if (event.target.closest("input, select, textarea, button, a, label, .hk-timeline-scroll")) return;
      down = true;
      startX = event.clientX;
      startScroll = container.scrollLeft;
      container.classList.add("dragging");
      try {
        container.setPointerCapture(event.pointerId);
      } catch {
        /* no active pointer (e.g. synthetic event) — harmless */
      }
    });
    container.addEventListener("pointermove", (event) => {
      if (!down) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      container.scrollLeft = startScroll - dx;
    });
    const release = (event) => {
      if (!down) return;
      down = false;
      container.classList.remove("dragging");
      if (event.pointerId != null && container.hasPointerCapture?.(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      // Snap to the nearest country page (step = panel width + gap).
      const pages = container.querySelectorAll(".hk-application-panel");
      if (pages.length) {
        const step = pages.length > 1 ? pages[1].offsetLeft - pages[0].offsetLeft : pages[0].offsetWidth;
        if (step > 0) {
          const page = Math.round(container.scrollLeft / step);
          container.scrollTo({ left: page * step, behavior: "smooth" });
        }
      }
    };
    container.addEventListener("pointerup", release);
    container.addEventListener("pointercancel", release);
    // Swallow the click that ends a drag so links/buttons don't fire on release.
    container.addEventListener(
      "click",
      (event) => {
        if (moved) {
          event.preventDefault();
          event.stopPropagation();
          moved = false;
        }
      },
      true,
    );
  }

  function bindPhdControls() {
    enableDragScroll(el.phdView.querySelector(".application-panels-scroller"));

    el.phdView.addEventListener("submit", (event) => {
      const schoolForm = event.target.closest("[data-add-phd-school]");
      if (schoolForm) {
        event.preventDefault();
        addPhdSchool(schoolForm);
        return;
      }
      const advisorForm = event.target.closest("[data-add-phd-advisor]");
      if (advisorForm) {
        event.preventDefault();
        addPhdAdvisor(advisorForm);
      }
    });

    el.phdView.addEventListener("input", (event) => {
      updatePhdTextField(event.target);
    });

    el.phdView.addEventListener("change", (event) => {
      updatePhdControl(event.target);
    });

    el.phdView.addEventListener("click", (event) => {
      const removeAdvisor = event.target.closest("[data-delete-phd-advisor]");
      if (removeAdvisor) {
        deletePhdAdvisor(removeAdvisor);
        return;
      }
      const removeSchool = event.target.closest("[data-delete-phd-school]");
      if (removeSchool) deletePhdSchool(removeSchool);
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
    el.dateRangeLabel.textContent = planRangeLabel();
    el.planRangeTitle.textContent = planRangeLabel();
    renderAll();
    setView("roadmap");
  }

  function setView(viewName) {
    const isRoadmap = viewName === "roadmap";
    const isPhd = viewName === "phd";
    const isCalendar = viewName === "calendar";
    el.navRoadmap.classList.toggle("active", isRoadmap);
    el.navPhd.classList.toggle("active", isPhd);
    el.navCalendar.classList.toggle("active", isCalendar);
    el.navPlan.classList.toggle("active", viewName === "plan");
    el.roadmapView.classList.toggle("active", isRoadmap);
    el.phdView.classList.toggle("active", isPhd);
    el.calendarView.classList.toggle("active", isCalendar);
    el.planView.classList.toggle("active", viewName === "plan");
    if (viewName === "plan") renderPlanTable();
    if (isRoadmap) renderRoadmap();
    if (isPhd) renderPhdTracker();
  }

  function renderAll() {
    renderRoadmap();
    renderPhdTracker();
    renderModuleCatalog();
    renderCalendar();
    renderSelectedDay();
    renderPlanTable();
  }

  function renderRoadmap() {
    renderRoadmapStats();
    renderRoadmapGates();
    renderRoadmapTimeline();
  }

  function renderRoadmapStats() {
    const roadmap = state.roadmap || defaultRoadmapState();
    const doneTasks = ROADMAP_TASKS.filter((task) => roadmap.tasks[task.id]).length;
    const monthlyKeys = ROADMAP_MONTHS.flatMap((row) => ["research", "external", "application"].map((track) => `${row[0]}:${track}`));
    const doneMonthly = monthlyKeys.filter((key) => roadmap.monthly?.[key]).length;
    const nextGate = RESEARCH_GATES.find((gate) => !roadmap.gates[gate.id]) || RESEARCH_GATES.at(-1);
    const remaining = daysUntil(nextGate.date);
    el.roadmapTaskProgress.textContent = `${doneTasks + doneMonthly} / ${ROADMAP_TASKS.length + monthlyKeys.length}`;
    el.roadmapGateCountdown.textContent = `${formatDate(nextGate.date)} · ${remaining >= 0 ? `剩 ${remaining} 天` : "待补登结果"}`;
    el.roadmapTrackStatus.textContent = roadmap.gates.g3 ? "Plan A 有数据支持" : "A / B 同时保留";
  }

  function renderRoadmapGates() {
    const gatesState = state.roadmap?.gates || {};
    el.roadmapResearchGateGrid.innerHTML = renderGanttLane(RESEARCH_GATES, RESEARCH_GANTT_BARS, gatesState, "research");
    el.roadmapApplicationGateGrid.innerHTML = renderGanttLane(APPLICATION_GATES, APPLICATION_GANTT_BARS, gatesState, "application");
  }

  function renderGanttLane(gates, bars, gatesState, type) {
    const gateById = new Map(gates.map((gate) => [gate.id, gate]));
    return `
      <div class="gantt-month-bands" aria-hidden="true">${GATE_GANTT_MONTHS.map(() => "<span></span>").join("")}</div>
      <div class="gantt-baseline" aria-hidden="true"></div>
      ${bars.map((bar) => renderGanttBar(gateById.get(bar.gateId), bar, gatesState, type)).join("")}
    `;
  }

  function renderGanttBar(gate, bar, gatesState, type) {
    const done = Boolean(gatesState[gate.id]);
    const position = ganttPosition(bar.start, bar.end);
    const status = done ? (type === "application" ? "已完成" : "已通过") : "未开始";
    return `
      <label class="gantt-gate-bar ${safeAttr(type)} lane-${bar.lane}${done ? " complete" : ""}" style="--gantt-left:${position.left}%;--gantt-width:${position.width}%" title="${safeAttr(`${gate.proof}｜完成：${gate.pass}｜未过：${gate.miss}`)}">
        <input type="checkbox" data-roadmap-gate="${safeAttr(gate.id)}" aria-label="${safeAttr(`${gate.code} ${gate.name}，${status}`)}"${done ? " checked" : ""} />
        <span class="gantt-gate-copy"><b>${safe(gate.code)} · ${safe(gate.name)}</b><small>${safe(gate.displayDate || formatDate(gate.date))}</small></span>
        <strong>${done ? "✓" : "○"}<span>${safe(status)}</span></strong>
        <i class="gantt-milestone" aria-hidden="true"></i>
      </label>
    `;
  }

  function ganttPosition(start, end) {
    const point = (value, endOfDay) => {
      const [year, month, day] = value.split("-").map(Number);
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const monthIndex = GATE_GANTT_MONTHS.indexOf(monthKey);
      const daysInMonth = new Date(year, month, 0).getDate();
      const dayOffset = endOfDay ? day / daysInMonth : (day - 1) / daysInMonth;
      return ((monthIndex + dayOffset) / GATE_GANTT_MONTHS.length) * 100;
    };
    const left = point(start, false);
    const right = point(end, true);
    return { left: left.toFixed(3), width: Math.max(right - left, 1.5).toFixed(3) };
  }

  function renderRoadmapTimeline() {
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const taskState = state.roadmap?.tasks || {};
    const monthlyState = state.roadmap?.monthly || {};
    el.roadmapTimelineBody.innerHTML = ROADMAP_MONTHS.map((row, index) => {
      const [year, month] = row[0].split("/");
      const monthNumber = Number(month);
      const yearBoundary = monthNumber === 1 ? " year-boundary" : "";
      return `
        <div class="vertical-gantt-row${yearBoundary}" role="row">
          <div class="vertical-gantt-time${index === 0 ? " first" : ""}${index === ROADMAP_MONTHS.length - 1 ? " last" : ""}" role="rowheader">
            <time datetime="${safeAttr(`${year}-${month}`)}"><b>${safe(year)}</b><strong>${safe(monthNames[monthNumber - 1])}</strong></time>
            <span class="roadmap-phase-tag">${safe(row[1])}</span>
          </div>
          ${renderVerticalGanttCell(row[0], "research", row[2], taskState, monthlyState)}
          ${renderVerticalGanttCell(row[0], "external", row[3], taskState, monthlyState)}
          ${renderVerticalGanttCell(row[0], "application", row[4], taskState, monthlyState)}
          ${renderVerticalGanttCell(row[0], "graduation", row[5], taskState, monthlyState)}
        </div>
      `;
    }).join("");
  }

  function renderVerticalGanttCell(month, track, summary, taskState, monthlyState) {
    const tasks = ROADMAP_TASKS.filter((task) => {
      const placement = ROADMAP_TASK_PLACEMENTS[task.id];
      return placement?.[0] === month && placement?.[1] === track;
    });
    const monthlyKey = `${month}:${track}`;
    const monthlyDone = Boolean(monthlyState[monthlyKey]);
    const summaryContent = track === "graduation"
      ? `<p>${safe(summary)}</p>`
      : `
        <label class="vertical-gantt-summary-check${monthlyDone ? " complete" : ""}">
          <input type="checkbox" data-roadmap-monthly="${safeAttr(monthlyKey)}" aria-label="${safeAttr(`${month} ${summary}，${monthlyDone ? "已完成" : "未完成"}`)}"${monthlyDone ? " checked" : ""} />
          <span class="vertical-gantt-summary-box">${monthlyDone ? "✓" : ""}</span>
          <span>${safe(summary)}</span>
        </label>
      `;
    return `
      <div class="vertical-gantt-cell ${safeAttr(track)}" role="cell">
        <div class="vertical-gantt-cell-content${monthlyDone && track !== "graduation" ? " monthly-complete" : ""}">
          ${summaryContent}
          ${tasks.length ? `<div class="vertical-gantt-checklist">${tasks.map((task) => renderVerticalGanttTask(task, taskState)).join("")}</div>` : ""}
        </div>
      </div>
    `;
  }

  function renderVerticalGanttTask(task, taskState) {
    const checked = Boolean(taskState[task.id]);
    return `
      <label class="vertical-gantt-task${checked ? " complete" : ""}" title="${safeAttr(task.detail)}">
        <input type="checkbox" data-roadmap-task="${safeAttr(task.id)}" aria-label="${safeAttr(`${task.title}，${checked ? "已完成" : "未完成"}`)}"${checked ? " checked" : ""} />
        <span class="vertical-gantt-task-check">${checked ? "✓" : ""}</span>
        <span><b>${safe(task.title)}</b><small>${safe(task.category)} · ${safe(task.due)}</small></span>
      </label>
    `;
  }

  function renderPhdTracker() {
    const regions = state.phdTracker?.regions || [];
    const schools = regions.flatMap((region) => region.schools || []);
    const advisors = schools.flatMap((school) => school.advisors || []);
    const cvDone = advisors.filter((advisor) => advisor.cvDone).length;
    const active = advisors.filter((advisor) => !["研究中", "准备联系", "暂停"].includes(advisor.status)).length;
    el.phdSchoolCount.textContent = String(schools.length);
    el.phdAdvisorCount.textContent = String(advisors.length);
    el.phdCvCount.textContent = `${cvDone} / ${advisors.length}`;
    el.phdActiveCount.textContent = String(active);
    // Each region's school/advisor tracker renders into the slot inside its own
    // timeline panel (HK / TW) or region column (EU), so the roster lines up
    // with the panel above it.
    regions.forEach((region) => {
      const slot = document.querySelector(`[data-region-slot="${region.id}"]`);
      if (!slot) return;
      const advisorTotal = region.schools.reduce((count, school) => count + school.advisors.length, 0);
      slot.innerHTML = `
        <div class="phd-region-tracker-head">
          <h3>导师追踪</h3>
          <span>${region.schools.length} 所 · ${advisorTotal} 位导师</span>
        </div>
        <div class="phd-school-list">
          ${region.schools.length ? region.schools.map((school) => renderPhdSchool(region, school)).join("") : '<p class="phd-region-empty">尚未加入学校。可在下方新增第一所。</p>'}
        </div>
        <form class="phd-add-school" data-add-phd-school="${safeAttr(region.id)}">
          <label><span>新增学校／机构</span><input name="schoolName" type="text" placeholder="输入学校名称" required /></label>
          <button type="submit">＋ 添加学校</button>
        </form>
      `;
    });
  }

  function renderPhdSchool(region, school) {
    return `
      <article class="phd-school" data-phd-school="${safeAttr(school.id)}">
        <header class="phd-school-header">
          <label><span>学校／机构</span><input data-phd-school-name="true" data-region-id="${safeAttr(region.id)}" data-school-id="${safeAttr(school.id)}" value="${safeAttr(school.name)}" aria-label="学校名称" /></label>
          <span>${school.advisors.length} 位导师</span>
          <button class="phd-delete-button" type="button" data-delete-phd-school="${safeAttr(school.id)}" data-region-id="${safeAttr(region.id)}">删除学校</button>
        </header>
        <div class="phd-advisor-table">
          <div class="phd-advisor-table-head" aria-hidden="true"><span>导师</span><span>Email</span><span>对应 CV</span><span>状态</span><span></span></div>
          ${school.advisors.length ? school.advisors.map((advisor) => renderPhdAdvisor(region, school, advisor)).join("") : '<p class="phd-advisor-empty">还没有导师记录。</p>'}
        </div>
        <form class="phd-add-advisor" data-add-phd-advisor="${safeAttr(school.id)}" data-region-id="${safeAttr(region.id)}">
          <label><span>导师姓名</span><input name="advisorName" type="text" placeholder="Professor name" required /></label>
          <label><span>Email</span><input name="advisorEmail" type="email" placeholder="name@university.edu" /></label>
          <button type="submit">＋ 添加导师</button>
        </form>
      </article>
    `;
  }

  function renderPhdAdvisor(region, school, advisor) {
    const common = `data-region-id="${safeAttr(region.id)}" data-school-id="${safeAttr(school.id)}" data-advisor-id="${safeAttr(advisor.id)}"`;
    return `
      <div class="phd-advisor-row">
        <label><span>导师</span><input ${common} data-phd-advisor-field="name" value="${safeAttr(advisor.name)}" placeholder="Professor name" aria-label="导师姓名" /></label>
        <label><span>Email</span><input ${common} data-phd-advisor-field="email" type="email" value="${safeAttr(advisor.email)}" placeholder="name@university.edu" aria-label="导师 Email" /></label>
        <label class="phd-cv-check"><input ${common} data-phd-advisor-cv="true" type="checkbox"${advisor.cvDone ? " checked" : ""} /><span>${advisor.cvDone ? "✓ 已完成" : "○ 未完成"}</span></label>
        <label><span>状态</span><select ${common} data-phd-advisor-status="true" aria-label="申请状态">${PHD_APPLICATION_STATUSES.map((status) => `<option${status === advisor.status ? " selected" : ""}>${safe(status)}</option>`).join("")}</select></label>
        <button class="phd-delete-button advisor" type="button" ${common} data-delete-phd-advisor="true" aria-label="删除 ${safeAttr(advisor.name || "导师")}">删除</button>
      </div>
    `;
  }

  function addPhdSchool(form) {
    const region = state.phdTracker.regions.find((item) => item.id === form.dataset.addPhdSchool);
    const name = new FormData(form).get("schoolName")?.trim();
    if (!region || !name) return;
    region.schools.push({ id: makePhdId("school"), name, advisors: [] });
    form.reset();
    saveState();
    renderPhdTracker();
    showSaved("学校已添加");
  }

  function addPhdAdvisor(form) {
    const school = findPhdSchool(form.dataset.regionId, form.dataset.addPhdAdvisor);
    const formData = new FormData(form);
    const name = formData.get("advisorName")?.trim();
    const email = formData.get("advisorEmail")?.trim() || "";
    if (!school || !name) return;
    school.advisors.push({ id: makePhdId("advisor"), name, email, cvDone: false, status: "研究中" });
    form.reset();
    saveState();
    renderPhdTracker();
    showSaved("导师已添加");
  }

  function updatePhdTextField(target) {
    if (target.matches("[data-phd-school-name]")) {
      const school = findPhdSchool(target.dataset.regionId, target.dataset.schoolId);
      if (!school) return;
      school.name = target.value;
      saveState();
      return;
    }
    if (!target.matches("[data-phd-advisor-field]")) return;
    const advisor = findPhdAdvisor(target.dataset.regionId, target.dataset.schoolId, target.dataset.advisorId);
    if (!advisor) return;
    advisor[target.dataset.phdAdvisorField] = target.value;
    saveState();
  }

  function updatePhdControl(target) {
    if (target.matches("[data-phd-school-name]")) {
      const school = findPhdSchool(target.dataset.regionId, target.dataset.schoolId);
      if (!school) return;
      school.name = target.value.trim() || "未命名学校";
      saveState();
      renderPhdTracker();
      return;
    }
    const advisor = findPhdAdvisor(target.dataset.regionId, target.dataset.schoolId, target.dataset.advisorId);
    if (!advisor) return;
    if (target.matches("[data-phd-advisor-cv]")) advisor.cvDone = target.checked;
    if (target.matches("[data-phd-advisor-status]")) advisor.status = target.value;
    saveState();
    renderPhdTracker();
  }

  function deletePhdAdvisor(button) {
    const school = findPhdSchool(button.dataset.regionId, button.dataset.schoolId);
    const advisor = findPhdAdvisor(button.dataset.regionId, button.dataset.schoolId, button.dataset.advisorId);
    if (!school || !advisor || !window.confirm(`要删除导师「${advisor.name || "未命名"}」吗？`)) return;
    school.advisors = school.advisors.filter((item) => item.id !== advisor.id);
    saveState();
    renderPhdTracker();
    showSaved("导师已删除");
  }

  function deletePhdSchool(button) {
    const region = state.phdTracker.regions.find((item) => item.id === button.dataset.regionId);
    const school = findPhdSchool(button.dataset.regionId, button.dataset.deletePhdSchool);
    if (!region || !school || !window.confirm(`要删除「${school.name || "未命名学校"}」和其中的 ${school.advisors.length} 位导师吗？`)) return;
    region.schools = region.schools.filter((item) => item.id !== school.id);
    saveState();
    renderPhdTracker();
    showSaved("学校已删除");
  }

  function findPhdSchool(regionId, schoolId) {
    return state.phdTracker?.regions.find((region) => region.id === regionId)?.schools.find((school) => school.id === schoolId);
  }

  function findPhdAdvisor(regionId, schoolId, advisorId) {
    return findPhdSchool(regionId, schoolId)?.advisors.find((advisor) => advisor.id === advisorId);
  }

  function makePhdId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function renderCalendar() {
    el.monthTitle.textContent = monthLabel(visibleMonth);
    renderTestBankStatus();
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
      const trainingItems = trainingItemsForPlan(plan);
      const missingIelts = missingTasksForDate(iso).some((task) => task.kind === "ielts");
      const scheduledIelts = [...scheduledTaskIds(iso)].some((taskId) => taskId.includes(":ielts"));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day-cell";
      button.classList.toggle("paper-day", trainingItems.length > 0);
      button.classList.toggle("outside", iso.slice(0, 7) !== visibleMonth);
      button.classList.toggle("selected", iso === selectedDate);
      button.classList.toggle("today", iso === calendarToday);
      button.classList.toggle("exam-day", isExamDay(plan));
      if (iso === calendarToday) button.setAttribute("aria-current", "date");
      button.classList.toggle("has-warning", trainingItems.length > 0 && missingIelts);
      button.classList.toggle("has-done", trainingItems.length > 0 && scheduledIelts);
      button.classList.toggle("day-complete", trainingItems.length > 0 && isDayFullySaved(iso));
      button.innerHTML = `
        <span class="day-num">${current.getDate()}${trainingItems.length > 0 && missingIelts ? '<i class="warning-dot"></i>' : ""}</span>
        <span class="day-meta">${trainingItems.length ? renderTrainingItemsMarkup(trainingItems, { compact: true }) : ""}</span>
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

  function renderTestBankStatus() {
    const bank = data.testBank || {};
    const scheduled = Number(bank.scheduled || 0);
    const total = Number(bank.total || 0);
    const remaining = Array.isArray(bank.remainingCodes) ? bank.remainingCodes : [];
    const retakes = Array.isArray(bank.retakeCodes) ? bank.retakeCodes : [];
    el.testBankProgress.textContent = `${scheduled} / ${total} 已排`;
    if (!remaining.length) {
      el.testBankRemaining.textContent = retakes.length
        ? `全部真题已排；考前重做 ${retakes.join("、")}。`
        : "全部真题都已排入日历。";
      return;
    }
    el.testBankRemaining.textContent = `依目前周规则，考试前尚余 ${remaining.length} 份：${remaining.join("、")}。`;
  }

  function renderSelectedDay() {
    const plan = mainByDate.get(selectedDate) || {};
    const template = dailyByDate.get(selectedDate) || {};
    const trainingItems = trainingItemsForPlan(plan);
    const displayItems = trainingItemsForPlan(plan, { includeOptional: true });
    el.selectedDayType.innerHTML = `${formatDate(selectedDate)} ${tagForDay(normalizedDayType(plan))}`;
    el.selectedDateTitle.textContent = `${plan.weekday || template.weekday || ""} ${trainingItems.length ? `${trainingItems.length}份 IELTS 训练` : plan.ieltsPlan || template.mainTask || "自由计划"}`;
    el.summaryIelts.textContent = trainingItems.length ? `${trainingItems.length}份 IELTS 训练` : plan.ieltsPlan || "无";
    if (displayItems.length) {
      el.summaryIeltsDetail.innerHTML = renderTrainingItemsMarkup(displayItems, { toggleDate: selectedDate });
      bindOptionalToggles(el.summaryIeltsDetail);
    } else {
      el.summaryIeltsDetail.textContent = [plan.ieltsModule, plan.cambridge].filter(Boolean).join(" / ");
    }
    el.summaryProjectType.textContent = normalizedProjectType(plan) || "无";
    el.summaryProject.textContent = projectSummaryText(plan, selectedDate) || template.notes || "今天没有实验专案/学务主任务。";
    el.summaryStatus.textContent = getPlanOverride(selectedDate, "status") || plan.status || "未开始";
    el.summaryLimits.textContent = plan.limits || template.notes || "";

    renderVocabulary();
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

  function isOptionalOn(date) {
    return Boolean(state.optionalPools?.[date]);
  }

  function setOptionalOn(date, on) {
    if (!state.optionalPools) state.optionalPools = {};
    if (on) state.optionalPools[date] = true;
    else delete state.optionalPools[date];
    saveState();
  }

  // Optional (second-pool) items are only counted when that day is switched on.
  // Pass { includeOptional: true } to render the toggle for a disabled item.
  function trainingItemsForPlan(plan, options = {}) {
    const all = allTrainingItemsForPlan(plan);
    if (options.includeOptional) return all;
    return all.filter((item) => !item.optional || isOptionalOn(plan?.date));
  }

  function allTrainingItemsForPlan(plan) {
    if (!plan || isNoIeltsDay(plan)) return [];
    if (Array.isArray(plan.trainingItems) && plan.trainingItems.length) {
      return plan.trainingItems.map((item, index) => normalizeTrainingItem(item, index));
    }
    const codes = String(plan.cambridge || "")
      .split(/\s*\+\s*/)
      .map((code) => code.trim())
      .filter(Boolean);
    if (!codes.length) return [];
    const planParts = String(plan.ieltsPlan || "")
      .split(/\s*\/\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    return codes.map((code, index) => {
      const kind = kindForCambridgeCode(code);
      const label = labelForTrainingKind(kind);
      const full = fullFromCambridgeCode(code);
      const title = planParts[index] || `${label} ${full}`;
      return normalizeTrainingItem({
        id: `${kind}-${code}`,
        order: index + 1,
        kind,
        label,
        title,
        cambridge: code,
        full,
        module: [title, plan.ieltsModule].filter(Boolean).join("："),
        duration: "",
        detail: "",
      }, index);
    });
  }

  function normalizeTrainingItem(item, index) {
    const code = item.cambridge || item.code || "";
    const kind = item.kind || kindForCambridgeCode(code);
    const label = item.label || labelForTrainingKind(kind);
    const full = item.full || fullFromCambridgeCode(code);
    const title = item.title || `${label} ${full}`.trim();
    return {
      id: item.id || `${kind}-${code || index + 1}`,
      order: item.order || index + 1,
      kind,
      label,
      title,
      cambridge: code,
      full,
      module: item.module || item.detail || title,
      duration: item.duration || "",
      detail: item.detail || "",
      status: item.status || "未开始",
      optional: Boolean(item.optional),
      preferredHour: Number.isInteger(item.preferredHour) ? item.preferredHour : null,
      blockHours: item.blockHours || 1,
    };
  }

  function kindForCambridgeCode(code) {
    const book = Number(String(code).match(/^C(\d+)T/)?.[1] || 0);
    if (book >= 16) return "full";
    if (book >= 12) return "mixed";
    return "supplement";
  }

  function labelForTrainingKind(kind) {
    if (kind === "exam") return "正式考试";
    if (kind === "full") return "完整模考";
    if (kind === "mixed") return "混合训练";
    if (kind === "supplement") return "专项补量";
    return "IELTS";
  }

  function fullFromCambridgeCode(code) {
    const match = String(code).match(/^C(\d+)T(\d+)$/);
    return match ? `Cambridge ${match[1]} Test ${match[2]}` : code;
  }

  function renderTrainingItemsMarkup(items, options = {}) {
    const compact = Boolean(options.compact);
    if (compact) {
      return `<span class="calendar-training-strip">${items.map((item) => `
        <span class="calendar-training-block ${safeAttr(item.kind)}" title="${safeAttr(item.title)}">
          ${safe(item.cambridge || item.full || item.title)}
        </span>
      `).join("")}</span>`;
    }
    const toggleDate = options.toggleDate || "";
    return `<span class="training-item-list">${items.map((item) => {
      const on = !item.optional || isOptionalOn(toggleDate);
      const toggle = item.optional && toggleDate
        ? `<label class="training-toggle"><input type="checkbox" class="optional-toggle" data-date="${safeAttr(toggleDate)}"${on ? " checked" : ""} /><span>选做</span></label>`
        : "";
      return `
      <span class="training-item ${safeAttr(item.kind)}${item.optional && !on ? " optional-off" : ""}">
        <span class="training-kind">${toggle}${safe(item.label)}</span>
        <span class="training-title">${safe(item.title)}</span>
        ${!item.duration ? "" : `<span class="training-duration">${safe(item.duration)}</span>`}
      </span>`;
    }).join("")}</span>`;
  }

  function bindOptionalToggles(root) {
    root.querySelectorAll(".optional-toggle").forEach((box) => {
      box.addEventListener("change", () => {
        setOptionalOn(box.dataset.date, box.checked);
        renderAll();
        showSaved(box.checked ? "已开启选做" : "已关闭选做");
      });
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
      const trainingItems = trainingItemsForPlan(item, { includeOptional: true });
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
            ${["正常", "考试日", "休息"].map((type) => `<option value="${type}">${type}</option>`).join("")}
          </select>
        </td>
        <td class="project-cell" data-label="实验专案 / 学务">
          <select class="plan-edit-input project-type-select" data-field="projectType" data-date="${safeAttr(item.date)}">
            ${(isRestDay(item) ? ["休息"] : ["", "实验专案", "学务"]).map((type) => `<option value="${type}">${type || "未安排"}</option>`).join("")}
          </select>
          <div class="project-planner-slot">${projectPlannerMarkup(item)}</div>
        </td>
        <td data-label="IELTS / 模块">
          ${trainingItems.length ? renderTrainingItemsMarkup(trainingItems, { toggleDate: item.date }) : ""}
          <textarea class="plan-edit-textarea ${trainingItems.length ? "visually-hidden-field" : ""}" data-field="ieltsPlan" data-date="${safeAttr(item.date)}" placeholder="IELTS">${safe(item.ieltsPlan || "")}</textarea>
          <textarea class="plan-edit-textarea ${trainingItems.length ? "visually-hidden-field" : ""}" data-field="ieltsModule" data-date="${safeAttr(item.date)}" placeholder="模块">${safe(item.ieltsModule || "")}</textarea>
          <input class="plan-edit-input ${trainingItems.length ? "visually-hidden-field" : ""}" data-field="cambridge" data-date="${safeAttr(item.date)}" value="${safeAttr(item.cambridge || "")}" placeholder="Cambridge进度" />
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

      bindOptionalToggles(row);

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
    el.planWarningStrip.textContent = !mainPlan.length
      ? "旧 IELTS 日期与安排已清空。点击“延伸7天”建立第一批空白日期。"
      : warningCount
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
      let hour = task.preferredHour ?? taskHours[task.kind] ?? Math.min(23, 9 + index);
      while (usedHours.has(hour) && hour < 23) hour += 1;
      for (let offset = 0; offset < (task.blockHours || 1) && hour + offset <= 23; offset += 1) {
        if (usedHours.has(hour + offset)) continue;
        usedHours.add(hour + offset);
        setSlot(date, hour + offset, { text: task.text, taskId: task.id });
      }
    });
  }

  function tasksForDate(date) {
    const plan = mainByDate.get(date);
    const template = dailyByDate.get(date);
    const tasks = [];
    const noIelts = isNoIeltsDay(plan);
    const trainingItems = trainingItemsForPlan(plan);
    if (plan && !noIelts) {
      if (trainingItems.length) {
        trainingItems.forEach((item) => {
          tasks.push({
            id: `${date}:ielts:${item.id}`,
            kind: "ielts",
            preferredHour: item.preferredHour,
            blockHours: item.blockHours,
            label: `${item.label}｜${item.title}`,
            text: [item.title, item.module, item.cambridge, item.duration ? `用时：${item.duration}` : ""].filter(Boolean).join(" - "),
            keywords: [item.title, item.cambridge, item.label, "IELTS"].filter(Boolean),
          });
        });
      } else {
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
    if (!trainingItems.length && template?.mainTask && !isRestText(template.mainTask) && !tasks.some((task) => task.text.includes(template.mainTask))) {
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
    if (plan.projectPlan) return plan.projectPlan;
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
    let cursor = mainPlan.at(-1)?.date || addDays(isoToday(), -1);
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
    el.dateRangeLabel.textContent = planRangeLabel();
    el.planRangeTitle.textContent = planRangeLabel();
  }

  function renderVocabulary() {
    const cards = vocabularyCardsForDate(selectedDate);
    const total = allVocabularyCards().length;
    el.vocabularyDate.textContent = `${formatDate(selectedDate)} · ${weekdayZh(selectedDate)}`;
    el.vocabularyCount.textContent = `${total} ${total === 1 ? "CARD" : "CARDS"}`;
    el.vocabularyDayCount.textContent = String(cards.length);
    el.vocabularyButton.textContent = cards.length ? `单词卡 · ${cards.length}` : "单词卡";
    el.vocabularyGrid.innerHTML = cards.map((card) => vocabularyCardMarkup(card, selectedDate)).join("");
    el.vocabularyEmpty.hidden = cards.length > 0;
    renderWeeklyVocabulary();
    hydrateMissingVocabularyTranslations();
  }

  function addVocabularyCard(date, rawText, rawTranslation) {
    const text = `${rawText || ""}`.trim().replace(/\s+/g, " ");
    const translation = `${rawTranslation || ""}`.trim().replace(/\s+/g, " ");
    if (!text) {
      showSaved("请输入英文单词或短语");
      el.vocabularyInput.focus();
      return;
    }
    if (/[^\x20-\x7E]/.test(text)) {
      showSaved("卡片仅接受英文内容");
      el.vocabularyInput.focus();
      return;
    }
    if (!translation) {
      showSaved("请输入中文翻译");
      el.vocabularyTranslationInput.focus();
      return;
    }
    if (!/[\u3400-\u9fff]/.test(translation)) {
      showSaved("中文翻译中需要包含中文");
      el.vocabularyTranslationInput.focus();
      return;
    }
    const cards = vocabularyCardsForDate(date);
    if (cards.some((card) => card.text.toLowerCase() === text.toLowerCase())) {
      showSaved("这张卡片今天已经存在");
      return;
    }
    if (!state.vocabularyCards) state.vocabularyCards = {};
    if (!state.vocabularyCards[date]) state.vocabularyCards[date] = [];
    state.vocabularyCards[date].push({
      id: `vocab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      translation,
      createdAt: new Date().toISOString(),
    });
    el.vocabularyInput.value = "";
    el.vocabularyTranslationInput.value = "";
    saveState();
    renderVocabulary();
    showSaved("中英文卡片已保存");
  }

  function deleteVocabularyCard(date, cardId) {
    const cards = vocabularyCardsForDate(date).filter((card) => card.id !== cardId);
    if (cards.length) state.vocabularyCards[date] = cards;
    else delete state.vocabularyCards[date];
    saveState();
    renderVocabulary();
    showSaved("卡片已删除");
  }

  function vocabularyCardsForDate(date) {
    const cards = state.vocabularyCards?.[date];
    return Array.isArray(cards) ? cards : [];
  }

  function allVocabularyCards() {
    return Object.entries(state.vocabularyCards || {})
      .flatMap(([date, cards]) => (Array.isArray(cards) ? cards.map((card) => ({ ...card, date })) : []))
      .sort((a, b) => a.date.localeCompare(b.date) || `${a.createdAt || ""}`.localeCompare(`${b.createdAt || ""}`));
  }

  function vocabularyCardMarkup(card, date) {
    const translation = `${card.translation || ""}`.trim();
    return `
      <article class="word-card">
        <button class="word-card-flip" type="button" data-flip-vocabulary="${safeAttr(card.id)}" aria-pressed="false" aria-label="显示中文翻译">
          <span class="word-card-inner">
            <span class="word-card-face word-card-front" lang="en" aria-hidden="false">${safe(card.text)}</span>
            <span class="word-card-face word-card-back" lang="zh-Hans" aria-hidden="true">${safe(translation || "中文翻译补充中…")}</span>
          </span>
        </button>
        <button class="word-card-delete" type="button" data-delete-vocabulary="${safeAttr(card.id)}" data-vocabulary-date="${safeAttr(date)}" aria-label="删除 ${safeAttr(card.text)}">×</button>
      </article>
    `;
  }

  const vocabularyTranslationAttempts = new Set();
  let vocabularyTranslationPromise = null;

  function hydrateMissingVocabularyTranslations() {
    if (vocabularyTranslationPromise) return;
    const missing = allVocabularyCards().filter((card) => {
      return card.text && !`${card.translation || ""}`.trim() && !vocabularyTranslationAttempts.has(card.id);
    });
    if (!missing.length) return;
    missing.forEach((card) => vocabularyTranslationAttempts.add(card.id));
    vocabularyTranslationPromise = translateVocabularyCards(missing).finally(() => {
      vocabularyTranslationPromise = null;
      hydrateMissingVocabularyTranslations();
    });
  }

  async function translateVocabularyCards(cards) {
    showSaved(`正在补全 ${cards.length} 张旧词卡的中文翻译…`);
    let translatedCount = 0;
    for (let index = 0; index < cards.length; index += 3) {
      const batch = cards.slice(index, index + 3);
      const translations = await Promise.all(batch.map((card) => translateVocabularyText(card.text)));
      batch.forEach((card, batchIndex) => {
        const translation = translations[batchIndex];
        if (!translation) return;
        const storedCard = state.vocabularyCards?.[card.date]?.find((candidate) => candidate.id === card.id);
        if (!storedCard || `${storedCard.translation || ""}`.trim()) return;
        storedCard.translation = translation;
        translatedCount += 1;
      });
    }
    if (!translatedCount) {
      showSaved("旧词卡翻译暂时无法自动补全，下次打开应用时会重试");
      return;
    }
    saveState();
    renderVocabulary();
    showSaved(`已补全 ${translatedCount} 张旧词卡的中文翻译`);
  }

  async function translateVocabularyText(text) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", text);
      url.searchParams.set("langpair", "en|zh-CN");
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return "";
      const result = await response.json();
      const translation = `${result.responseData?.translatedText || ""}`.trim();
      return /[\u3400-\u9fff]/.test(translation) ? translation : "";
    } catch {
      return "";
    } finally {
      window.clearTimeout(timer);
    }
  }

  function renderWeeklyVocabulary() {
    const isSunday = new Date(`${selectedDate}T00:00:00Z`).getUTCDay() === 0;
    el.weeklyVocabulary.hidden = !isSunday;
    if (!isSunday) {
      el.weeklyVocabularyCount.textContent = "0 CARDS";
      el.weeklyVocabularyGroups.innerHTML = "";
      return;
    }
    const cardsToReview = allVocabularyCards().filter((card) => card.date <= selectedDate);
    el.weeklyVocabularyCount.textContent = `${cardsToReview.length} ${cardsToReview.length === 1 ? "CARD" : "CARDS"}`;
    if (!cardsToReview.length) {
      el.weeklyVocabularyGroups.innerHTML = '<p class="week-empty">NO CARDS BEFORE THIS SUNDAY</p>';
      return;
    }
    const cardsByWeek = new Map();
    cardsToReview.forEach((card) => {
      const start = weekStartMonday(card.date);
      if (!cardsByWeek.has(start)) cardsByWeek.set(start, []);
      cardsByWeek.get(start).push(card);
    });
    el.weeklyVocabularyGroups.innerHTML = [...cardsByWeek.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([start, cards]) => {
      const end = addDays(start, 6);
      return `
        <section class="weekly-vocabulary-group">
          <header><div><span>WEEK OF ${englishDateLabel(start)}</span><small>${englishDateRange(start, end)}</small></div><strong>${cards.length} ${cards.length === 1 ? "CARD" : "CARDS"}</strong></header>
          <div class="weekly-card-grid">${cards.map((card) => vocabularyCardMarkup(card, card.date)).join("")}</div>
        </section>
      `;
    }).join("");
  }

  function weekStartMonday(date) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    return addDays(date, day === 0 ? -6 : 1 - day);
  }

  function englishDateRange(start, end) {
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `${formatter.format(new Date(`${start}T00:00:00Z`))} — ${formatter.format(new Date(`${end}T00:00:00Z`))}`.toUpperCase();
  }

  function englishDateLabel(date) {
    const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    return formatter.format(new Date(`${date}T00:00:00Z`)).toUpperCase();
  }

  function exportVocabularyCards() {
    const cards = allVocabularyCards();
    if (!cards.length) {
      showSaved("目前没有单词卡可以导出");
      return;
    }
    if (!window.VocabularyXlsx?.exportVocabulary) {
      showSaved("Excel 导出组件尚未载入");
      return;
    }
    window.VocabularyXlsx.exportVocabulary(cards, `vocabulary-cards-${isoToday()}.xlsx`);
    showSaved("Excel 已导出");
  }

  function scheduleCalendarDateRefresh() {
    window.setInterval(() => {
      const nextToday = isoToday();
      if (nextToday === calendarToday) return;
      calendarToday = nextToday;
      selectedDate = nextToday;
      visibleMonth = nextToday.slice(0, 7);
      renderCalendar();
      renderSelectedDay();
    }, 60000);
  }

  function planRangeLabel() {
    if (!mainPlan.length) return "IELTS 日期尚未安排";
    return `${formatDate(mainPlan[0]?.date)} - ${formatDate(mainPlan.at(-1)?.date)}`;
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      const normalized = normalizeState(parsed);
      localStorage.setItem(STATE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch {
      const normalized = normalizeState({});
      localStorage.setItem(STATE_KEY, JSON.stringify(normalized));
      return normalized;
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
      optionalPools: parsed.optionalPools || {},
      vocabularyCards: parsed.vocabularyCards || {},
      roadmap: {
        tasks: parsed.roadmap?.tasks || {},
        gates: parsed.roadmap?.gates || {},
        monthly: parsed.roadmap?.monthly || {},
      },
      phdTracker: normalizePhdTracker(parsed.phdTracker),
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
    candidate.modulePlans = candidate.modulePlans || {};
    Object.keys(candidate.modulePlans).forEach((date) => {
      if (date >= resetFromDate) delete candidate.modulePlans[date];
    });
    candidate.moduleCatalog ||= {};
    for (const item of data.projectCatalog || []) {
      candidate.moduleCatalog[item.module] ||= [];
      if (!candidate.moduleCatalog[item.module].some((existing) => existing.id === item.id)) {
        candidate.moduleCatalog[item.module].push({ ...item });
      }
    }
    for (const row of candidate.planRows) {
      if (row.projectItemId) candidate.modulePlans[row.date] = { itemId: row.projectItemId, selected: row.projectModule };
    }
    candidate.savedSlots = candidate.savedSlots || {};
    candidate.optionalPools = candidate.optionalPools || {};
    candidate.roadmap = candidate.roadmap || defaultRoadmapState();
    ensureAcademicCatalog(candidate);
    Object.keys(candidate.schedule || {}).forEach((date) => {
      if (date >= resetFromDate) delete candidate.schedule[date];
    });
    Object.keys(candidate.planOverrides || {}).forEach((date) => {
      if (date >= resetFromDate) delete candidate.planOverrides[date];
    });
    Object.keys(candidate.savedSlots || {}).forEach((date) => {
      if (date >= resetFromDate) delete candidate.savedSlots[date];
    });
    Object.keys(candidate.optionalPools || {}).forEach((date) => {
      if (date >= resetFromDate) delete candidate.optionalPools[date];
    });
    candidate.planVersion = planVersion;
    return candidate;
  }

  function defaultPhdTracker() {
    return {
      regions: PHD_REGION_PRESETS.map((preset) => ({
        id: preset.id,
        code: preset.code,
        name: preset.name,
        hint: preset.hint,
        schools: preset.schools.map((name, index) => ({
          id: `${preset.id}-school-${index + 1}`,
          name,
          advisors: [],
        })),
      })),
    };
  }

  function normalizePhdTracker(candidate) {
    const fallback = defaultPhdTracker();
    if (!Array.isArray(candidate?.regions)) return fallback;
    return {
      regions: PHD_REGION_PRESETS.map((preset) => {
        const incoming = candidate.regions.find((region) => region.id === preset.id);
        const defaultRegion = fallback.regions.find((region) => region.id === preset.id);
        const schools = Array.isArray(incoming?.schools) ? incoming.schools.map((school, schoolIndex) => ({
          id: `${school.id || `${preset.id}-school-${schoolIndex + 1}`}`,
          name: `${school.name || "未命名学校"}`,
          advisors: Array.isArray(school.advisors) ? school.advisors.map((advisor, advisorIndex) => ({
            id: `${advisor.id || `${preset.id}-advisor-${schoolIndex + 1}-${advisorIndex + 1}`}`,
            name: `${advisor.name || ""}`,
            email: `${advisor.email || ""}`,
            cvDone: Boolean(advisor.cvDone),
            status: PHD_APPLICATION_STATUSES.includes(advisor.status) ? advisor.status : "研究中",
          })) : [],
        })) : defaultRegion.schools;
        return { id: preset.id, code: preset.code, name: preset.name, hint: preset.hint, schools };
      }),
    };
  }

  function defaultRoadmapState() {
    return { tasks: {}, gates: {}, monthly: {} };
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
      selectedDate = isoToday();
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
        candidate.phdTracker?.regions?.some((region) => region.schools?.length) ||
        Object.keys(candidate.vocabularyCards || {}).length ||
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
    const type = dayType === "考试日" ? "考试日" : dayType === "休息" ? "休息" : "正常";
    let cls = "";
    if (type.includes("休息")) cls = "rest";
    if (type.includes("考试")) cls = "exam";
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
    if (isExamDay(row)) return "考试日";
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

  function isExamDay(row) {
    if (!row) return false;
    return /考试日|正式考试|IELTS 二战/.test(`${row.dayType || ""} ${row.ieltsPlan || ""}`);
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

  function daysUntil(iso) {
    const target = new Date(`${iso}T00:00:00`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.ceil((target.getTime() - today.getTime()) / 86400000);
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
