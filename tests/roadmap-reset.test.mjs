import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("ships a clean IELTS plan with the integrated roadmap version", async () => {
  const source = await readFile(new URL("../plan-data.js", import.meta.url), "utf8");
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const data = context.window.IELTS_PLANNER_DATA;

  assert.equal(data.planVersion, "2026-08-16-plan-aboard-reset-v1");
  assert.equal(data.resetFromDate, "0000-01-01");
  assert.deepEqual(Array.from(data.mainPlan), []);
  assert.deepEqual(Array.from(data.dailyTemplates), []);
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
  assert.match(app, /roadmap:\s*\{/);
  assert.match(app, /candidate\.roadmap = defaultRoadmapState\(\)/);
  assert.match(styles, /\.roadmap-gate-grid/);
  assert.match(styles, /\.roadmap-task-groups/);
});
