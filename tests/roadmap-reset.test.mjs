import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("schedules all 52 papers from September 14 with travel, October rules, time blocks and research phases", async () => {
  const context = { window: {} };
  vm.runInNewContext(await readFile(new URL("../plan-data.js", import.meta.url), "utf8"), context);
  const data = context.window.IELTS_PLANNER_DATA;
  assert.equal(data.planVersion, "2026-09-14-c9t1-c21t4-october-rules-v19");
  assert.equal(data.resetFromDate, "2026-09-14");
  assert.equal(data.mainPlan[0].date, "2026-09-14");
  assert.equal(data.mainPlan.at(-1).date, "2026-10-23");
  assert.equal(data.mainPlan.at(-1).cambridge, "C21T3 + C21T4");
  assert.equal(data.mainPlan.at(-1).trainingItems.at(-1).cambridge, "C21T4");
  assert.match(data.mainPlan.at(-1).limits, /预留8小时/);
  const expectedCodes = Array.from({ length: 52 }, (_, index) => `C${9 + Math.floor(index / 4)}T${index % 4 + 1}`);
  const papers = Array.from(data.mainPlan).flatMap((row) => Array.from(row.trainingItems));
  assert.deepEqual(papers.map((item) => item.cambridge), expectedCodes);
  assert.equal(data.testBank.scheduled, 52);
  assert.equal(data.testBank.total, 52);
  assert.equal(data.testBank.remainingCodes.length, 0);
  assert.equal(data.testBank.excludedCodes.length, 0);

  // 9/14–9/23 延用目前逐日份数；两份的日子必须上午＋晚上分开。
  const byDate = new Map(data.mainPlan.map((row) => [row.date, row]));
  for (const [date, expected] of [
    ["2026-09-14", [["C9T1", 18]]],
    ["2026-09-15", [["C9T2", 18]]],
    ["2026-09-16", [["C9T3", 7], ["C9T4", 18]]],
    ["2026-09-17", [["C10T1", 8], ["C10T2", 18]]],
    ["2026-09-18", [["C10T3", 8], ["C10T4", 18]]],
    ["2026-09-19", [["C11T1", 18]]],
    ["2026-09-20", [["C11T2", 8], ["C11T3", 18]]],
    ["2026-09-21", [["C11T4", 8], ["C12T1", 18]]],
    ["2026-09-22", [["C12T2", 18]]],
    ["2026-09-23", [["C12T3", 7], ["C12T4", 18]]],
  ]) {
    const row = byDate.get(date);
    assert.deepEqual(Array.from(row.trainingItems, (item) => [item.cambridge, item.preferredHour]), expected, date);
    assert.match(row.limits, expected.length === 2 ? /预留8小时/ : /预留4小时/, date);
  }
  assert.equal(byDate.get("2026-09-24").trainingItems.length, 0);
  assert.equal(byDate.get("2026-09-24").limits, "旅行期间不排雅思与实验");

  for (const row of data.mainPlan) {
    const weekday = new Date(`${row.date}T00:00:00Z`).getUTCDay();
    const traveling = row.date >= "2026-09-24" && row.date <= "2026-10-02";
    const pinned = { "2026-09-14": 1, "2026-09-15": 1, "2026-09-16": 2, "2026-09-17": 2, "2026-09-18": 2, "2026-09-19": 1, "2026-09-20": 2, "2026-09-21": 2, "2026-09-22": 1, "2026-09-23": 2 };
    const octoberRule = row.date >= "2026-10-03" && row.date <= "2026-10-31";
    const count = traveling ? 0
      : pinned[row.date] ?? (octoberRule ? [2, 2, 1, 2, 2, 2, 1][weekday] : [1, 1, 2, 1, 1, 2, 1][weekday]);
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
    ["Raith 学习", 7, "2026-09-14", "2026-09-20"],
    ["EBeam Fin 实验", 21, "2026-09-21", "2026-10-20"],
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
    schedule: { "2026-09-06": { 8: "completed" }, "2026-09-13": { 8: "old plan" } },
    ieltsMoves: [{ id: "mv", itemId: "full-C9T3", code: "C9T3", from: "2026-09-11", to: "2026-09-20" }],
    vocabularyCards: { saved: true }, phdTracker: { saved: true }, roadmap: { tasks: { saved: true } },
  };
  migrate(candidate);
  assert.equal(candidate.schedule["2026-09-06"][8], "completed");
  assert.equal(candidate.schedule["2026-09-13"][8], "old plan");
  assert.equal(candidate.ieltsMoves.length, 0, "regenerated plan must not keep stale reschedules");
  assert.equal(candidate.modulePlans["2026-09-06"].itemId, "custom");
  assert.equal(candidate.modulePlans["2026-09-14"].itemId, "routine-raith");
  assert.equal(candidate.modulePlans["2026-09-21"].itemId, "routine-ebeam-fin");
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
  assert.match(html, /香港博士申请时间线[\s\S]*HKU[\s\S]*HKUST[\s\S]*CITYU[\s\S]*POLYU/);
  assert.match(html, /12\/01 · 12:00[\s\S]*12\/01 · 23:59/);
  assert.match(html, /最多只能填两个 programme choices/);
  assert.match(html, /11\/20 · INTERNAL[\s\S]*香港申请封版/);
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
  assert.match(app, /11\/06/);
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
  assert.match(app, /HK Application Window[\s\S]*Europe PhD Pipeline[\s\S]*Taiwan PhD Ready/);
  assert.match(app, /HK Application Window[\s\S]*date: "2026-12-01"[\s\S]*12\/01 双截止/);
  assert.match(app, /gateId: "a1", start: "2026-11-01", end: "2026-12-01", lane: 1/);
  assert.doesNotMatch(app, /HK 11\/15 启动|HK 主申请至 12\/31/);
  assert.match(app, /GATE_GANTT_MONTHS[\s\S]*2026-09[\s\S]*2026-10[\s\S]*2026-11[\s\S]*2026-12[\s\S]*2027-01[\s\S]*2027-02[\s\S]*2027-03[\s\S]*2027-04[\s\S]*2027-05/);
  assert.match(app, /RESEARCH_GANTT_BARS[\s\S]*APPLICATION_GANTT_BARS/);
  assert.match(app, /function renderGanttLane/);
  assert.match(app, /function ganttPosition/);
  assert.match(app, /gantt-milestone/);
  assert.match(html, /roadmap-gantt-axis[\s\S]*SEP[\s\S]*OCT[\s\S]*NOV[\s\S]*DEC[\s\S]*JAN[\s\S]*FEB[\s\S]*MAR[\s\S]*APR[\s\S]*MAY/);
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
  assert.match(html, /planning-tasks\.js\?v=20260913-replan-0914/);
  assert.match(html, /app\.js\?v=20260913-replan-0914/);
  assert.match(html, /ielts-moves\.js\?v=20260913-replan-0914/);
  assert.match(sw, /ielts-moves\.js/);
  for (const id of ["ieltsReschedulePanel", "rescheduleToggle", "rescheduleBody", "reschedulePendingCount"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(sw, /planner-notebook-v68-replan-0914/);
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
