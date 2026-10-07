import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("schedules the remaining 51 papers from October 8 with one weekly rule, time blocks and research phases", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL("../plan-data.js", import.meta.url), "utf8"), context);
  const data = context.window.IELTS_PLANNER_DATA;
  assert.equal(data.planVersion, "2026-10-08-exclude-c9t1-tue-thu-sat-single-v25");
  assert.equal(data.resetFromDate, "2026-10-08");
  assert.equal(data.mainPlan[0].date, "2026-10-08");
  assert.equal(data.mainPlan.at(-1).date, "2026-11-12");
  assert.equal(data.mainPlan.at(-1).trainingItems.at(-1).cambridge, "C21T4");
  // 全部真题必须排在 11/08 考试之前。
  assert.equal(data.autoPlan.examDate, "2026-12-19");
  assert.deepEqual(Array.from(data.autoPlan.weeklyPaperCounts), [2, 2, 1, 1, 1, 2, 1]);
  assert.equal(data.autoPlan.octoberPaperCounts, undefined, "十月特例应已移除，全程单一周规则");
  assert.ok(data.mainPlan.at(-1).date < data.autoPlan.examDate);
  const excluded = ["C9T1"];
  const expectedCodes = Array.from({ length: 52 }, (_, index) => `C${9 + Math.floor(index / 4)}T${index % 4 + 1}`)
    .filter((code) => !excluded.includes(code));
  assert.equal(expectedCodes.length, 51);
  const papers = Array.from(data.mainPlan).flatMap((row) => Array.from(row.trainingItems));
  assert.deepEqual(papers.map((item) => item.cambridge), expectedCodes);
  assert.equal(data.testBank.scheduled, 51);
  assert.equal(data.testBank.total, 51);
  assert.equal(data.testBank.remainingCodes.length, 0);
  assert.deepEqual(Array.from(data.testBank.excludedCodes), excluded);
  assert.equal(papers.some((item) => excluded.includes(item.cambridge)), false, "已做过的真题不可再被排入");

  // 全程走十月每周份数；两份的日子必须上午＋晚上分开，周三上午 07:00。
  const byDate = new Map(data.mainPlan.map((row) => [row.date, row]));
  for (const [date, expected] of [
    ["2026-10-08", [["C9T2", 18]]],
    ["2026-10-09", [["C9T3", 8], ["C9T4", 18]]],
    ["2026-10-10", [["C10T1", 18]]],
    ["2026-10-11", [["C10T2", 8], ["C10T3", 18]]],
    ["2026-10-14", [["C11T3", 7]]],
    ["2026-11-12", [["C21T4", 18]]],
  ]) {
    const row = byDate.get(date);
    assert.deepEqual(Array.from(row.trainingItems, (item) => [item.cambridge, item.preferredHour]), expected, date);
    assert.match(row.limits, expected.length === 2 ? /预留8小时/ : /预留4小时|周三仅上午1份/, date);
  }
  // 中秋旅行已结束，排程范围内不应再出现旅行日。
  assert.equal(data.mainPlan.some((row) => row.dayType === "旅行"), false);
  assert.ok(data.mainPlan[0].date > data.autoPlan.travelPeriod.endDate);

  for (const row of data.mainPlan) {
    const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay();
    const traveling = row.date >= data.autoPlan.travelPeriod.startDate && row.date <= data.autoPlan.travelPeriod.endDate;
    const pinned = {};
    // 单一周规则：周二三四各 1 篇。
    const count = traveling ? 0 : pinned[row.date] ?? [2, 2, 1, 1, 1, 2, 1][weekday];
    assert.equal(row.trainingItems.length, count, row.date);
    if (traveling) {
      assert.equal(row.projectPlan, "");
      assert.equal(row.projectType, "");
      assert.equal(row.projectPhase, undefined);
      continue;
    }
    // 周三上午要赶车，第一份一律 07:00；其余日子单份放晚上、双份拆上午＋晚上。
    if (weekday === 3) {
      assert.equal(row.trainingItems[0].preferredHour, 7);
      assert.match(row.projectPlan, /中午坐车回中央/);
    } else {
      assert.deepEqual(
        Array.from(row.trainingItems, (item) => item.preferredHour),
        count === 2 ? [8, 18] : [18],
        row.date,
      );
    }
    if ([2, 5].includes(weekday)) assert.equal(row.projectType, "");
    if ([1, 4, 6, 0].includes(weekday)) {
      assert.equal(row.projectType, "实验专案");
      assert.ok(data.projectCatalog.some((item) => item.id === row.projectItemId));
    }
  }
  for (const item of papers) {
    assert.equal(item.durationMinutes, 235);
    assert.equal(item.blockHours, 4);
    assert.match(item.module, /整理60分钟/);
  }
  for (const [phase, days, first, last] of [
    ["Raith 学习", 7, "2026-10-08", "2026-10-14"],
    ["EBeam Fin 实验", 21, "2026-10-15", "2026-11-04"],
  ]) {
    const rows = data.mainPlan.filter((row) => row.projectPhase === phase);
    assert.equal(rows.length, days);
    assert.equal(rows[0].date, first);
    assert.equal(rows.at(-1).date, last);
  }
});

test("plan migration preserves history, vocabulary and PhD records, and seeds named projects once", async () => {
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL("../plan-data.js", import.meta.url), "utf8"), context);
  const data = context.window.IELTS_PLANNER_DATA;
  const functionSource = app.slice(app.indexOf("  function migratePlanState("), app.indexOf("  function defaultPhdTracker("));
  const migrate = vm.runInNewContext(`${functionSource}; migratePlanState`, {
    data, ensureAcademicCatalog() {}, defaultRoadmapState: () => ({ tasks: {}, gates: {}, monthly: {} }),
  });
  const candidate = {
    planVersion: "old", planRows: [], moduleCatalog: { 制程: [{ id: "custom", name: "My experiment" }] },
    modulePlans: { "2026-09-06": { itemId: "custom" } },
    schedule: { "2026-09-06": { 8: "completed" }, "2026-09-13": { 8: "old plan" }, "2026-10-09": { 8: "stale" } },
    ieltsMoves: [{ id: "mv", itemId: "full-C9T3", code: "C9T3", from: "2026-09-11", to: "2026-09-20" }],
    vocabularyCards: { saved: true }, phdTracker: { saved: true }, roadmap: { tasks: { saved: true } },
  };
  migrate(candidate);
  assert.equal(candidate.schedule["2026-09-06"][8], "completed");
  assert.equal(candidate.schedule["2026-09-13"][8], "old plan");
  assert.equal(candidate.schedule["2026-10-09"], undefined, "entries from the reset window are cleared");
  assert.equal(candidate.ieltsMoves.length, 0, "regenerated plan must not keep stale reschedules");
  assert.equal(candidate.modulePlans["2026-09-06"].itemId, "custom");
  assert.equal(candidate.modulePlans["2026-10-08"].itemId, "routine-raith");
  assert.equal(candidate.modulePlans["2026-10-15"].itemId, "routine-ebeam-fin");
  assert.equal(candidate.modulePlans["2026-09-24"], undefined);
  assert.equal(candidate.vocabularyCards.saved, true);
  assert.equal(candidate.phdTracker.saved, true);
  assert.equal(candidate.roadmap.tasks.saved, true);
  assert.equal(candidate.moduleCatalog.制程[0].id, "custom");
  const snapshot = JSON.stringify(candidate);
  migrate(candidate);
  assert.equal(JSON.stringify(candidate), snapshot);
});

test("renders all merged planning surfaces and persists roadmap state", async () => {
  const [html, app, styles, xlsx, sw] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../xlsx-export.js", import.meta.url), "utf8"),
    readFile(new URL("../sw.js", import.meta.url), "utf8"),
  ]);

  for (const id of ["roadmapView", "roadmapGateGroups", "roadmapResearchGateGrid", "roadmapApplicationGateGrid", "roadmapTimelineBody", "roadmapTaskGroups"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const id of ["taskDateDialog", "taskDatePickerGrid", "taskDatePickerApply", "taskDatePickerClear"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const id of ["navPhd", "phdView", "phdSchoolCount", "phdAdvisorCount", "phdCvCount", "phdActiveCount"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  for (const region of ["hk", "tw", "eu"]) {
    assert.match(html, new RegExp(`data-region-slot=["']${region}["']`));
  }
  assert.doesNotMatch(app, /phdRegionList/);
  assert.match(html, /id="hkApplicationTimelineTitle"/);
  // HK 提醒要和 TW 提醒并列，并写清出分前/出分后的先后顺序。
  assert.match(html, /HK 提醒：[\s\S]*TW 提醒：/);
  assert.match(html, /已放弃 12\/01 HKPFS/);
  assert.match(html, /PolyU 可以直接送件/);
  assert.match(html, /CUHK 先别投/);
  // CityU 是唯一被 12 月雅思卡死的学校：唯一确定轮次 12/01 要求提交时成绩即有效。
  assert.match(html, /CityU 本轮直接排除/);
  assert.match(html, /school-dropped[\s\S]*本轮排除/);
  assert.match(app, /四校导师长名单[\s\S]*CityU 本轮排除/);
  assert.doesNotMatch(app, /五校导师长名单/);
  // 重考会连带拖掉 CUHK，这个连锁效应要写明。
  assert.match(html, /重考会把 CUHK 也一起拖掉/);
  assert.match(html, /CUHK clearing 3\/31[\s\S]*唯一会真的过期的死线/);
  assert.match(html, /PolyU Jan 2028 entry/);
  // 学校卡按「研究契合度 × 对晚出雅思的容忍度」排序，不是字母序。
  // 学校卡按研究链匹配度排序（与「能否无雅思先投」是两条轴）。
  assert.match(html, /香港博士申请时间线[\s\S]*HKUST[\s\S]*>HKU</);
  assert.match(html, /<span>HKU<\/span>[\s\S]*POLYU[\s\S]*CUHK[\s\S]*CITYU/);
  // 导师种子要覆盖研究链两端，并保留不可忽略的警告。
  assert.match(app, /PHD_ADVISOR_SEEDS[\s\S]*Yuhao Zhang[\s\S]*Kevin J\. Chen[\s\S]*Weijia Zhang/);
  assert.match(app, /Anding Zhu[\s\S]*PA 的 power ≠ power electronics 的 power/);
  assert.match(app, /Yan Cheng[\s\S]*Research Assistant Professor/);
  assert.match(app, /function seedPhdAdvisors/);
  // 欧洲：面板由 eu-radar.js 驱动，导师按国家分组种入 eu 区。
  assert.match(html, /<script src="eu-radar\.js/);
  for (const id of ["euGroups", "euSystems", "euJobs", "euSources", "euSearchMatrix", "euTriage", "euVerifiedAt"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /function renderEuropePanel/);
  // 套磁排程：每周一位，三批依序；旧的四波已由 replaces 退役。
  assert.match(app, /wave:plan-v2[\s\S]*replaces: \["hk:study-six", "hk:mail-wave1"/);
  assert.doesNotMatch(app, /id: "hk:mail-wave1"/);
  // 排班是唯一来源：甘特「本月排班」与日历节点都由 OUTREACH_ROSTER 产生。
  assert.match(app, /const OUTREACH_ROSTER = \[/);
  assert.match(app, /id: `roster2:\$\{row\.date\}`/);
  // 重排后日期换了人，旧的 roster:<date> 必须一次退役，否则新旧并存。
  assert.match(app, /const LEGACY_ROSTER_IDS = \[/);
  assert.match(app, /function rosterSupersedes/);
  assert.match(app, /function outreachRosterMarkup/);
  // 排班里的老师可点击跳到 PhD 页对应那一栏并高亮。
  assert.match(app, /function focusAdvisor/);
  assert.match(app, /data-goto-advisor=/);
  assert.match(app, /advisors: \["hk-adv-hku-yuhao"\]/);
  assert.match(app, /advisors: \["eu-adv-be-stefaan-decoutere"\]/);
  assert.match(app, /advisors: \["tw-adv-nycu-tlwu"\]/);
  // imec 被顺延，警告要留着。
  assert.match(app, /imec 是秋季集中徵集，错过要等一年/);
  assert.match(styles, /advisor-flash/);
  // 这个 scroller 是 scroll-snap ＋ scroll-behavior:smooth，必须用 instant 覆盖，
  // 也不能用 scrollIntoView（会把横向位置一起冲掉）。
  assert.match(app, /scroller\.scrollTo\(\{ left: index \* step, behavior: "instant" \}\)/);
  const focusStart = app.indexOf("function focusAdvisor");
  const focusBody = app.slice(focusStart, app.indexOf("  function ", focusStart + 20));
  assert.doesNotMatch(focusBody, /\.scrollIntoView\(/, "focusAdvisor 不可呼叫 scrollIntoView：会把横向位置一起冲掉");
  assert.match(app, /track === "application" \? outreachRosterMarkup\(month\)/);
  // 旧的手写每周节点已退役，不可和产生的并存。
  assert.doesNotMatch(app, /\{ id: "(?:w[123]|tw):/);
  assert.match(app, /const ROSTER_SUPERSEDES = \{[\s\S]*"2026-10-12": "w1:hku-yuhao"/);
  // 吴添立、张毅已提前到十月最前；两个锚点不动。
  assert.match(app, /date: "2026-10-12", batch: 1, lane: "台湾", who: "吴添立/);
  assert.match(app, /date: "2026-10-19", batch: 1, lane: "HK", who: "Yi Zhang/);
  assert.match(app, /date: "2026-10-26"[\s\S]{0,40}who: "Yuhao Zhang/);
  assert.match(app, /date: "2026-12-14", batch: 0[\s\S]*考前一周只回信/);
  assert.match(app, /date: "2027-02-01", batch: 0[\s\S]{0,120}锁定台湾四位/);
  assert.match(app, /date: "2027-03-15", batch: 3, lane: "欧洲"/);
  // Group A 不占套磁配额，改职缺扫描。
  assert.match(app, /radar:group-a[\s\S]*不占套磁配额/);
  assert.match(app, /schools: \["德国", "法国", "比利时", "荷兰", "瑞典", "丹麦", "挪威"\]/);
  assert.match(app, /eu-adv-[\s\S]*region: "eu"/);
  assert.match(sw, /eu-radar\.js/);
  // 导师种子要能落到非香港地区（台湾 NYCU）。
  assert.match(app, /schools: \["NTU", "NYCU"\]/);
  assert.match(app, /seed\.region \|\| "hk"/);
  assert.match(app, /tw-adv-nycu-tlwu[\s\S]*region: "tw"[\s\S]*school: "NYCU"/);
  assert.match(app, /tw-adv-nycu-ymli[\s\S]*region: "tw"/);
  assert.match(app, /tw-adv-ntu-yrwu[\s\S]*region: "tw"[\s\S]*school: "NTU"/);
  assert.match(app, /tw-adv-ntu-jjhuang[\s\S]*school: "NTU"/);
  // 台大两位的匹配度明显低于 NYCU，备注必须保留「应用面不对口」与指导资格提醒。
  assert.match(app, /tw-adv-ntu-yrwu[\s\S]*方法论极强但应用面不对口/);
  assert.match(app, /tw-adv-ntu-yrwu[\s\S]*光电所 GIPO/);
  assert.match(app, /tw-adv-ntu-jjhuang[\s\S]*光电所 GIPO/);
  // 两位 Si-TCAD：刘致为挂电子所 GIEE（指导资格最稳），胡璧合的「璧」字易写错。
  assert.match(app, /tw-adv-ntu-cwliu[\s\S]*TCAD-Si[\s\S]*电子所 GIEE/);
  assert.match(app, /tw-adv-ntu-vphu[\s\S]*胡璧合[\s\S]*不是「胡壁合」/);
  assert.match(app, /"tw-adv-ntu-vphu": \[[\s\S]*10\.1038\/s41565-024-01693-3/);
  assert.match(app, /tw-adv-ntu-chwu[\s\S]*school: "NTU"[\s\S]*交集最低的一位/);
  // ★N 紧挨「N 位导师」会被误读成人数，必须写明是论文。
  assert.match(app, /★ 必读论文 \$\{keyCount\} 篇/);
  assert.doesNotMatch(app, /★\$\{keyCount\} 篇必读/);
  // 吴添立的 p-GaN gate 可靠性与 AI 辅助建模是与研究链的重叠点。
  assert.match(app, /"tw-adv-nycu-tlwu": \[[\s\S]*10\.1109\/ted\.2024\.3412095[\s\S]*10\.1038\/s41598-024-58112-9/);
  // 学校可折叠，且展开状态必须在重绘前从 DOM 读回（toggle 事件是异步的）。
  assert.match(app, /<details class="phd-school"/);
  // 拖拽横向滚动会 setPointerCapture，把随后的 click 改派到容器上；
  // summary/details 必须排除在外，否则折叠点不开（看起来像没反应）。
  assert.match(app, /closest\("input, select, textarea, button, a, label, summary, details, \.hk-timeline-scroll"\)/);
  assert.match(app, /function captureOpenSchools/);
  assert.match(app, /captureOpenSchools\(\);[\s\S]*regions\.forEach/);
  assert.doesNotMatch(app, /addEventListener\("toggle"/);
  // 中文校名都要带英文缩写。
  for (const [zh, en] of [["香港科技大学", "HKUST"], ["香港大学", "HKU"], ["香港理工大学", "PolyU"], ["香港中文大学", "CUHK"], ["香港城市大学", "CityU"], ["台湾大学", "NTU"], ["阳明交通大学", "NYCU"]]) {
    assert.match(html, new RegExp(`${zh}[^<]*${en}`), `${zh} 缺少英文缩写`);
  }
  // DOI 一律写成 10.xxxx/... 的真实格式，且不可重复。
  const dois = Array.from(app.matchAll(/doi: "([^"]+)"/g), (m) => m[1]);
  assert.ok(dois.length >= 30, `期望至少 30 个 DOI，实际 ${dois.length}`);
  assert.deepEqual(dois.filter((doi) => !/^10\.\d{4,9}\/\S+$/.test(doi)), [], "DOI 格式不合法");
  assert.equal(new Set(dois).size, dois.length, "DOI 不可重复");
  // 查不到可靠清单的三位必须留说明，不可编造条目。
  assert.match(app, /PHD_ADVISOR_NO_PAPERS[\s\S]*hk-adv-hkust-weijia[\s\S]*hk-adv-cityu-tan[\s\S]*hk-adv-hkust-yancheng/);
  for (const id of ["hk-adv-hkust-weijia", "hk-adv-cityu-tan", "hk-adv-hkust-yancheng"]) {
    assert.equal(app.includes(`"${id}": [`), false, `${id} 不应有伪造的论文清单`);
  }
  assert.match(html, /阶段一 · 2026\/11—12[\s\S]*阶段二 · 2027\/01—06/);
  assert.match(html, /HKPFS 主轮 · 本轮放弃/);
  assert.match(html, /预计取得成绩日期|预计取得日期/);
  // 没有雅思时不可投的两校必须写明原因。
  assert.match(html, /CUHK[\s\S]*mandatory supporting document/);
  assert.match(html, /CITYU[\s\S]*提交申请时即有效/);
  assert.match(html, /GaN FinFET/);
  assert.match(html, /Plan A \/ Plan B/);
  assert.doesNotMatch(html, /现在先做什么|focus-board/);
  assert.match(html, /老师沟通节点[\s\S]*HK／欧洲推荐信[\s\S]*台湾本土推荐信[\s\S]*关键 Gate/);
  assert.match(html, /NOV · STAGE 1[\s\S]*HK／欧洲推荐信/);
  assert.match(html, /研究 Gate[\s\S]*申请 Gate/);
  assert.doesNotMatch(html, /两项投稿均已接受|已投中并接受/);
  assert.doesNotMatch(html, /ieltsExamCountdown|iedmsCountdown|iwnCountdown/);
  assert.match(html, /id="vocabularyButton"/);
  assert.match(html, /id="vocabularyPanel"/);
  assert.match(html, /id="vocabularyInput"/);
  assert.match(html, /id="vocabularyTranslationInput"/);
  assert.match(html, /id="exportVocabularyButton"/);
  assert.match(html, /id="weeklyVocabularyCount"/);
  assert.match(html, /id="weeklyVocabularyGroups"/);
  assert.match(html, /id="testBankProgress"/);
  // 甘特格原本 display:flex 没设方向，泳道横着并排被压成竖排文字。
  assert.match(styles, /\.vertical-gantt-cell \{[\s\S]*?flex-direction: column/);
  // IELTS 栏没有宽度下限时，table-layout:auto 会把它压到几十 px，标题变一字一行。
  assert.match(styles, /\.ielts-cell \{[\s\S]*?min-width: 260px/);
  assert.match(app, /class="ielts-cell"/);
  // 标题独占一行，才不会被 nowrap 的 kind/duration 挤成一字一行。
  assert.match(styles, /"title title"/);
  // 日计划新增 PhD 申请栏，表头合并栏位要跟着加宽。
  assert.match(html, /<th data-track="external">会议 \/ 论文<\/th>[\s\S]*<th data-track="application">PhD 申请<\/th>[\s\S]*<th data-track="ielts">IELTS \/ 模块<\/th>/);
  // 模块色只在 :root 定义一次，日计划表与月度甘特都从 data-track 取用。
  assert.match(styles, /--track-research:/);
  assert.match(styles, /\[data-track="ielts"\]/);
  assert.match(styles, /\.vertical-gantt-cell\.ielts \{[\s\S]*?var\(--track-ielts\)/);
  assert.match(app, /data-track="research"[\s\S]*data-track="external"[\s\S]*data-track="application"[\s\S]*data-track="ielts"/);
  assert.match(html, /<th colspan="8">/);
  // 香港里程碑要同时供月计划与日计划使用（带日期才会出现在日历／日计划）。
  assert.match(app, /APPLICATION_MILESTONES[\s\S]*hk:polyu-submit[\s\S]*date: "2026-12-07"/);
  assert.match(app, /APPLICATION_MILESTONES[\s\S]*hk:hkust-deadline[\s\S]*date: "2027-06-01"/);
  assert.match(app, /sharedDayMarkup\(item\.date, "application"\)/);
  assert.match(app, /12\/19/);
  assert.doesNotMatch(app, /VOCABULARY_BANK|vocabularyForDate/);
  assert.match(app, /vocabularyCards: parsed\.vocabularyCards \|\| \{\}/);
  assert.match(app, /function addVocabularyCard/);
  assert.match(app, /function deleteVocabularyCard/);
  assert.match(app, /data-flip-vocabulary/);
  assert.match(app, /function hydrateMissingVocabularyTranslations/);
  assert.match(app, /card\.date <= selectedDate/);
  assert.match(app, /cardsByWeek/);
  assert.match(app, /WEEK OF/);
  assert.doesNotMatch(app, /THIS WEEK|LAST WEEK|TWO WEEKS AGO/);
  assert.match(xlsx, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
  assert.match(app, /scheduleCalendarDateRefresh/);
  assert.match(app, /classList\.toggle\("paper-day"/);
  assert.doesNotMatch(app, /const monthMeta|const projectMeta/);
  assert.match(styles, /\.day-cell\.paper-day/);
  assert.match(app, /roadmap:\s*\{/);
  assert.match(app, /candidate\.roadmap = candidate\.roadmap \|\| defaultRoadmapState\(\)/);
  assert.match(app, /RESEARCH_GATES[\s\S]*APPLICATION_GATES/);
  assert.match(app, /HK Phase 1 · 无雅思先行[\s\S]*HK Phase 2 · 出分后主投[\s\S]*Europe PhD Pipeline[\s\S]*Taiwan PhD Ready/);
  assert.match(app, /HK Phase 2 · 出分后主投[\s\S]*date: "2027-06-01"/);
  // 四条申请条带不可重叠在同一泳道。
  assert.match(app, /gateId: "a4"[\s\S]*lane: 1/);
  assert.match(app, /gateId: "a3"[\s\S]*lane: 3/);
  assert.match(app, /gateId: "a1", start: "2026-11-01", end: "2026-12-31", lane: 1/);
  assert.doesNotMatch(app, /HK 11\/15 启动|HK 主申请至 12\/31/);
  assert.match(app, /GATE_GANTT_MONTHS[\s\S]*2026-09[\s\S]*2026-10[\s\S]*2026-11[\s\S]*2026-12[\s\S]*2027-01[\s\S]*2027-02[\s\S]*2027-03[\s\S]*2027-04[\s\S]*2027-05/);
  assert.match(app, /RESEARCH_GANTT_BARS[\s\S]*APPLICATION_GANTT_BARS/);
  assert.match(app, /function renderGanttLane/);
  assert.match(app, /function ganttPosition/);
  assert.match(app, /gantt-milestone/);
  assert.match(html, /roadmap-gantt-axis[\s\S]*SEP[\s\S]*OCT[\s\S]*NOV[\s\S]*DEC[\s\S]*JAN[\s\S]*FEB[\s\S]*MAR[\s\S]*APR[\s\S]*MAY[\s\S]*JUN/);
  assert.match(html, /roadmap-vertical-gantt[\s\S]*Plan A／B[\s\S]*研究主线[\s\S]*IELTS[\s\S]*会议／论文[\s\S]*PhD 申请/);
  assert.match(html, /id="roadmapTaskGroups"[\s\S]*id="roadmapTimelineBody"/);
  assert.match(html, /03—04[\s\S]*月度甘特任务表/);
  assert.doesNotMatch(html, /研究任务看板/);
  assert.doesNotMatch(html, /IELTS 与会议|IELTS · RETAKE|conference-column/);
  assert.doesNotMatch(html, /class="roadmap-table"/);
  assert.match(app, /vertical-gantt-row/);
  assert.match(app, /vertical-gantt-time/);
  assert.match(app, /renderVerticalGanttCell\(row\[0\], "research"/);
  assert.match(app, /year-boundary/);
  assert.match(app, /function renderVerticalGanttCell/);
  assert.match(app, /state\.planningTasks/);
  assert.match(app, /monthly: parsed\.roadmap\?\.monthly \|\| \{\}/);
  assert.match(app, /return \{ tasks: \{\}, gates: \{\}, monthly: \{\} \}/);
  assert.doesNotMatch(app, /function renderRoadmapTasks/);
  assert.doesNotMatch(html, /id="planBoardBody"|月度计划板/);
  assert.doesNotMatch(app, /ROADMAP_TASKS|data-roadmap-monthly|data-roadmap-task/);
  assert.match(html, /planning-tasks\.js[\s\S]*app\.js/);
  assert.match(app, /data-shared-done/);
  assert.match(app, /PlanningTasks\.migrate/);
  assert.match(app, /PlanningTasks\.setDates/);
  assert.match(app, /data-task-date-picker/);
  assert.match(app, /fields\.getAll\("lanes"\)/);
  assert.match(app, /data-shared-lane-option/);
  assert.match(app, /PlanningTasks\.inLane\(task, lane\)/);
  assert.match(styles, /\.shared-add-regions/);
  assert.match(styles, /\.shared-region-picker/);
  assert.match(app, /ensurePlanningTaskRegionCompatibility/);
  assert.match(app, /updateViaCache: "none"/);
  assert.match(app, /serviceWorkerReloading/);
  assert.match(html, /planning-tasks\.js\?v=20261008-replan-1008/);
  assert.match(html, /app\.js\?v=20261008-replan-1008/);
  assert.match(html, /ielts-moves\.js\?v=20261008-replan-1008/);
  assert.match(sw, /ielts-moves\.js/);
  for (const id of ["ieltsReschedulePanel", "rescheduleToggle", "rescheduleBody", "reschedulePendingCount"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(sw, /planner-notebook-v93-replan-1008/);
  assert.doesNotMatch(app, /ieltsExamCountdown|iedmsCountdown|iwnCountdown|function countdownLabel/);
  assert.match(html, /台湾博士考试入学时间线[\s\S]*2027\/03\/15/);
  const taiwanPanel = html.slice(html.indexOf('<section class="hk-application-panel tw-application-panel"'), html.indexOf('<section class="hk-application-panel eu-application-panel"'));
  assert.doesNotMatch(taiwanPanel, /预留 10\/01|支持 10 月申请|个人执行以 11\/20/);
  assert.match(app, /PHD_REGION_PRESETS[\s\S]*code: "HK"[\s\S]*code: "TW"[\s\S]*code: "EU"/);
  assert.match(app, /phdTracker: normalizePhdTracker\(parsed\.phdTracker\)/);
  assert.match(app, /function addPhdSchool/);
  assert.match(app, /function addPhdAdvisor/);
  assert.match(app, /data-phd-advisor-field="email"/);
  assert.match(app, /data-phd-advisor-cv="true"/);
  assert.match(app, /data-phd-advisor-status="true"/);
  assert.doesNotMatch(html, /id="roadmapApplicationBody"/);
  assert.match(styles, /\.roadmap-gate-groups/);
  assert.match(styles, /\.roadmap-gantt/);
  assert.match(styles, /\.roadmap-gantt-track/);
  assert.match(styles, /\.gantt-gate-bar/);
  assert.match(styles, /\.gantt-milestone/);
  assert.match(styles, /\.roadmap-vertical-gantt/);
  assert.match(styles, /\.vertical-gantt-row/);
  assert.match(styles, /\.vertical-gantt-cell/);
  assert.match(styles, /\.vertical-gantt-checklist/);
  assert.match(styles, /\.vertical-gantt-task/);
  assert.match(styles, /\.vertical-gantt-summary-check/);
  assert.match(styles, /\.vertical-gantt-summary-box/);
  assert.doesNotMatch(styles, /\.conference-column-title|\.ielts-reset-panel|\.split-roadmap-section/);
  assert.match(styles, /\.phd-region-list/);
  assert.match(styles, /\.phd-advisor-row/);
  assert.match(styles, /\.hk-application-timeline/);
  assert.match(styles, /\.hk-school-deadlines/);
});

test("builds a real Excel workbook with cards and weekly summary", async () => {
  const source = await readFile(new URL("../xlsx-export.js", import.meta.url), "utf8");
  const context = { window: {}, Blob, TextEncoder, Uint8Array, DataView, Date, Math, Number, Intl };
  vm.runInNewContext(source, context);
  const blob = context.window.VocabularyXlsx.buildVocabularyWorkbook([
    { date: "2026-08-16", text: "take into account", translation: "考虑到", createdAt: "2026-08-16T01:00:00.000Z" },
    { date: "2026-08-15", text: "cause & effect", translation: "因果", createdAt: "2026-08-15T01:00:00.000Z" },
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = new TextDecoder().decode(bytes);

  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.match(text, /xl\/worksheets\/sheet1\.xml/);
  assert.match(text, /Weekly Summary/);
  assert.match(text, /take into account/);
  assert.match(text, /cause &amp; effect/);
  assert.match(text, /Chinese Translation/);
  assert.match(text, /考虑到/);
});
