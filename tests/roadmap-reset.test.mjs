import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("schedules all 52 papers from September 7 with travel, time blocks and research phases", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL("../plan-data.js", import.meta.url), "utf8"), context);
  const data = context.window.IELTS_PLANNER_DATA;
  assert.equal(data.planVersion, "2026-09-07-c9t1-c21t4-routine-v16");
  assert.equal(data.resetFromDate, "2026-09-07");
  assert.equal(data.mainPlan[0].date, "2026-09-07");
  assert.equal(data.mainPlan.at(-1).date, "2026-10-26");
  assert.equal(data.mainPlan.at(-1).cambridge, "C21T4");
  assert.match(data.mainPlan.at(-1).limits, /预留4小时/);
  const expectedCodes = Array.from({ length: 52 }, (_, index) => `C${9 + Math.floor(index / 4)}T${index % 4 + 1}`);
  const papers = Array.from(data.mainPlan).flatMap((row) => Array.from(row.trainingItems));
  assert.deepEqual(papers.map((item) => item.cambridge), expectedCodes);
  assert.equal(data.testBank.scheduled, 52);
  assert.equal(data.testBank.total, 52);
  assert.equal(data.testBank.remainingCodes.length, 0);
  assert.equal(data.testBank.excludedCodes.length, 0);

  for (const row of data.mainPlan) {
    const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay();
    const traveling = row.date >= "2026-09-23" && row.date <= "2026-10-02";
    const count = traveling ? (row.date === "2026-09-24" ? 1 : 0)
      : row.date === "2026-10-26" ? 1 : [1, 1, 2, 1, 1, 2, 1][weekday];
    assert.equal(row.trainingItems.length, count, row.date);
    if (traveling) {
      assert.equal(row.projectPlan, "");
      assert.equal(row.projectType, "");
      assert.equal(row.projectPhase, undefined);
      continue;
    }
    if (weekday === 3) {
      assert.equal(row.trainingItems[0].preferredHour, 7);
      assert.match(row.projectPlan, /中午坐车回中央/);
    }
    if ([2, 5].includes(weekday)) {
      assert.deepEqual(Array.from(row.trainingItems, (item) => item.preferredHour), count === 2 ? [8, 18] : [8]);
      assert.equal(row.projectType, "");
    }
    if ([1, 4, 6, 0].includes(weekday)) {
      assert.equal(row.trainingItems[0].preferredHour, 18);
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
    ["Raith 学习", 7, "2026-09-07", "2026-09-13"],
    ["EBeam Fin 实验", 21, "2026-09-14", "2026-10-14"],
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
    schedule: { "2026-09-06": { 8: "completed" }, "2026-09-07": { 8: "old plan" } },
    vocabularyCards: { saved: true }, phdTracker: { saved: true }, roadmap: { tasks: { saved: true } },
  };
  migrate(candidate);
  assert.equal(candidate.schedule["2026-09-06"][8], "completed");
  assert.equal(candidate.schedule["2026-09-07"], undefined);
  assert.equal(candidate.modulePlans["2026-09-06"].itemId, "custom");
  assert.equal(candidate.modulePlans["2026-09-07"].itemId, "routine-raith");
  assert.equal(candidate.modulePlans["2026-09-14"].itemId, "routine-ebeam-fin");
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
  const [html, app, styles, xlsx] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../xlsx-export.js", import.meta.url), "utf8"),
  ]);

  for (const id of ["roadmapView", "roadmapGateGroups", "roadmapResearchGateGrid", "roadmapApplicationGateGrid", "roadmapTimelineBody", "roadmapTaskGroups"]) {
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
  assert.match(html, /香港博士申请时间线[\s\S]*HKU[\s\S]*HKUST[\s\S]*CITYU[\s\S]*POLYU/);
  assert.match(html, /12\/01 · 12:00[\s\S]*12\/01 · 23:59/);
  assert.match(html, /最多只能填两个 programme choices/);
  assert.match(html, /11\/20 · INTERNAL[\s\S]*香港申请封版/);
  assert.match(html, /GaN FinFET/);
  assert.match(html, /Plan A \/ Plan B/);
  assert.doesNotMatch(html, /现在先做什么|focus-board/);
  assert.match(html, /老师沟通节点[\s\S]*台湾本土推荐信[\s\S]*HK／欧洲推荐信[\s\S]*关键 Gate/);
  assert.match(html, /NOV · STAGE 2[\s\S]*HK／欧洲推荐信/);
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
  assert.match(app, /2026\/11\/06/);
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
  assert.match(app, /Taiwan PhD Ready[\s\S]*HK Application Window[\s\S]*Europe PhD Pipeline/);
  assert.match(app, /HK Application Window[\s\S]*date: "2026-11-20"[\s\S]*官方截止预计 12\/01/);
  assert.match(app, /gateId: "a2", start: "2026-09-01", end: "2026-11-20", lane: 2/);
  assert.doesNotMatch(app, /HK 11\/15 启动|HK 主申请至 12\/31/);
  assert.match(app, /GATE_GANTT_MONTHS[\s\S]*2026-09[\s\S]*2026-10[\s\S]*2026-11[\s\S]*2026-12[\s\S]*2027-01[\s\S]*2027-02[\s\S]*2027-03[\s\S]*2027-04[\s\S]*2027-05/);
  assert.match(app, /RESEARCH_GANTT_BARS[\s\S]*APPLICATION_GANTT_BARS/);
  assert.match(app, /function renderGanttLane/);
  assert.match(app, /function ganttPosition/);
  assert.match(app, /gantt-milestone/);
  assert.match(html, /roadmap-gantt-axis[\s\S]*SEP[\s\S]*OCT[\s\S]*NOV[\s\S]*DEC[\s\S]*JAN[\s\S]*FEB[\s\S]*MAR[\s\S]*APR[\s\S]*MAY/);
  assert.match(html, /roadmap-vertical-gantt[\s\S]*研究主线[\s\S]*IELTS／会议／论文[\s\S]*PhD 申请[\s\S]*Plan A／B/);
  assert.match(html, /id="roadmapTaskGroups"[\s\S]*id="roadmapTimelineBody"/);
  assert.match(html, /03—04[\s\S]*月度甘特任务表/);
  assert.doesNotMatch(html, /研究任务看板/);
  assert.doesNotMatch(html, /IELTS 与会议|IELTS · RETAKE|conference-column/);
  assert.doesNotMatch(html, /class="roadmap-table"/);
  assert.match(app, /vertical-gantt-row/);
  assert.match(app, /vertical-gantt-time/);
  assert.match(app, /renderVerticalGanttCell\(row\[0\], "research"/);
  assert.match(app, /year-boundary/);
  assert.match(app, /ROADMAP_TASK_PLACEMENTS[\s\S]*fin-doe[\s\S]*recommend-overseas[\s\S]*defense/);
  assert.match(app, /function renderVerticalGanttCell/);
  assert.match(app, /function renderVerticalGanttTask/);
  assert.match(app, /data-roadmap-task/);
  assert.match(app, /data-roadmap-monthly/);
  assert.match(app, /state\.roadmap\.monthly/);
  assert.match(app, /monthly: parsed\.roadmap\?\.monthly \|\| \{\}/);
  assert.match(app, /return \{ tasks: \{\}, gates: \{\}, monthly: \{\} \}/);
  assert.match(app, /track === "graduation"[\s\S]*vertical-gantt-summary-check/);
  assert.doesNotMatch(app, /function renderRoadmapTasks/);
  assert.doesNotMatch(app, /ieltsExamCountdown|iedmsCountdown|iwnCountdown|function countdownLabel/);
  assert.match(app, /补登 Speaking 场次/);
  assert.match(app, /tw-ready[\s\S]*2027\/03\/15/);
  assert.match(html, /台湾博士考试入学时间线[\s\S]*2027\/03\/15/);
  const taiwanPanel = html.slice(html.indexOf('<section class="hk-application-panel tw-application-panel"'), html.indexOf('<section class="hk-application-panel eu-application-panel"'));
  assert.doesNotMatch(taiwanPanel, /预留 10\/01|支持 10 月申请|个人执行以 11\/20/);
  assert.match(app, /recommend-tw[\s\S]*recommend-overseas/);
  assert.match(app, /recommend-overseas[\s\S]*due: "11\/20"/);
  assert.match(app, /hk-shortlist[\s\S]*hk-contact-wave[\s\S]*hk-materials[\s\S]*hk-hkpfs-priority[\s\S]*hk-internal-freeze[\s\S]*hk-rgc-submit[\s\S]*hk-school-submit[\s\S]*hk-interview-prep/);
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
