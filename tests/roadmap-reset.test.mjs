import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("generates the requested IELTS and process calendar through exam day", async () => {
  const source = await readFile(new URL("../plan-data.js", import.meta.url), "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const data = context.window.IELTS_PLANNER_DATA;

  assert.equal(data.planVersion, "2026-08-16-cambridge-bank-v3");
  assert.equal(data.resetFromDate, "2026-08-24");
  assert.deepEqual(Array.from(data.dailyTemplates), []);
  assert.equal(data.mainPlan.length, 75);
  assert.equal(data.mainPlan[0].date, "2026-08-24");
  assert.equal(data.mainPlan.at(-1).date, "2026-11-06");

  const byDate = new Map(Array.from(data.mainPlan, (row) => [row.date, row]));
  for (const date of ["2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28"]) {
    assert.equal(byDate.get(date).trainingItems.length, 1);
  }
  assert.equal(byDate.get("2026-09-07").trainingItems.length, 2);
  assert.equal(byDate.get("2026-09-08").projectPlan, "全天制程日");
  assert.equal(byDate.get("2026-09-08").trainingItems.length, 0);
  assert.equal(byDate.get("2026-09-09").projectPlan, "半天制程 + 书报讨论 + Meeting");
  assert.equal(byDate.get("2026-09-09").trainingItems.length, 0);
  for (const date of ["2026-09-10", "2026-09-11", "2026-09-12"]) {
    assert.equal(byDate.get(date).projectPlan, "半天制程");
    assert.equal(byDate.get(date).trainingItems.length, 1);
  }
  assert.match(byDate.get("2026-09-13").ieltsPlan, /整理复习/);
  assert.equal(byDate.get("2026-11-06").dayType, "考试日");
  assert.equal(data.testBank.range, "Cambridge 5–21");
  assert.equal(data.testBank.perBook, 4);
  assert.equal(data.testBank.total, 68);
  assert.equal(data.testBank.scheduled, 48);
  assert.equal(data.testBank.remainingCodes.length, 20);
  assert.equal(byDate.get("2026-08-24").trainingItems[0].cambridge, "C5T1");
  assert.equal(byDate.get("2026-08-25").trainingItems[0].cambridge, "C5T2");
  assert.equal(byDate.get("2026-09-07").trainingItems[0].cambridge, "C6T2");
  assert.equal(byDate.get("2026-11-05").trainingItems[0].cambridge, "C16T4");
  assert.equal(new Set([...data.testBank.scheduledCodes, ...data.testBank.remainingCodes]).size, 68);
  assert.doesNotMatch(source, /2026-07-26|Cambridge 21 Test 4/);
});

test("renders all merged planning surfaces and persists roadmap state", async () => {
  const [html, app, styles] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
  ]);

  for (const id of ["roadmapView", "roadmapGateGrid", "roadmapTimelineBody", "roadmapTaskGroups", "roadmapApplicationBody"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /GaN FinFET/);
  assert.match(html, /Plan A \/ Plan B/);
  assert.match(html, /两场会议均已接受/);
  assert.match(html, /已投中并接受/g);
  assert.match(html, /2026\/11\/06/);
  assert.match(html, /Speaking[\s\S]*待确认/);
  assert.match(html, /id="vocabularyButton"/);
  assert.match(html, /id="vocabularyPanel"/);
  assert.match(html, /id="testBankProgress"/);
  assert.match(app, /2026-11-06/);
  assert.match(app, /VOCABULARY_BANK/);
  assert.match(app, /Array\.from\(\{ length: 20 \}/);
  assert.match(app, /scheduleCalendarDateRefresh/);
  assert.match(app, /roadmap:\s*\{/);
  assert.match(app, /candidate\.roadmap = candidate\.roadmap \|\| defaultRoadmapState\(\)/);
  assert.match(styles, /\.roadmap-gate-grid/);
  assert.match(styles, /\.roadmap-task-groups/);
});
