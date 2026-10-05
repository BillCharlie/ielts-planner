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
    { id: "a1", code: "A1", name: "HK Phase 1 · 无雅思先行", date: "2026-12-31", displayDate: "11—12月 · 套磁为主 · PolyU 可先送件", proof: "五校导师第一轮套磁已发出并记录回音；PolyU 申请已提交（英文成绩栏填预计取得日期），主 CV 与 research proposal 完成", pass: "12月底前完成 PolyU 送件与全部第一轮套磁；主动放弃 12/01 HKPFS 主轮，不算失败", miss: "没有雅思时不要硬投 CUHK／CityU：英文证明属必交材料，材料不全不予审查" },
    { id: "a4", code: "A4", name: "HK Phase 2 · 出分后主投", date: "2027-06-01", displayDate: "1月出分 · 3/31 CUHK · 4/30 HKU · 5/31 PolyU · 6/01 HKUST", proof: "12/19 雅思 overall 6.5 且各校小分达标；按校别完成正式申请、推荐信与补件", pass: "出分后两周内投 HKUST ECE 与 PolyU；分数够就赶 CUHK 3/31 clearing", miss: "小分不足先安排重考，改走 PolyU Jan 2028 entry（申请期至 2027/09/30）" },
    { id: "a2", code: "A2", name: "Europe PhD Pipeline", date: "2027-03-31", displayDate: "12月启动 · 12/15—2027/03 持续投递", proof: "建立 project vacancy 清单；每个职位都有对应 CV、motivation letter 与研究证据", pass: "12月起持续投递，1–3 月进入 technical interview", miss: "减少泛投，集中有 funding 与 fab access 的职位" },
    { id: "a3", code: "A3", name: "Taiwan PhD Ready", date: "2027-03-15", displayDate: "2月启动 · 3/15 内部备齐 · 3月下旬报名", proof: "116学年度博士考试入学：台大 NTU 电子所／阳明交大 NYCU 目标、CV、研究计划、成绩单与推荐信备齐", pass: "核对116正式简章；开放后两天内提交，并分别确认报名、材料、推荐信截止", miss: "按学校正式截止补齐；2027时程仍待公告，不沿用秋季甄试日期" },
  ];
  // 香港申请的固定日期节点。只种一次，之后可自行改日期或删除（见 PlanningTasks.seedMilestones）。
  // 阶段一（11—12月）不需要雅思；阶段二（出分后）才正式主投。
  const APPLICATION_MILESTONES = [
    { id: "hk:advisor-longlist", module: "application", lane: "HK", date: "2026-10-31", text: "五校导师长名单定稿：HKUST／PolyU／HKU／CUHK／CityU，各 2–4 位" },
    { id: "hk:mail-wave1", module: "application", lane: "HK", date: "2026-11-09", replaces: ["hk:mail-hkust"], text: "套磁第一梯队：HKU Yuhao Zhang、HKUST Kevin Chen（匹配 9.5，必投；先写 Yuhao Zhang）" },
    { id: "hk:mail-wave2", module: "application", lane: "HK", date: "2026-11-16", replaces: ["hk:mail-polyu-hku"], text: "套磁 HKUST 其余两位：Weijia Zhang（gate driver／PMIC）、Man Hoi Wong（device physics／epitaxy）" },
    { id: "hk:mail-wave3", module: "application", lane: "HK", date: "2026-11-23", replaces: ["hk:mail-cuhk-cityu"], text: "套磁第二／三梯队：PolyU Yi Zhang、CUHK Alex Leung（转型型：device→PMIC）" },
    { id: "hk:mail-wave4", module: "application", lane: "HK", date: "2026-11-30", text: "套磁第五间：CityU Siew Chong Tan、Kerui Li（切入点写 device→converter 映射，别写继续做 HEMT fabrication）" },
    { id: "hk:study-six", module: "application", lane: "HK", date: "2026-10-20", text: "按序拆 6 位导师：Yuhao Zhang→Kevin Chen→Weijia Zhang→Man Hoi Wong→Yi Zhang→Alex Leung（近5年论文→近2年主轴→current PhD topics→你能接哪条）" },
    { id: "hk:polyu-docs", module: "application", lane: "HK", date: "2026-11-30", text: "PolyU 送件材料备齐：主 CV、research proposal、成绩单、成果附件" },
    { id: "hk:hkpfs-skip", module: "application", lane: "HK", date: "2026-12-01", text: "HKPFS 主轮：本轮确认放弃，不送件（没有雅思冲不了，别打乱复习）" },
    { id: "hk:polyu-submit", module: "application", lane: "HK", date: "2026-12-07", text: "PolyU 正式提交：英文成绩栏填「预计 2026/12/19 应试」，争取 conditional offer" },
    { id: "hk:ielts-exam", module: "application", lane: "HK", date: "2026-12-19", text: "雅思二战：目标 overall 6.5（HKU 需四科 ≥6.0，HKUST 需各项 ≥5.5 且同场达标）" },
    { id: "hk:score-triage", module: "application", lane: "HK", date: "2027-01-08", text: "雅思出分分流：达标→投 HKUST／PolyU；未达标→订 2 月重考并锁 PolyU Jan 2028" },
    { id: "hk:submit-wave", module: "application", lane: "HK", date: "2027-01-18", text: "阶段二主投：HKUST ECE 与 PolyU（出分后两周内，两家都是 rolling）" },
    { id: "hk:cuhk-clearing", module: "application", lane: "HK", date: "2027-03-31", text: "CUHK EE clearing 截止：英文证明须于截止前上传，否则不予审查" },
    { id: "hk:hku-clearing", module: "application", lane: "HK", date: "2027-04-30", text: "HKU 第一 clearing 截止（第二 clearing 到 08/31，但建议有分再投）" },
    { id: "hk:polyu-deadline", module: "application", lane: "HK", date: "2027-05-31", text: "PolyU Sep 2027 截止；若已有 conditional offer，确认英文 condition 补交期限" },
    { id: "hk:hkust-deadline", module: "application", lane: "HK", date: "2027-06-01", text: "HKUST ECE 非本地截止；rolling admission，名额可能提前满" },
  ];
  const GATE_GANTT_MONTHS = ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04", "2027-05", "2027-06"];
  const RESEARCH_GANTT_BARS = [
    { gateId: "g1", start: "2026-09-07", end: "2026-10-14", lane: 1 },
    { gateId: "g2", start: "2026-10-15", end: "2026-12-15", lane: 1 },
    { gateId: "g3", start: "2026-12-16", end: "2027-03-31", lane: 1 },
    { gateId: "g4", start: "2027-04-01", end: "2027-05-31", lane: 1 },
  ];
  const APPLICATION_GANTT_BARS = [
    { gateId: "a1", start: "2026-11-01", end: "2026-12-31", lane: 1 },
    { gateId: "a4", start: "2027-01-05", end: "2027-06-01", lane: 1 },
    { gateId: "a2", start: "2026-12-01", end: "2027-03-31", lane: 2 },
    { gateId: "a3", start: "2027-02-01", end: "2027-04-30", lane: 3 },
  ];
  const GANTT_LANES = {
    research: ["制程", "TCAD", "Cadence"],
    external: ["IEDMS", "IWN", "ISPSD"],
    application: ["台湾", "HK", "欧洲"],
  };
  // Modules shared by the monthly Gantt (research view) and the 计划安排 board.
  // ielts has a single implicit lane (empty string).
  const PLAN_MODULES = [
    { key: "research", label: "研究主线", lanes: ["制程", "TCAD", "Cadence"] },
    { key: "ielts", label: "IELTS", lanes: [""] },
    { key: "external", label: "会议／论文", lanes: ["IEDMS", "IWN", "ISPSD"] },
    { key: "application", label: "PhD 申请", lanes: ["台湾", "HK", "欧洲"] },
  ];
  const ROADMAP_MONTHS = [
    ["2026/08", "Process R&D",
      { 制程: "Fin exposure / etch DOE 起步" },
      "二战改期 12/19；L/R 计时诊断",
      { IEDMS: "figure inventory 整理" },
      { HK: "四校导师长名单、CV v1" },
      "A / B 正常推进"],
    ["2026/09", "Recipe freeze",
      { 制程: "10/1 起 Raith 一周，10/8 起 EBeam Fin 实验三周", TCAD: "9/20 前完成含 AlN spacer 的 PGaN Emode 与普通 Dmode 基本 model IV 模拟" },
      "核心训练（听读写说）；按周表推进",
      { IEDMS: "9/15 出结果" },
      { HK: "完成五校导师长名单（HKUST／PolyU／HKU／CUHK／CityU）；核对 2027/28 各校普通轮与英文政策" },
      "G1 随实验顺延至 10/15"],
    ["2026/10", "Device launch",
      { 制程: "10 月中完成测试制程（Litho+Etch）；10 月底开始元件制程", TCAD: "依实际磊晶结构与氧化层厚度进一步模拟 PGaN Emode／Dmode（重点能带 + 导通电场）" },
      "维持训练；错题与口语素材整理",
      { IEDMS: "10/15–10/20 做海报；10/23 参加报告", IWN: "10/25–11/1 做海报" },
      { HK: "按导师套磁、修改各版 CV；确认各校普通轮截止（非 12/01 HKPFS）" },
      "A：正式 wafer 已开始"],
    ["2026/11", "Fabrication sprint",
      { 制程: "元件制程与第一批 Fin", TCAD: "开始模拟 BV" },
      "题库已刷完；转专项弱项与全真模考节奏",
      { IWN: "11/8–11/13 会议", ISPSD: "11/1 开始写稿；11/11 开放投稿；11/20 第一版给老师" },
      { HK: "阶段一：第一轮 email 联系；PolyU 先送件（英文栏填预计取得日期）" },
      "B 最晚延至 12 月"],
    ["2026/12", "First data",
      { 制程: "electrical measurement；C–V / Regrowth", Cadence: "Cadence 开始" },
      "12/19 二战考试；考后收尾",
      { ISPSD: "12/16 截稿" },
      { HK: "放弃 12/01 HKPFS 主轮；12/19 考雅思，改走 2027 春季普通轮", 欧洲: "12 月启动，建 project vacancy 清单" },
      "12/15 通过 G2"],
    ["2027/01", "Diagnose",
      { 制程: "分析第一批结果；重测异常 device", Cadence: "电路／版图推进" },
      "",
      {},
      { HK: "阶段二：雅思出分，两周内投 HKUST ECE 与 PolyU", 欧洲: "主投；technical interview", 台湾: "确认台大 NTU 电子所／阳明交大 NYCU 方向、材料清单" },
      "A：只做有限补实验"],
    ["2027/02", "Controlled iteration",
      { 制程: "第二轮 device／必要补测", TCAD: "TCAD–experiment comparison" },
      "",
      {},
      { 台湾: "推荐信与研究计划；检查 116 简章", 欧洲: "rolling positions", HK: "补件与面试；准备 CUHK clearing" },
      "A：实验开始 freeze"],
    ["2027/03", "Data freeze",
      { 制程: "主要 dataset 收敛" },
      "",
      { ISPSD: "论文投稿或接近投稿" },
      { 台湾: "3/15 内部备齐；3 月下旬考试入学报名（待公告）", HK: "3/31 CUHK clearing 截止（需雅思到位）" },
      "3/31 通过 G3，否则切 B"],
    ["2027/04", "Write",
      { 制程: "只补必要量测" },
      "",
      {},
      { 台湾: "4 月上旬报名收尾；4–5 月考试／口试（待公告）", HK: "4/30 HKU 第一 clearing 截止" },
      "A：写作主导；B：data 收敛"],
    ["2027/05", "Thesis ready",
      {},
      "",
      {},
      { 台湾: "5 月放榜与报到（待公告）；确定去向", HK: "5/31 PolyU 截止；6/01 HKUST ECE 截止" },
      "A 通过 G4；B 开始主写"],
    ["2027/06", "Defense prep", {}, "", {}, { 台湾: "签证／行政" }, "A：Defense ready；B：30–50%"],
    ["2027/07", "Plan A defense", {}, "", {}, { 台湾: "确认报到节点" }, "A：口试；B：Thesis 60–80%"],
    ["2027/08", "Target graduation", {}, "", {}, { 台湾: "若 A 成功则衔接 PhD" }, "A：目标毕业；B：Thesis final"],
    ["2027/09", "Buffer", {}, "", {}, {}, "B：Defense ready"],
    ["2027/10", "Plan B defense", {}, "", {}, {}, "B：硕士口试"],
    ["2027/11", "Conservative window", {}, "", {}, { 台湾: "PhD 衔接" }, "B：目标毕业"],
    ["2027/12", "Final buffer", {}, "", {}, {}, "B：最晚毕业窗口"],
  ];
  const PHD_REGION_PRESETS = [
    { id: "hk", code: "HK", name: "香港", hint: "集中式 PhD 申请与导师联系", schools: ["HKUST", "HKU", "PolyU", "CUHK", "CityU"] },
    { id: "tw", code: "TW", name: "台湾", hint: "学校招生规则与导师意愿并行确认", schools: ["NTU", "NYCU"] },
    { id: "eu", code: "EU", name: "欧洲", hint: "以导师、实验室或 project vacancy 为单位", schools: ["KU Leuven / imec", "TU Delft", "EPFL", "Fraunhofer IISB"] },
  ];
  // 研究链：多通道／Tri-gate GaN HEMT → p-GaN reliability → device design/TCAD/fabrication
  // → gate driver / PMIC → 48→24 V DC-DC。匹配度按这条链判断，不是只看「有没有做 GaN」。
  // studyOrder 1–6 是建议逐个拆论文的顺序；只种一次，之后可自行改或删（见 seedPhdAdvisors）。
  const PHD_ADVISOR_SEEDS = [
    { id: "hk-adv-hku-yuhao", school: "HKU", name: "Yuhao Zhang 张宇昊", tier: "S+", match: "9.5", studyOrder: 1,
      focus: "multi-channel GaN、Fin power transistor、device physics、reliability、ML-assisted co-design",
      note: "最对味：MC²-HEMT 本身就是 multi-channel AlGaN/GaN power switch。切入角度写 multi-channel 架构＋physics-constrained TCAD＋reliability →低压功率转换，别写 I am interested in GaN devices。注意他近期往 vertical GaN／Ga₂O₃／UWBG 高压延伸，未必照做低压 p-GaN —— 这点值得直接问。",
      url: "https://ece.hku.hk/people/y-zhang/" },
    { id: "hk-adv-hkust-kevin", school: "HKUST", name: "Kevin J. Chen 陈敬", tier: "S+", match: "9.5", studyOrder: 2,
      focus: "GaN power HEMT、E-mode、MIS-HEMT、gate dielectric reliability、power device & IC",
      note: "p-GaN／E-mode／MIS-HEMT／multi-channel 他全部看得懂，就是核心领域。你的牌不是「我会 Sentaurus」，而是能独立走完 concept→TCAD→mask/process→fabrication→characterization 整个回路。HKUST 有 NFF 自有产线。",
      url: "https://ece.hkust.edu.hk/eekjchen" },
    { id: "hk-adv-hkust-weijia", school: "HKUST", name: "Weijia Zhang 张薇葭", tier: "S", match: "9", studyOrder: 3,
      focus: "power IC design、gate driver for power switch、integrated DC-DC、smart gate driver IC、WBG application",
      note: "几乎就是你博士后半段本身（gate driver→PMIC→48→24V）。2025 才加入 HKUST。若单独跟她做，要先确认能否保留相当比例的 device-level research，还是主要做 PMIC／driver。",
      url: "https://ece.hkust.edu.hk/eewjzhang" },
    { id: "hk-adv-hkust-manhoi", school: "HKUST", name: "Man Hoi Wong 黄文海", tier: "S", match: "8.5", studyOrder: 4,
      focus: "III-Nitride／UWBG oxide device、semiconductor epitaxy、process integration、fundamental device phenomena",
      note: "想回答「为什么这个 multi-channel／p-GaN 结构有这个电场」「defect／interface／polarization／process 怎么影响 device physics」才找他。与 Kevin Chen 的差别：他偏 materials＋device physics＋epitaxy＋新架构。",
      url: "https://ece.hkust.edu.hk/eemhwong" },
    { id: "hk-adv-polyu-yizhang", school: "PolyU", name: "Yi Zhang 张毅", tier: "A+", match: "8", studyOrder: 5,
      focus: "SiC/GaN power semiconductor reliability、failure analysis、packaging、thermal、AI-enabled diagnostics",
      note: "官方正在招 PhD/MPhil/Postdoc。若博士第一部分定成 p-GaN gate degradation／dynamic Ron／gate reliability 很合。但他主轴是 device→reliability→package→system，不是 transistor architecture＋fabrication；若你仍想自己刻 HEMT、改 epitaxy/gate structure，优先级低于 HKUST/HKU。",
      url: "https://research.polyu.edu.hk/en/persons/yi-zhang-2/" },
    { id: "hk-adv-cuhk-alex", school: "CUHK", name: "Alex Ka Nang Leung 梁加能", tier: "A", match: "9（转型）/ 5（device 延续）", studyOrder: 6,
      focus: "power-management IC、analog IC、24/48 V-to-1 V dual-phase hybrid DC-DC",
      note: "CUHK 里最值得看的人。不做 GaN HEMT fabrication，但正好接上你本科 Analog IC＋要恢复的 Cadence。故事直接讲：硕士做 GaN power device，博士希望用已有 device background 往 power-management IC／device-circuit co-design 延伸。",
      url: "https://www.ee.cuhk.edu.hk/zh-tw/people/academic-staff/professors/prof-ka-nang-alex-leung" },
    { id: "hk-adv-cityu-tan", school: "CityU", name: "Siew Chong Tan 陈秀聪", tier: "A", match: "7.5", studyOrder: 0,
      focus: "power electronics、emerging power converters、power electronics control、EV charging",
      note: "Chair Professor，官方标示 Accepting PhD Students。别说「想继续做 p-GaN HEMT fabrication」，要说「有 device-level background，想研究 device characteristics／reliability 如何映射到高频 converter 设计」。",
      url: "https://scholars.cityu.edu.hk/en/persons/siewctan/" },
    { id: "hk-adv-cityu-kerui", school: "CityU", name: "Kerui Li 李恪睿", tier: "A−", match: "7", studyOrder: 0,
      focus: "power electronics、wireless power transfer、high-frequency power conversion、GaN switch application",
      note: "年轻 PI，官网明确写招 PhD 与 postdoc —— 比较容易成为核心学生、方向可塑性大。缺点是不做 GaN process／HEMT architecture 本身。",
      url: "https://www.cityu.edu.hk/stfprofile/kerui.li.htm" },
    { id: "hk-adv-hkust-yancheng", school: "HKUST", name: "Yan Cheng 成妍", tier: "B+", match: "待确认", studyOrder: 0,
      focus: "GaN power/RF device、wide-bandgap device & IC、power semiconductor reliability physics",
      note: "方向很准（做过 p-GaN gate HEMT reliability），但 2026 新任 Research Assistant Professor。各系对 RAP 能否担任 RPG primary supervisor 规则不同 —— 未确认资格前当作「值得写信交流／未来可能共同指导」，不要当唯一 supervisor。",
      url: "" },
    { id: "hk-adv-cuhk-anding", school: "CUHK", name: "Anding Zhu 祝安定", tier: "B", match: "4–5", studyOrder: 0,
      focus: "GaN MMIC、GaN power amplifier、CMOS-controlled GaN、RF/microwave、6G",
      note: "⚠️ 别被「GaN」骗：PA 的 power ≠ power electronics 的 power。他是 RF GaN MMIC／GHz PA／Doherty，和 switching HEMT（Vth/Ron/BV→DC-DC）是另一套学术社群。除非愿意转 RF GaN，否则不要因为名字有 GaN 就排前面。",
      url: "https://www.ee.cuhk.edu.hk/en-gb/people/academic-staff/professors/prof-zhu-anding" },
    { id: "tw-adv-nycu-tlwu", region: "tw", school: "NYCU", name: "吴添立 Tian-Li Wu", tier: "S+", match: "9.5", studyOrder: 7,
      email: "tlwu@nycu.edu.tw",
      focus: "p-GaN gate HEMT 可靠性、GaN MIS-HEMT Vth 不稳定与栅介质击穿、SiC MOSFET 可靠性、AI 辅助器件设计",
      note: "台湾这边与你研究链重叠最深的一位，甚至比部分港校老师更贴。WLab 四个方向里直接写着「AI-assisted semiconductor device designs」，正好接你 TCAD＋AI 那条线；近三年多篇 p-GaN gate 失效机制与 ΔVth trapping 分析，并与 imec（Posthuma／Decoutere）长期合作、有 200mm GaN-on-Si 产线成果。套磁可直接用你的双通道 Tri-gate TCAD→制程→量测全流程对话。email 取自 ICST 官网，寄之前再核一次。",
      url: "https://icst.nycu.edu.tw/" },
    { id: "tw-adv-nycu-ymli", region: "tw", school: "NYCU", name: "李义明 Yiming Li", tier: "S", match: "8.5", studyOrder: 8,
      focus: "器件模拟与 TCAD、统计变异分析、机器学习辅助器件设计、GAA nanosheet、AlGaN/GaN MIS-HEMT 建模",
      note: "纯模拟／建模路线，和你「AI+TCAD 优化」那半最合。GAA nanosheet 的多通道 Vth 统计建模思路可与你的双通道互相迁移；GaN 相关几篇（低温 Vth 稳定性、E-mode gate recess）他是共同作者而非通讯，主轴仍是 device simulation。⚠️ OpenAlex 把他和做钙钛矿／电池的同名人合并了，自己查论文时要筛掉不相干的。",
      url: "" },
  ];
  // 近三年代表作（2023/10 起），以 OpenAlex 查得的真实 DOI，优先顶刊顶会。
  // ★ = 与你研究链（多通道／p-GaN gate reliability）直接重叠，建议套磁前必读。
  // 注意：OpenAlex 的作者记录会把同名人合并，这里已剔除明显不属于该领域的条目。
  const PHD_ADVISOR_PAPERS = {
    "hk-adv-hku-yuhao": [
      { y: 2024, v: "IEEE TPEL", t: "Gate Robustness and Reliability of P-Gate GaN HEMT Evaluated by a Circuit Method", doi: "10.1109/tpel.2024.3355042", key: true },
      { y: 2024, v: "IEEE TPEL", t: "Gate Switching Lifetime of P-Gate GaN HEMT: Circuit Characterization and Generalized Model", doi: "10.1109/tpel.2024.3443709", key: true },
      { y: 2025, v: "IEEE EDL", t: "Enhancement-Mode GaN Monolithic Bidirectional Switch With Breakdown Voltage Over 3.3 kV", doi: "10.1109/led.2025.3539175" },
      { y: 2024, v: "IEDM", t: "10 kV, 250°C Operational, Enhancement-Mode Ga2O3 JFET with Charge-Balance and Hybrid-Drain Designs", doi: "10.1109/iedm50854.2024.10873432" },
      { y: 2025, v: "Nat. Rev. Electr. Eng.", t: "Wide-bandgap semiconductors and power electronics as pathways to carbon neutrality", doi: "10.1038/s44287-024-00135-5" },
    ],
    "hk-adv-hkust-kevin": [
      { y: 2024, v: "Appl. Phys. Lett.", t: "Suppressed gate leakage and enlarged gate over-drive window of E-mode p-GaN gate double channel HEMTs", doi: "10.1063/5.0233528", key: true },
      { y: 2023, v: "IEEE EDL", t: "Gate Characteristics of Enhancement-Mode Fully Depleted p-GaN Gate HEMT", doi: "10.1109/led.2023.3324011", key: true },
      { y: 2025, v: "IEEE T-ED", t: "Suppression of Drain-Bias-Induced VTH Instability in Schottky-Type p-GaN Gate HEMTs With Voltage Seatbelt", doi: "10.1109/ted.2025.3534168", key: true },
      { y: 2024, v: "Appl. Phys. Rev.", t: "Threshold voltage instability in III-nitride MIS-HEMTs: Characterization and interface engineering", doi: "10.1063/5.0179376" },
      { y: 2023, v: "IEEE T-ED", t: "GaN Power Integration Technology and Its Future Prospects", doi: "10.1109/ted.2023.3341053" },
    ],
    "hk-adv-hkust-manhoi": [
      { y: 2023, v: "IEEE T-ED", t: "Vertical β-Ga2O3 Power Transistors: Fundamentals, Designs, and Opportunities", doi: "10.1109/ted.2023.3328806" },
      { y: 2024, v: "Annu. Rev. Mater. Res.", t: "Beta-Gallium Oxide Material and Device Technologies", doi: "10.1146/annurev-matsci-080921-104058" },
      { y: 2024, v: "ISPSD", t: "1-kV β-Ga2O3 UMOSFET with Quasi-Inversion Nitrogen-Ion-Implanted Channel", doi: "10.1109/ispsd59661.2024.10579625" },
      { y: 2026, v: "IEEE EDL", t: "Mitigating the Dominance of Channel Resistance in β-Ga2O3 UMOSFETs via Cell Pitch Scaling", doi: "10.1109/led.2026.3656648" },
      { y: 2024, v: "Phys. Status Solidi A", t: "Design Strategy of Vertical GaN Power SBDs with p-GaN JTE and Selective p-Doping by Implantation", doi: "10.1002/pssa.202400082" },
    ],
    "hk-adv-polyu-yizhang": [
      { y: 2025, v: "IEEE TPEL", t: "Power Cycling Testing for Power Semiconductor Switches: Methods, Standards, Limitations, and Outlooks", doi: "10.1109/tpel.2025.3595180", key: true },
      { y: 2023, v: "IEEE TPEL", t: "gEOL: A Gradient-Based End-of-Life Criterion for Power Semiconductor Modules", doi: "10.1109/tpel.2023.3339342", key: true },
      { y: 2024, v: "IEEE TPEL", t: "A Thermal Network Model for Multichip Power Modules Enabling to Characterize the Thermal Coupling Effects", doi: "10.1109/tpel.2024.3355207" },
      { y: 2024, v: "IEEE TPEL", t: "Figures-of-Merit Study for Thermal Transient Measurement of SiC MOSFETs", doi: "10.1109/tpel.2024.3382891" },
      { y: 2025, v: "IEEE TIE", t: "An Active Learning Framework for Reliability-Oriented Power Electronics Design", doi: "10.1109/tie.2025.3577391" },
    ],
    "hk-adv-cuhk-alex": [
      { y: 2024, v: "ISSCC", t: "Li-ion-Battery-Input 1-to-6V-Output Bootstrap-Free Hybrid Buck-or-Boost Converter Without RHP Zero, 97.3% Peak Efficiency", doi: "10.1109/isscc49657.2024.10454342", key: true },
      { y: 2024, v: "IEEE JSSC", t: "A 2.8 μs Response Time 95.1% Efficiency Hybrid Boost Converter With RHP Zero Elimination", doi: "10.1109/jssc.2024.3376251" },
      { y: 2025, v: "IEEE JSSC", t: "A Hybrid Buck-or-Boost Converter for Fast-Transient and Wide-Voltage-Range Applications", doi: "10.1109/jssc.2024.3523914" },
      { y: 2024, v: "IEEE JSSC", t: "A High-Current-Efficiency Digital-Assisted Analog LDO With Dual-Biasing Mode for Near-Threshold Regulation", doi: "10.1109/jssc.2024.3486609" },
      { y: 2026, v: "CICC", t: "A 3–4.2V-to-Sub-1V Dual-Phase Multi-Path NLDO Sigma Converter, 1028 W/cm³ Power Density", doi: "10.1109/cicc65509.2026.11509495" },
    ],
    "hk-adv-cityu-kerui": [
      { y: 2024, v: "IEEE TPEL", t: "Multi-MHz Inductive and Capacitive Power Transfer Systems", doi: "10.1109/tpel.2024.3431226" },
      { y: 2024, v: "IEEE TPEL", t: "On the Limitations of the Coupled Mode Theory and Parity-Time Symmetry", doi: "10.1109/tpel.2024.3352918" },
      { y: 2024, v: "IEEE TPEL", t: "A Fast Front-End Monitoring Method for Mutual Inductance and Load", doi: "10.1109/tpel.2024.3464124" },
      { y: 2025, v: "IEEE TPEL", t: "Characterization and Modeling of Dual-Single-Layer PCB Coils", doi: "10.1109/tpel.2025.3580073" },
      { y: 2023, v: "IEEE TPEL", t: "An Ultrafast Estimation Method for Coupling Coefficient and Load", doi: "10.1109/tpel.2023.3348453" },
    ],
    "hk-adv-cuhk-anding": [
      { y: 2024, v: "IEEE T-MTT", t: "A Linearity-Improved 24–29-GHz GaN MMIC Doherty Power Amplifier", doi: "10.1109/tmtt.2024.3409944" },
      { y: 2025, v: "IEEE JSSC", t: "A 24–28-GHz Single-Chip GaN MMIC T/R Front-End Using Doherty PA as Embedded Switches", doi: "10.1109/jssc.2025.3599397" },
      { y: 2025, v: "IEEE T-MTT", t: "A Hybrid-Biased Dual-Band GaN MMIC Doherty Power Amplifier for 6G FR3", doi: "10.1109/tmtt.2025.3634158" },
      { y: 2024, v: "IEEE T-MTT", t: "A 26-GHz GaN MMIC Load-Modulated Balanced Amplifier With Miniaturized Dual-Loop Coupler", doi: "10.1109/tmtt.2024.3421941" },
      { y: 2023, v: "IEEE T-MTT", t: "Dual-Mode Three-Way Doherty Power Amplifier With Extended High-Efficiency Range", doi: "10.1109/tmtt.2023.3344431" },
    ],
    "tw-adv-nycu-tlwu": [
      { y: 2024, v: "IEEE T-ED", t: "Toward Understanding the Failure Mechanism in p-GaN Gate HEMTs Operating in Reverse Conduction Diode Mode", doi: "10.1109/ted.2024.3412095", key: true },
      { y: 2024, v: "IEEE T-ED", t: "A Self-Consistent Bayesian Deconvolution Approach for Trapping Time Constant Analysis: ΔVth Transients in p-GaN Gate Power HEMTs", doi: "10.1109/ted.2024.3354213", key: true },
      { y: 2024, v: "ISPSD", t: "200mm GaN-on-Si E-Mode Power HEMTs with Epitaxially Grown p-AlN/p-GaN Gate to Enhance Gate Reliability", doi: "10.1109/ispsd59661.2024.10579679", key: true },
      { y: 2024, v: "Sci. Rep.", t: "Using U-Net convolutional neural network to model pixel-based electrostatic potential distributions in GaN power MIS-HEMTs", doi: "10.1038/s41598-024-58112-9", key: true },
      { y: 2024, v: "Appl. Phys. Lett.", t: "Characterization and modeling of mobility, threshold voltage and subthreshold swing in p-GaN gate HEMTs at cryogenic temperatures", doi: "10.1063/5.0223576" },
    ],
    "tw-adv-nycu-ymli": [
      { y: 2024, v: "IEEE T-ED", t: "Threshold Voltage Stability in AlGaN/GaN MIS-HEMT Structure Under Cryogenic Environment", doi: "10.1109/ted.2024.3457581", key: true },
      { y: 2025, v: "IEEE EDL", t: "Damage-Free Neutral Beam Etching for Gate Recess in E-Mode AlGaN/GaN HEMTs", doi: "10.1109/led.2025.3548676", key: true },
      { y: 2024, v: "IEEE T-Nano", t: "Statistical Device Simulation and Machine Learning of Process Variation Effects of Vertically Stacked GAA Si Nanosheet CFETs", doi: "10.1109/tnano.2024.3390793", key: true },
      { y: 2023, v: "IEEE T-ED", t: "Nanosized-Metal-Grain-Pattern-Dependent Threshold-Voltage Models for Vertically Stacked Multichannel GAA Si Nanosheet MOSFETs", doi: "10.1109/ted.2023.3328586" },
      { y: 2024, v: "IEEE JEDS", t: "Mechanism of Threshold Voltage Instability in Double Gate α-IGZO Nanosheet TFT Under Bias and Temperature Stress", doi: "10.1109/jeds.2024.3406676" },
    ],
  };
  // 这三位查不到可靠的近三年 DOI 清单，原因写在各自卡片的备注里，不编造条目。
  const PHD_ADVISOR_NO_PAPERS = {
    "hk-adv-hkust-weijia": "2021–2025 在 Analog Devices 做 IC design，2025 才进学界，OpenAlex 查无作者记录。可查到的只有 ISPSD 2021/2022 三篇（smart gate driver for SiC、GaN IPM direct bond），已超出近三年。等她 HKUST 第一批产出再补。",
    "hk-adv-cityu-tan": "OpenAlex 的作者记录被拆碎（只剩 11 篇），无法可靠消歧，暂不列 DOI 以免张冠李戴。建议直接看 CityU scholars 页或 Google Scholar。",
    "hk-adv-hkust-yancheng": "2026 新任 RAP，尚无可稳定消歧的作者记录。建议直接向她本人或课题组页索取 publication list。",
  };
  const PHD_APPLICATION_STATUSES = ["研究中", "准备联系", "已联系", "待回复", "准备申请", "已送出", "面试", "Offer", "暂停"];
  const data = window.IELTS_PLANNER_DATA || { mainPlan: [], dailyTemplates: [] };
  const moves = window.IeltsMoves || {
    normalize: () => [],
    movedAway: () => [],
    movedInto: () => [],
    pending: () => [],
    itemsForDate: (_list, _date, items) => ({ kept: Array.isArray(items) ? items : [], incoming: [] }),
    cancel: (list) => list || [],
    place: (list) => list || [],
    restore: (list) => list || [],
  };
  ensurePlanningTaskRegionCompatibility();
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
  let serviceWorkerReloading = false;
  let highlightedPlanDate = "";
  let taskDatePicker = { taskId: "", visibleMonth: "", selected: new Set() };
  // IELTS reschedule picker: transient UI selection, never persisted.
  let rescheduleMode = false;
  const pickedTraining = new Map();
  const pickedPending = new Set();
  // 学校展开状态：纯 UI，不进存档。
  const openSchools = new Set();

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function ensurePlanningTaskRegionCompatibility() {
    const needsCompatibility = typeof PlanningTasks.lanesOf !== "function" || typeof PlanningTasks.setLanes !== "function" || typeof PlanningTasks.inLane !== "function";
    if (!needsCompatibility) return;
    const originalNormalize = PlanningTasks.normalize;
    const originalMigrate = PlanningTasks.migrate;
    PlanningTasks.lanesOf = (task) => {
      const source = Array.isArray(task?.lanes) ? task.lanes : [task?.lane];
      return [...new Set(source.map((lane) => String(lane || "")).filter(Boolean))].sort();
    };
    PlanningTasks.setLanes = (task, lanes) => {
      if (!task) return [];
      task.lanes = [...new Set((lanes || []).map((lane) => String(lane || "")).filter(Boolean))].sort();
      task.lane = task.lanes[0] || "";
      return task.lanes;
    };
    PlanningTasks.inLane = (task, lane) => {
      const lanes = PlanningTasks.lanesOf(task);
      return lanes.length ? lanes.includes(lane) : !lane;
    };
    PlanningTasks.normalize = (task) => {
      const normalized = originalNormalize(task);
      PlanningTasks.setLanes(normalized, PlanningTasks.lanesOf(task));
      return normalized;
    };
    PlanningTasks.migrate = (candidate, seeds) => {
      const savedLanes = new Map((candidate?.planningTasks || []).map((task) => [String(task.id), PlanningTasks.lanesOf(task)]));
      const migrated = originalMigrate(candidate, seeds);
      migrated.planningTasks?.forEach((task) => {
        if (savedLanes.has(String(task.id))) PlanningTasks.setLanes(task, savedLanes.get(String(task.id)));
      });
      return migrated;
    };
  }

  function init() {
    bindElements();
    bindAuth();
    bindNavigation();
    bindCalendarControls();
    bindPlanControls();
    bindRoadmapControls();
    bindTaskDatePicker();
    bindRescheduleControls();
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
      "dayPlanNodes",
      "ieltsReschedulePanel",
      "rescheduleToggle",
      "rescheduleBody",
      "reschedulePendingCount",
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
      "taskDateDialog",
      "taskDatePickerTitle",
      "taskDatePickerPrev",
      "taskDatePickerMonth",
      "taskDatePickerNext",
      "taskDatePickerGrid",
      "taskDatePickerCount",
      "taskDatePickerClear",
      "taskDatePickerApply",
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
    bindSharedPlanningControls();
  }

  function bindRoadmapControls() {
    el.roadmapResetButton.addEventListener("click", () => {
      if (!window.confirm("要把研究 Gate 和任务进度全部归零吗？PhD 申请追踪不会被清除。")) return;
      state.roadmap = defaultRoadmapState();
      state.planningTasks.forEach((task) => { task.done = false; });
      saveState();
      renderAll();
      showSaved("研究进度已归零");
    });

    el.roadmapGateGroups.addEventListener("change", (event) => {
      const input = event.target.closest("[data-roadmap-gate]");
      if (!input) return;
      state.roadmap.gates[input.dataset.roadmapGate] = input.checked;
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
      // summary/details must stay out of this: setPointerCapture below retargets
      // the following click to the container, so a captured <summary> never
      // toggles — the collapse looks dead to the user.
      if (event.target.closest("input, select, textarea, button, a, label, summary, details, .hk-timeline-scroll")) return;
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
    setView("calendar");
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
    if (isRoadmap) { renderRoadmap();  }
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
    const monthTasks = state.planningTasks.filter((task) => task.months.length || task.dates.length);
    const doneTasks = monthTasks.filter((task) => task.done).length;
    const nextGate = RESEARCH_GATES.find((gate) => !roadmap.gates[gate.id]) || RESEARCH_GATES.at(-1);
    const remaining = daysUntil(nextGate.date);
    el.roadmapTaskProgress.textContent = `${doneTasks} / ${monthTasks.length}`;
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
    const months = new Map(ROADMAP_MONTHS.map((row) => [row[0], row]));
    state.planningTasks.forEach((task) => {
      [...task.months, ...task.dates.map(PlanningTasks.monthOf)].forEach((month) => {
        if (!months.has(month)) months.set(month, [month, "", {}, "", {}, {}, ""]);
      });
    });
    const rows = [...months.values()].sort((a, b) => a[0].localeCompare(b[0]));
    el.roadmapTimelineBody.innerHTML = rows.map((row, index) => {
      const [year, month] = row[0].split("/");
      const monthNumber = Number(month);
      const yearBoundary = monthNumber === 1 ? " year-boundary" : "";
      return `
        <div class="vertical-gantt-row${yearBoundary}" role="row">
          <div class="vertical-gantt-time${index === 0 ? " first" : ""}${index === rows.length - 1 ? " last" : ""}" role="rowheader">
            <time datetime="${safeAttr(`${year}-${month}`)}"><b>${safe(year)}</b><strong>${safe(monthNames[monthNumber - 1])}</strong></time>
            <span class="roadmap-phase-tag">${safe(row[1])}</span>
            ${row[6] ? `<span class="vertical-gantt-grad">${safe(row[6])}</span>` : ""}
          </div>
          ${renderVerticalGanttCell(row[0], "research")}
          ${renderVerticalGanttCell(row[0], "ielts")}
          ${renderVerticalGanttCell(row[0], "external")}
          ${renderVerticalGanttCell(row[0], "application")}
        </div>
      `;
    }).join("");
  }

  function sharedLanes(module) {
    return [...new Set([...(GANTT_LANES[module] || [""]), ...state.planningTasks.filter((task) => task.module === module).flatMap(PlanningTasks.lanesOf)])];
  }

  function taskLaneLabel(task) {
    return PlanningTasks.lanesOf(task).join("／");
  }

  function applicationLanePicker(task) {
    const selected = PlanningTasks.lanesOf(task);
    const label = selected.length ? selected.join("／") : "未选择";
    return `<details class="shared-region-picker">
      <summary>地区 · ${safe(label)}</summary>
      <fieldset aria-label="选择地区或国家（可多选）">
        ${sharedLanes("application").map((lane) => `<label><input type="checkbox" data-shared-lane-option="${safeAttr(task.id)}" value="${safeAttr(lane)}"${selected.includes(lane) ? " checked" : ""} /><span>${safe(lane)}</span></label>`).join("")}
      </fieldset>
    </details>`;
  }

  function planningTaskMarkup(task, { date = "", library = false } = {}) {
    const dates = task.dates.map((value) => `<button type="button" class="shared-task-date" data-open-planning-date="${safeAttr(value)}">${safe(value.slice(5))}</button>`).join("");
    return `<div class="shared-task${task.done ? " complete" : ""}" data-shared-task="${safeAttr(task.id)}">
      <input type="checkbox" data-shared-done="${safeAttr(task.id)}" aria-label="完成 ${safeAttr(task.text)}"${task.done ? " checked" : ""} />
      <div class="shared-task-body">
        <textarea rows="2" data-shared-text="${safeAttr(task.id)}" aria-label="任务内容">${safe(task.text)}</textarea>
        ${task.module === "application" ? applicationLanePicker(task) : library ? `<select data-shared-lane="${safeAttr(task.id)}" aria-label="任务分栏">${sharedLanes(task.module).map((lane) => `<option value="${safeAttr(lane)}"${PlanningTasks.inLane(task, lane) ? " selected" : ""}>${safe(lane || "IELTS")}</option>`).join("")}</select>` : ""}
        ${dates ? `<div class="shared-task-dates">${dates}</div>` : ""}
        ${library ? `<button type="button" class="shared-date-picker-button" data-task-date-picker="${safeAttr(task.id)}">选择／管理日期${task.dates.length ? `（${task.dates.length}天）` : ""}</button>` : ""}
      </div>
      <button type="button" class="shared-remove" ${date ? `data-unassign-task="${safeAttr(task.id)}" data-date="${safeAttr(date)}" title="从当天移除" aria-label="从当天移除"` : `data-delete-task="${safeAttr(task.id)}" title="删除任务及其日期安排" aria-label="删除任务"`}>×</button>
    </div>`;
  }

  function planningAddForm(module, month = "") {
    const laneControl = module === "application"
      ? `<fieldset class="shared-add-regions"><legend>地区／国家（可多选）</legend>${sharedLanes(module).map((lane) => `<label><input type="checkbox" name="lanes" value="${safeAttr(lane)}" /><span>${safe(lane)}</span></label>`).join("")}</fieldset>`
      : `<select name="lane" aria-label="任务分栏">${sharedLanes(module).map((lane) => `<option value="${safeAttr(lane)}">${safe(lane || "IELTS")}</option>`).join("")}</select>`;
    return `<form class="shared-add-form" data-shared-add="${safeAttr(module)}" data-month="${safeAttr(month)}">
      ${laneControl}
      <input name="text" required aria-label="新任务" placeholder="新任务" />
      <button type="submit" title="添加任务" aria-label="添加任务">+</button>
    </form>`;
  }

  function renderVerticalGanttCell(month, track) {
    const tasks = PlanningTasks.forMonth(state.planningTasks, month, track);
    const lanes = sharedLanes(track);
    return `<div class="vertical-gantt-cell ${safeAttr(track)}" role="cell" data-planning-month="${safeAttr(month)}" data-planning-track="${safeAttr(track)}">
      ${lanes.map((lane) => {
        const entries = tasks.filter((task) => PlanningTasks.inLane(task, lane));
        return entries.length ? `<div class="shared-month-lane"><span class="vertical-gantt-lane-label">${safe(lane)}</span>${entries.map((task) => planningTaskMarkup(task)).join("")}</div>` : "";
      }).join("")}
      ${planningAddForm(track, month)}
    </div>`;
  }

  function datedPlanNodes(date) {
    return PlanningTasks.forDate(state.planningTasks, date);
  }

  function planModuleLabel(moduleKey) {
    return PLAN_MODULES.find((module) => module.key === moduleKey)?.label || moduleKey;
  }

  function sharedDayMarkup(date, module) {
    const tasks = PlanningTasks.forDate(state.planningTasks, date, module);
    const available = state.planningTasks.filter((task) => task.module === module && !task.dates.includes(date));
    return `<div class="shared-day-tasks" data-shared-day="${safeAttr(date)}" data-shared-track="${safeAttr(module)}">
      ${tasks.map((task) => planningTaskMarkup(task, { date })).join("")}
      <form class="shared-assign-form" data-day-assign="${safeAttr(date)}">
        <select name="taskId" required aria-label="选择${safeAttr(planModuleLabel(module))}任务"><option value="">选择任务</option>${available.map((task) => `<option value="${safeAttr(task.id)}">${safe(taskLaneLabel(task) ? taskLaneLabel(task) + " · " : "")}${safe(task.text)}</option>`).join("")}</select>
        <button type="submit" title="排入当天" aria-label="排入当天">+</button>
      </form>
      <form class="shared-add-form shared-day-add" data-shared-add="${safeAttr(module)}" data-day-date="${safeAttr(date)}">
        <select name="lane" aria-label="任务分栏">${sharedLanes(module).map((lane) => `<option value="${safeAttr(lane)}">${safe(lane || "IELTS")}</option>`).join("")}</select>
        <input name="text" required aria-label="新任务" placeholder="直接新增到当天" />
        <button type="submit" title="新增并排入当天" aria-label="新增并排入当天">+</button>
      </form>
    </div>`;
  }

  function ensurePlanningDate(date) {
    if (!mainByDate.has(date)) {
      mainPlan.push({ ...createBlankPlanRow(date), projectType: "", projectModule: "", projectPlan: "" });
      mainPlan.sort((a, b) => a.date.localeCompare(b.date));
      persistPlanRows();
      rebuildPlanIndexes();
    }
  }

  function updatePlanningSlots() {
    const byId = new Map(state.planningTasks.map((task) => [task.id, task]));
    Object.entries(state.schedule || {}).forEach(([date, slots]) => {
      Object.entries(slots).forEach(([hour, value]) => {
        const slot = normalizeSlot(value);
        const prefix = `${date}:planning:`;
        if (!slot.taskId.startsWith(prefix)) return;
        const task = byId.get(slot.taskId.slice(prefix.length));
        if (task?.dates.includes(date)) slots[hour] = { ...slot, text: [taskLaneLabel(task), task.text].filter(Boolean).join(" · ") };
        else { delete slots[hour]; delete state.savedSlots?.[date]?.[hour]; }
      });
    });
  }

  function refreshPlanning(except = null) {
    updatePlanningSlots();
    saveState();
    if (except !== el.moduleCatalog) renderModuleCatalog();
    if (except !== el.planTableBody) renderPlanTable();
    if (except !== el.roadmapTaskGroups) renderRoadmap();
    else renderRoadmapStats();
    renderCalendar();
    if (except !== el.dayPlanNodes) renderSelectedDay();
  }

  function openTaskDatePicker(taskId) {
    const task = state.planningTasks.find((item) => item.id === taskId);
    if (!task) return;
    const anchor = task.dates[0] || selectedDate || calendarToday;
    taskDatePicker = {
      taskId,
      visibleMonth: anchor.slice(0, 7),
      selected: new Set(task.dates),
    };
    el.taskDatePickerTitle.textContent = task.text;
    renderTaskDatePicker();
    el.taskDateDialog.showModal();
  }

  function renderTaskDatePicker() {
    const [year, month] = taskDatePicker.visibleMonth.split("-").map(Number);
    const firstDate = `${year}-${pad(month)}-01`;
    const mondayOffset = (new Date(`${firstDate}T00:00:00Z`).getUTCDay() + 6) % 7;
    const gridStart = addDays(firstDate, -mondayOffset);
    el.taskDatePickerMonth.textContent = `${year} 年 ${month} 月`;
    el.taskDatePickerCount.textContent = `已选 ${taskDatePicker.selected.size} 天`;
    el.taskDatePickerGrid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const selected = taskDatePicker.selected.has(date);
      const outside = !date.startsWith(taskDatePicker.visibleMonth);
      return `<button type="button" role="gridcell" data-task-picker-date="${safeAttr(date)}" aria-label="${safeAttr(formatDate(date))}" aria-pressed="${selected}" class="task-date-picker-day${selected ? " selected" : ""}${outside ? " outside" : ""}${date === calendarToday ? " today" : ""}"><span>${Number(date.slice(8))}</span></button>`;
    }).join("");
  }

  function moveTaskDatePickerMonth(offset) {
    const [year, month] = taskDatePicker.visibleMonth.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    taskDatePicker.visibleMonth = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
    renderTaskDatePicker();
  }

  function bindTaskDatePicker() {
    el.taskDatePickerPrev.addEventListener("click", () => moveTaskDatePickerMonth(-1));
    el.taskDatePickerNext.addEventListener("click", () => moveTaskDatePickerMonth(1));
    el.taskDatePickerClear.addEventListener("click", () => {
      taskDatePicker.selected.clear();
      renderTaskDatePicker();
    });
    el.taskDatePickerGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-task-picker-date]");
      if (!button) return;
      const date = button.dataset.taskPickerDate;
      if (taskDatePicker.selected.has(date)) taskDatePicker.selected.delete(date);
      else taskDatePicker.selected.add(date);
      renderTaskDatePicker();
    });
    el.taskDatePickerApply.addEventListener("click", () => {
      const task = state.planningTasks.find((item) => item.id === taskDatePicker.taskId);
      if (!task) return;
      const dates = PlanningTasks.setDates(task, [...taskDatePicker.selected]);
      dates.forEach(ensurePlanningDate);
      el.taskDateDialog.close();
      refreshPlanning();
      showSaved(dates.length ? `已同步 ${dates.length} 个日期` : "已清除日期安排");
    });
  }

  function bindSharedPlanningControls() {
    [el.moduleCatalog, el.planTableBody, el.roadmapTaskGroups, el.dayPlanNodes].filter(Boolean).forEach((container) => {
      container.addEventListener("submit", (event) => {
        const form = event.target;
        if (!form.matches(".shared-add-form, .shared-assign-form")) return;
        event.preventDefault();
        const fields = new FormData(form);
        if (form.dataset.sharedAdd) {
          const text = String(fields.get("text") || "").trim();
          if (!text) return;
          const lanes = form.dataset.sharedAdd === "application" ? fields.getAll("lanes").map(String) : [fields.get("lane")].filter(Boolean);
          if (form.dataset.sharedAdd === "application" && !lanes.length) {
            showSaved("请至少选择一个地区／国家");
            return;
          }
          state.planningTasks.push(PlanningTasks.normalize({
            id: `task:${crypto.randomUUID()}`, module: form.dataset.sharedAdd,
            lane: lanes[0], lanes, text,
            months: form.dataset.month ? [form.dataset.month] : [],
            dates: form.dataset.dayDate ? [form.dataset.dayDate] : [],
          }));
          if (form.dataset.dayDate) ensurePlanningDate(form.dataset.dayDate);
        } else {
          const id = fields.get("taskId");
          const date = form.dataset.dayAssign;
          const task = state.planningTasks.find((item) => item.id === id);
          if (!PlanningTasks.assign(task, date)) return;
          ensurePlanningDate(date);
        }
        refreshPlanning();
        showSaved("日、月计划已同步");
      });
      container.addEventListener("change", (event) => {
        const input = event.target;
        const id = input.dataset.sharedText || input.dataset.sharedDone || input.dataset.sharedLane || input.dataset.sharedLaneOption;
        if (!id) return;
        const task = state.planningTasks.find((item) => item.id === id);
        if (!task) return;
        if (input.dataset.sharedDone) {
          task.done = input.checked;
          input.closest(".shared-task").classList.toggle("complete", task.done);
        } else if (input.dataset.sharedLaneOption) {
          const selected = [...input.closest(".shared-region-picker").querySelectorAll("[data-shared-lane-option]:checked")].map((option) => option.value);
          if (!selected.length) {
            input.checked = true;
            showSaved("请至少保留一个地区／国家");
            return;
          }
          PlanningTasks.setLanes(task, selected);
        } else if (input.dataset.sharedLane) PlanningTasks.setLanes(task, [input.value]);
        else {
          if (!input.value.trim()) { input.value = task.text; return; }
          task.text = input.value.trim();
        }
        refreshPlanning(input.dataset.sharedLaneOption ? null : container);
      });
      container.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        if (button.dataset.taskDatePicker) {
          openTaskDatePicker(button.dataset.taskDatePicker);
          return;
        }
        if (button.dataset.openPlanningDate) {
          selectedDate = button.dataset.openPlanningDate;
          visibleMonth = selectedDate.slice(0, 7);
          setView("calendar");
          renderCalendar();
          renderSelectedDay();
          return;
        }
        if (button.dataset.deleteTask) {
          state.planningTasks = state.planningTasks.filter((task) => task.id !== button.dataset.deleteTask);
        } else if (button.dataset.unassignTask) {
          const task = state.planningTasks.find((item) => item.id === button.dataset.unassignTask);
          task.dates = task.dates.filter((date) => date !== button.dataset.date);
        } else return;
        refreshPlanning();
      });
    });
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
    captureOpenSchools();
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

  // 重绘会重建 DOM，展开状态只能在覆盖前从现有节点读回来。
  // 不能依赖 toggle 事件：它是异步派发的，可能晚于本次重绘。
  function captureOpenSchools() {
    const nodes = document.querySelectorAll("details[data-phd-school]");
    if (!nodes.length) return;
    openSchools.clear();
    nodes.forEach((node) => {
      if (node.open) openSchools.add(node.dataset.phdSchool);
    });
  }

  function renderPhdSchool(region, school) {
    // 收起时也要能看出这所学校有什么：梯队徽章直接摆在 summary 上。
    const tiers = school.advisors.map((advisor) => advisor.tier).filter(Boolean);
    const keyCount = school.advisors.reduce((count, advisor) => count + (advisor.papers || []).filter((paper) => paper.key).length, 0);
    return `
      <details class="phd-school" data-phd-school="${safeAttr(school.id)}"${openSchools.has(school.id) ? " open" : ""}>
        <summary class="phd-school-summary">
          <strong>${safe(school.name)}</strong>
          <span class="phd-school-count">${school.advisors.length} 位导师</span>
          ${!tiers.length ? "" : `<span class="phd-school-tiers">${tiers.map((tier) => `<i class="advisor-tier tier-${safeAttr(tier.replace(/[^A-Za-z]/g, "").toLowerCase() || "x")}">${safe(tier)}</i>`).join("")}</span>`}
          ${!keyCount ? "" : `<span class="phd-school-key">★${keyCount} 篇必读</span>`}
        </summary>
        <header class="phd-school-header">
          <label><span>学校／机构</span><input data-phd-school-name="true" data-region-id="${safeAttr(region.id)}" data-school-id="${safeAttr(school.id)}" value="${safeAttr(school.name)}" aria-label="学校名称" /></label>
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
      </details>
    `;
  }

  function renderPhdAdvisor(region, school, advisor) {
    const common = `data-region-id="${safeAttr(region.id)}" data-school-id="${safeAttr(school.id)}" data-advisor-id="${safeAttr(advisor.id)}"`;
    return `
      <div class="phd-advisor-row${advisor.tier ? " has-brief" : ""}">
        ${!advisor.tier && !advisor.focus ? "" : `<div class="advisor-brief">
          ${!advisor.tier ? "" : `<span class="advisor-tier tier-${safeAttr(advisor.tier.replace(/[^A-Za-z]/g, "").toLowerCase() || "x")}">${safe(advisor.tier)}</span>`}
          ${!advisor.match ? "" : `<span class="advisor-match">匹配 ${safe(advisor.match)}</span>`}
          ${!advisor.studyOrder ? "" : `<span class="advisor-order">优先研究 ${safe(String(advisor.studyOrder))}</span>`}
          ${!advisor.url ? "" : `<a class="advisor-link" href="${safeAttr(advisor.url)}" target="_blank" rel="noopener">官方页面</a>`}
          ${!advisor.focus ? "" : `<p class="advisor-focus">${safe(advisor.focus)}</p>`}
          ${!advisor.note ? "" : `<p class="advisor-note">${safe(advisor.note)}</p>`}
          ${!advisor.papers?.length ? "" : `<details class="advisor-papers">
            <summary>近三年代表作 ${advisor.papers.length} 篇（DOI 可点）</summary>
            <ol>${advisor.papers.map((paper) => `<li${paper.key ? ' class="key-paper"' : ""}>
              <span class="paper-meta">${safe(String(paper.y))} · ${safe(paper.v)}${paper.key ? " · ★必读" : ""}</span>
              <a href="https://doi.org/${safeAttr(paper.doi)}" target="_blank" rel="noopener">${safe(paper.t)}</a>
              <code>${safe(paper.doi)}</code>
            </li>`).join("")}</ol>
          </details>`}
          ${!advisor.papersNote ? "" : `<p class="advisor-papers-note">查不到可靠 DOI：${safe(advisor.papersNote)}</p>`}
        </div>`}
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
    el.monthGrid.classList.toggle("reschedule-mode", rescheduleMode);

    const [year, month] = visibleMonth.split("-").map(Number);
    const first = new Date(year, month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month - 1, 1 - startOffset);

    for (let index = 0; index < 42; index += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const iso = toIso(current);
      const plan = mainByDate.get(iso);
      const trainingItems = trainingItemsForPlan(plan, { date: iso });
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
        <span class="day-meta">${trainingItems.length ? renderTrainingItemsMarkup(trainingItems, { compact: true, date: iso }) : ""}</span>
      `;
      button.addEventListener("click", (event) => {
        // While rescheduling, tapping a paper picks it instead of the whole day.
        const block = rescheduleMode && event.target.closest
          ? event.target.closest(".calendar-training-block")
          : null;
        if (block?.dataset.trainingId) {
          toggleTrainingPick(block.dataset.trainingDate || iso, block.dataset.trainingId);
          return;
        }
        selectedDate = iso;
        visibleMonth = iso.slice(0, 7);
        renderCalendar();
        renderSelectedDay();
      });
      el.monthGrid.appendChild(button);
    }
  }


  // ---- IELTS reschedule ------------------------------------------------
  // Papers are never deleted: cancelling moves them into a holding pool, and
  // the pool is emptied by dropping them onto a day the user picks.

  function pickKey(date, itemId) {
    return `${date}::${itemId}`;
  }

  function shortDate(iso) {
    if (!iso) return "";
    const [, month, day] = iso.split("-");
    return `${Number(month)}月${Number(day)}日`;
  }

  function setRescheduleMode(on) {
    rescheduleMode = Boolean(on);
    if (!rescheduleMode) pickedTraining.clear();
    pickedPending.clear();
    renderCalendar();
    renderSelectedDay();
  }

  function toggleTrainingPick(date, itemId) {
    if (!date || !itemId) return;
    const key = pickKey(date, itemId);
    if (pickedTraining.has(key)) {
      pickedTraining.delete(key);
    } else {
      const item = trainingItemsForPlan(mainByDate.get(date), { date, includeOptional: true })
        .find((entry) => entry.id === itemId);
      if (!item) return;
      pickedTraining.set(key, {
        date,
        itemId: item.id,
        code: item.cambridge,
        kind: item.kind,
        label: item.label,
        title: item.title,
        full: item.full,
        module: item.module,
        duration: item.duration,
      });
    }
    renderCalendar();
    renderSelectedDay();
  }

  function cancelPickedTraining() {
    if (!pickedTraining.size) return;
    const count = pickedTraining.size;
    state.ieltsMoves = moves.cancel(state.ieltsMoves, Array.from(pickedTraining.values()), Date.now());
    pickedTraining.clear();
    saveState();
    renderAll();
    showSaved(`已取消 ${count} 项，等待重新安排`);
  }

  function placePendingOnSelectedDay() {
    if (!pickedPending.size) return;
    const count = pickedPending.size;
    state.ieltsMoves = moves.place(state.ieltsMoves, Array.from(pickedPending), selectedDate);
    pickedPending.clear();
    saveState();
    renderAll();
    showSaved(`已把 ${count} 项放到 ${shortDate(selectedDate)}`);
  }

  function restorePickedPending() {
    if (!pickedPending.size) return;
    state.ieltsMoves = moves.restore(state.ieltsMoves, Array.from(pickedPending));
    pickedPending.clear();
    saveState();
    renderAll();
    showSaved("已放回原日期");
  }

  function movedAwayFrom(date) {
    return moves.movedAway(state.ieltsMoves, date);
  }

  function rescheduleAwayNote(awayMoves) {
    const placed = awayMoves.filter((move) => move.to);
    if (!placed.length) return `${awayMoves.length}份已取消，待重排`;
    const targets = Array.from(new Set(placed.map((move) => shortDate(move.to))));
    const tail = placed.length < awayMoves.length ? `，${awayMoves.length - placed.length}份待重排` : "";
    return `已改期到 ${targets.join("、")}${tail}`;
  }

  function renderReschedulePanel() {
    if (!el.rescheduleBody || !el.rescheduleToggle) return;
    const pendingList = moves.pending(state.ieltsMoves);
    if (el.reschedulePendingCount) {
      el.reschedulePendingCount.hidden = pendingList.length === 0;
      el.reschedulePendingCount.textContent = `待重排 ${pendingList.length}`;
    }
    el.rescheduleToggle.textContent = rescheduleMode ? "退出调课" : "开始调课";
    el.rescheduleToggle.setAttribute("aria-pressed", String(rescheduleMode));
    if (el.ieltsReschedulePanel) el.ieltsReschedulePanel.classList.toggle("is-active", rescheduleMode);
    const open = rescheduleMode || pendingList.length > 0;
    el.rescheduleBody.hidden = !open;
    el.rescheduleBody.innerHTML = open
      ? `${rescheduleMode ? reschedulePickMarkup() : ""}${reschedulePendingMarkup(pendingList)}`
      : "";
  }

  function reschedulePickMarkup() {
    const items = trainingItemsForPlan(mainByDate.get(selectedDate), { date: selectedDate, includeOptional: true });
    const rows = items.length
      ? items.map((item) => {
          const checked = pickedTraining.has(pickKey(selectedDate, item.id));
          return `
          <label class="reschedule-row${checked ? " is-picked" : ""}">
            <input type="checkbox" data-pick-date="${safeAttr(selectedDate)}" data-pick-item="${safeAttr(item.id)}"${checked ? " checked" : ""} />
            <span class="reschedule-kind ${safeAttr(item.kind)}">${safe(item.label)}</span>
            <span class="reschedule-title">${safe(item.cambridge ? cambridgeFull(item.cambridge) : item.title)}</span>
            ${item.movedFrom ? `<small class="reschedule-origin">原 ${safe(shortDate(item.movedFrom))}</small>` : ""}
          </label>`;
        }).join("")
      : `<p class="reschedule-empty">${safe(shortDate(selectedDate))} 没有雅思课程。</p>`;
    const picked = pickedTraining.size;
    const days = new Set(Array.from(pickedTraining.values()).map((entry) => entry.date)).size;
    return `
    <div class="reschedule-block">
      <div class="reschedule-block-head">
        <strong>${safe(shortDate(selectedDate))} 的课程</strong>
        <span>勾选要延期的课程；换一天继续勾，选择会累积</span>
      </div>
      <div class="reschedule-rows">${rows}</div>
      <div class="reschedule-actions">
        <span class="reschedule-count">已选 ${picked} 项${days > 1 ? ` · ${days} 天` : ""}</span>
        <button type="button" data-action="cancel"${picked ? "" : " disabled"}>取消这些课</button>
        <button type="button" class="ghost-button" data-action="clear"${picked ? "" : " disabled"}>清空勾选</button>
      </div>
    </div>`;
  }

  function reschedulePendingMarkup(pendingList) {
    if (!pendingList.length) return "";
    const rows = pendingList.map((move) => {
      const checked = pickedPending.has(move.id);
      return `
      <label class="reschedule-row${checked ? " is-picked" : ""}">
        <input type="checkbox" data-pending-id="${safeAttr(move.id)}"${checked ? " checked" : ""} />
        <span class="reschedule-kind ${safeAttr(move.kind)}">${safe(move.label || "IELTS")}</span>
        <span class="reschedule-title">${safe(move.code ? cambridgeFull(move.code) : move.title)}</span>
        <small class="reschedule-origin">原 ${safe(shortDate(move.from))}</small>
      </label>`;
    }).join("");
    const picked = pickedPending.size;
    return `
    <div class="reschedule-block reschedule-pending-block">
      <div class="reschedule-block-head">
        <strong>待重排（${pendingList.length}）</strong>
        <span>在左侧日历点一天，再放入</span>
      </div>
      <div class="reschedule-rows">${rows}</div>
      <div class="reschedule-actions">
        <button type="button" data-action="place"${picked ? "" : " disabled"}>放到 ${safe(shortDate(selectedDate))}</button>
        <button type="button" class="ghost-button" data-action="restore"${picked ? "" : " disabled"}>放回原日期</button>
      </div>
    </div>`;
  }

  function bindRescheduleControls() {
    if (!el.rescheduleToggle || !el.rescheduleBody) return;
    el.rescheduleToggle.addEventListener("click", () => setRescheduleMode(!rescheduleMode));
    el.rescheduleBody.addEventListener("change", (event) => {
      const box = event.target;
      if (!box || box.tagName !== "INPUT") return;
      if (box.dataset.pickItem) {
        toggleTrainingPick(box.dataset.pickDate, box.dataset.pickItem);
        return;
      }
      if (box.dataset.pendingId) {
        if (box.checked) pickedPending.add(box.dataset.pendingId);
        else pickedPending.delete(box.dataset.pendingId);
        renderReschedulePanel();
      }
    });
    el.rescheduleBody.addEventListener("click", (event) => {
      const button = event.target.closest ? event.target.closest("button[data-action]") : null;
      if (!button) return;
      if (button.dataset.action === "cancel") cancelPickedTraining();
      if (button.dataset.action === "clear") {
        pickedTraining.clear();
        renderCalendar();
        renderSelectedDay();
      }
      if (button.dataset.action === "place") placePendingOnSelectedDay();
      if (button.dataset.action === "restore") restorePickedPending();
    });
  }

  function renderTestBankStatus() {
    const bank = data.testBank || {};
    const scheduled = Number(bank.scheduled || 0);
    const total = Number(bank.total || 0);
    const remaining = Array.isArray(bank.remainingCodes) ? bank.remainingCodes : [];
    const retakes = Array.isArray(bank.retakeCodes) ? bank.retakeCodes : [];
    const excluded = Array.isArray(bank.excludedCodes) ? bank.excludedCodes : [];
    // 排除的真题不在 total 里，说明一下免得看起来少了几份。
    const excludedNote = excluded.length ? `已做过不再排：${excluded.map(cambridgeShort).join("、")}。` : "";
    el.testBankProgress.textContent = `${scheduled} / ${total} 已排`;
    if (!remaining.length) {
      el.testBankRemaining.textContent = retakes.length
        ? `全部真题已排；考前重做 ${retakes.join("、")}。${excludedNote}`
        : `全部真题都已排入日历。${excludedNote}`;
      return;
    }
    el.testBankRemaining.textContent = `依目前周规则，考试前尚余 ${remaining.length} 份：${remaining.join("、")}。${excludedNote}`;
  }

  function renderSelectedDay() {
    const plan = mainByDate.get(selectedDate) || {};
    const template = dailyByDate.get(selectedDate) || {};
    const trainingItems = trainingItemsForPlan(plan, { date: selectedDate });
    const displayItems = trainingItemsForPlan(plan, { date: selectedDate, includeOptional: true });
    const rescheduledAway = moves.movedAway(state.ieltsMoves, selectedDate);
    // Once every paper has been moved off a day, the generated ieltsPlan text is
    // stale — say where the papers went instead of pretending they are still here.
    const awayNote = !trainingItems.length && rescheduledAway.length ? rescheduleAwayNote(rescheduledAway) : "";
    el.selectedDayType.innerHTML = `${formatDate(selectedDate)} ${tagForDay(normalizedDayType(plan))}`;
    el.selectedDateTitle.textContent = `${plan.weekday || template.weekday || ""} ${trainingItems.length ? `${trainingItems.length}份 IELTS 训练` : awayNote || plan.ieltsPlan || template.mainTask || "自由计划"}`;
    el.summaryIelts.textContent = trainingItems.length ? `${trainingItems.length}份 IELTS 训练` : awayNote || plan.ieltsPlan || "无";
    if (displayItems.length) {
      el.summaryIeltsDetail.innerHTML = renderTrainingItemsMarkup(displayItems, { toggleDate: selectedDate });
      bindOptionalToggles(el.summaryIeltsDetail);
    } else if (awayNote) {
      el.summaryIeltsDetail.textContent = rescheduledAway
        .map((move) => `${cambridgeShort(move.code)} → ${move.to ? shortDate(move.to) : "待重排"}`)
        .join("；");
    } else {
      el.summaryIeltsDetail.textContent = [plan.ieltsModule, plan.cambridge].filter(Boolean).join(" / ");
    }
    el.summaryProjectType.textContent = "研究／会议论文";
    el.summaryProject.textContent = projectSummaryText(plan, selectedDate) || template.notes || "今天没有实验专案/学务主任务。";
    el.summaryStatus.textContent = getPlanOverride(selectedDate, "status") || plan.status || "未开始";
    el.summaryLimits.textContent = plan.limits || template.notes || "";
    renderDayPlanNodes();
    renderReschedulePanel();

    renderVocabulary();
    renderTaskPicker();
    renderReminders();
    renderHourGrid();
  }

  function renderDayPlanNodes() {
    if (!el.dayPlanNodes) return;
    const nodes = datedPlanNodes(selectedDate);
    if (!nodes.length) {
      el.dayPlanNodes.hidden = true;
      el.dayPlanNodes.innerHTML = "";
      return;
    }
    el.dayPlanNodes.hidden = false;
    el.dayPlanNodes.innerHTML = `<span class="day-plan-nodes-title">当日任务</span>${nodes.map((node) => planningTaskMarkup(node, { date: selectedDate })).join("")}`;
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
    const date = options.date || plan?.date || "";
    const all = allTrainingItemsForPlan(plan, date);
    if (options.includeOptional) return all;
    return all.filter((item) => !item.optional || isOptionalOn(date));
  }

  // A day shows the papers it was generated with, minus anything rescheduled
  // away, plus anything rescheduled onto it from another day.
  function allTrainingItemsForPlan(plan, date) {
    const day = date || plan?.date || "";
    const base = generatedTrainingItems(plan);
    if (!day) return base;
    const { kept, incoming } = moves.itemsForDate(state.ieltsMoves, day, base);
    return kept.concat(
      incoming.map((move, index) =>
        normalizeTrainingItem(
          {
            id: move.itemId,
            order: kept.length + index + 1,
            kind: move.kind,
            label: move.label,
            title: move.title,
            cambridge: move.code,
            full: move.full,
            module: move.module,
            duration: move.duration,
            movedFrom: move.from,
            moveId: move.id,
          },
          kept.length + index,
        ),
      ),
    );
  }

  function generatedTrainingItems(plan) {
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
      movedFrom: item.movedFrom || "",
      moveId: item.moveId || "",
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

  function cambridgeShort(code) {
    const m = String(code || "").match(/^C(\d+)T(\d+)/);
    return m ? `剑桥${m[1]}-${m[2]}` : code || "";
  }

  function cambridgeFull(code) {
    const m = String(code || "").match(/^C(\d+)T(\d+)/);
    return m ? `剑桥雅思 ${m[1]} 第 ${m[2]} 套` : "";
  }

  function renderTrainingItemsMarkup(items, options = {}) {
    const compact = Boolean(options.compact);
    if (compact) {
      const date = options.date || "";
      return `<span class="calendar-training-strip">${items.map((item) => {
        const label = item.cambridge ? cambridgeShort(item.cambridge) : (item.full || item.title);
        const picked = date && pickedTraining.has(pickKey(date, item.id));
        const flags = `${item.movedFrom ? " moved-in" : ""}${picked ? " is-picked" : ""}`;
        return `
        <span class="calendar-training-block ${safeAttr(item.kind)}${flags}" data-training-date="${safeAttr(date)}" data-training-id="${safeAttr(item.id)}" title="${safeAttr(item.cambridge ? cambridgeFull(item.cambridge) : item.title)}">
          ${safe(label)}
        </span>`;
      }).join("")}</span>`;
    }
    const toggleDate = options.toggleDate || "";
    return `<span class="training-item-list">${items.map((item) => {
      const on = !item.optional || isOptionalOn(toggleDate);
      const toggle = item.optional && toggleDate
        ? `<label class="training-toggle"><input type="checkbox" class="optional-toggle" data-date="${safeAttr(toggleDate)}"${on ? " checked" : ""} /><span>选做</span></label>`
        : "";
      const title = item.cambridge ? cambridgeFull(item.cambridge) : item.title;
      return `
      <span class="training-item ${safeAttr(item.kind)}${item.optional && !on ? " optional-off" : ""}">
        <span class="training-kind">${toggle}${safe(item.label)}</span>
        <span class="training-title">${safe(title)}${item.cambridge ? `<small class="training-code">${safe(cambridgeShort(item.cambridge))}</small>` : ""}</span>
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
    const expanded = new Set([...el.moduleCatalog.querySelectorAll("details[open]")].map((item) => item.dataset.libraryTrack));
    el.moduleCatalog.innerHTML = ["research", "external"].map((module) => {
      const tasks = state.planningTasks.filter((task) => task.module === module);
      return `<details class="shared-library" data-library-track="${module}"${expanded.has(module) ? " open" : ""}>
        <summary>${safe(planModuleLabel(module))}<small>${tasks.length} 项</small></summary>
        ${planningAddForm(module)}
        <div class="shared-library-list">${tasks.map((task) => planningTaskMarkup(task, { library: true })).join("")}</div>
      </details>`;
    }).join("");
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
      const ieltsFieldsHidden = trainingItems.length || movedAwayFrom(item.date).length;
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
        <td class="project-cell" data-label="研究主线">
          ${sharedDayMarkup(item.date, "research")}
        </td>
        <td data-label="会议 / 论文" class="conf-cell">
          ${sharedDayMarkup(item.date, "external")}
        </td>
        <td data-label="PhD 申请" class="conf-cell">
          ${sharedDayMarkup(item.date, "application")}
        </td>
        <td data-label="IELTS / 模块">
          ${trainingItems.length ? renderTrainingItemsMarkup(trainingItems, { toggleDate: item.date }) : ""}
          ${trainingItems.length || !movedAwayFrom(item.date).length ? "" : `<span class="plan-moved-away">${safe(rescheduleAwayNote(movedAwayFrom(item.date)))}</span>`}
          <textarea class="plan-edit-textarea ${ieltsFieldsHidden ? "visually-hidden-field" : ""}" data-field="ieltsPlan" data-date="${safeAttr(item.date)}" placeholder="IELTS">${safe(item.ieltsPlan || "")}</textarea>
          <textarea class="plan-edit-textarea ${ieltsFieldsHidden ? "visually-hidden-field" : ""}" data-field="ieltsModule" data-date="${safeAttr(item.date)}" placeholder="模块">${safe(item.ieltsModule || "")}</textarea>
          <input class="plan-edit-input ${ieltsFieldsHidden ? "visually-hidden-field" : ""}" data-field="cambridge" data-date="${safeAttr(item.date)}" value="${safeAttr(item.cambridge || "")}" placeholder="Cambridge进度" />
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
    const trainingItems = trainingItemsForPlan(plan, { date });
    // Papers rescheduled onto this day count even if the day itself is a rest
    // day or falls outside the generated plan range.
    if (trainingItems.length || (plan && !noIelts)) {
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
    datedPlanNodes(date).forEach((node) => {
      const text = [taskLaneLabel(node), node.text].filter(Boolean).join(" · ");
      tasks.push({
        id: `${date}:planning:${node.id}`,
        kind: node.module === "research" ? "project" : "daily",
        label: text, text, keywords: [node.text],
      });
    });
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
      projectType: mainByDate.get(originalDate)?.projectType || "",
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
      PlanningTasks.moveDate(state.planningTasks, previousDate, value);
      row.weekday = weekdayZh(value);
      moveDateKey(state.modulePlans, previousDate, value);
      moveDateKey(state.planOverrides, previousDate, value);
      moveDateKey(state.schedule, previousDate, value);
      moveDateKey(state.savedSlots, previousDate, value);
      Object.values(state.schedule[value] || {}).forEach((slot) => {
        if (slot?.taskId?.startsWith(previousDate + ":")) slot.taskId = value + slot.taskId.slice(previousDate.length);
      });
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
      PlanningTasks.moveDate(state.planningTasks, date, copied.date, true);
      highlightDate = copied.date;
    }
    if (action === "delete" && mainPlan.length > 1) {
      const [removed] = mainPlan.splice(index, 1);
      state.planningTasks.forEach((task) => { task.dates = task.dates.filter((value) => value !== removed.date); });
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
    return datedPlanNodes(date).filter((task) => ["research", "external"].includes(task.module))
      .map((task) => [taskLaneLabel(task), task.text].filter(Boolean).join(" · ")).join("；");
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
      planNodes: Array.isArray(parsed.planNodes) ? parsed.planNodes : [],
      ieltsMoves: moves.normalize(parsed.ieltsMoves),
      planningTasks: Array.isArray(parsed.planningTasks) ? parsed.planningTasks : [],
      planningTasksVersion: parsed.planningTasksVersion || 0,
      seededMilestones: Array.isArray(parsed.seededMilestones) ? parsed.seededMilestones : [],
      seededAdvisors: Array.isArray(parsed.seededAdvisors) ? parsed.seededAdvisors : [],
      roadmap: {
        tasks: parsed.roadmap?.tasks || {},
        gates: parsed.roadmap?.gates || {},
        monthly: parsed.roadmap?.monthly || {},
      },
      phdTracker: normalizePhdTracker(parsed.phdTracker),
    };
    ensureAcademicCatalog(normalized);
    const migrated = PlanningTasks.migrate(migratePlanState(normalized), ROADMAP_MONTHS);
    const seeded = typeof PlanningTasks.seedMilestones === "function"
      ? PlanningTasks.seedMilestones(migrated, APPLICATION_MILESTONES)
      : migrated;
    return seedPhdAdvisors(seeded);
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
    // planRows are replaced wholesale, so every reschedule points at a day that
    // no longer exists. Keeping any would leave phantom papers in the pool.
    candidate.ieltsMoves = [];
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
            tier: `${advisor.tier || ""}`,
            match: `${advisor.match || ""}`,
            focus: `${advisor.focus || ""}`,
            note: `${advisor.note || ""}`,
            url: `${advisor.url || ""}`,
            studyOrder: Number(advisor.studyOrder) || 0,
            papersNote: `${advisor.papersNote || ""}`,
            papers: Array.isArray(advisor.papers) ? advisor.papers.map((paper) => ({
              y: Number(paper.y) || 0,
              v: `${paper.v || ""}`,
              t: `${paper.t || ""}`,
              doi: `${paper.doi || ""}`,
              key: Boolean(paper.key),
            })) : [],
          })) : [],
        })) : defaultRegion.schools;
        return { id: preset.id, code: preset.code, name: preset.name, hint: preset.hint, schools };
      }),
    };
  }

  // 导师种子同样只种一次（记在 state.seededAdvisors），删掉或改过的不会被种回来。
  function seedPhdAdvisors(candidate) {
    const tracker = candidate.phdTracker;
    if (!Array.isArray(tracker?.regions)) return candidate;
    const seeded = new Set(candidate.seededAdvisors || []);
    for (const seed of PHD_ADVISOR_SEEDS) {
      if (seeded.has(seed.id)) continue;
      const regionId = seed.region || "hk";
      const region = tracker.regions.find((item) => item.id === regionId);
      if (!region || !Array.isArray(region.schools)) continue;
      seeded.add(seed.id);
      let school = region.schools.find((item) => item.name === seed.school);
      if (!school) {
        school = { id: `${regionId}-school-${region.schools.length + 1}`, name: seed.school, advisors: [] };
        region.schools.push(school);
      }
      school.advisors = Array.isArray(school.advisors) ? school.advisors : [];
      const existing = school.advisors.find((advisor) => advisor.id === seed.id);
      if (existing) {
        if (!existing.papers?.length) existing.papers = PHD_ADVISOR_PAPERS[seed.id] || [];
        if (!existing.papersNote) existing.papersNote = PHD_ADVISOR_NO_PAPERS[seed.id] || "";
        continue;
      }
      school.advisors.push({
        id: seed.id, name: seed.name, email: seed.email || "", cvDone: false, status: "研究中",
        tier: seed.tier, match: seed.match, focus: seed.focus, note: seed.note,
        url: seed.url, studyOrder: seed.studyOrder || 0,
        papers: PHD_ADVISOR_PAPERS[seed.id] || [],
        papersNote: PHD_ADVISOR_NO_PAPERS[seed.id] || "",
      });
    }
    candidate.seededAdvisors = [...seeded].sort();
    return candidate;
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
    const incomingTasksVersion = remoteState?.planningTasksVersion || 0;
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
    if (authToken && (state.planVersion !== incomingVersion || state.planningTasksVersion !== incomingTasksVersion)) {
      pushRemoteState().catch((error) => console.warn("Cloud migration save failed.", error));
    }
  }

  function hasUsefulState(candidate) {
    if (!candidate) return false;
    return Boolean(
      candidate.planningTasks?.length ||
      candidate.planNodes?.length ||
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
      const shouldReloadOnUpdate = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!shouldReloadOnUpdate || serviceWorkerReloading) return;
        serviceWorkerReloading = true;
        window.location.reload();
      });
      navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {});
    }
  }
})();
