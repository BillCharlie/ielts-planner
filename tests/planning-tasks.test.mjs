import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const context = {};
vm.runInNewContext(await readFile(new URL("../planning-tasks.js", import.meta.url), "utf8"), context);
const model = context.PlanningTasks;
const seeds = [["2026/09", "", { TCAD: "Model IV" }, "English", { IEDMS: "Poster" }, { HK: "Application" }]];

test("migrates lane contents, personal entries and dated experiments without importing fixed subtasks", () => {
  const state = {
    roadmap: { tasks: { "fixed-subtask": true }, gates: { g1: true }, monthly: { "2026/09:research": true } },
    planNodes: [{ id: "personal", module: "external", lane: "IWN", text: "My talk", month: "2026/09", date: "2026-10-03", done: true }],
    moduleCatalog: { TCAD: [{ id: "custom", module: "TCAD", name: "Run simulation" }] },
    modulePlans: { "2026-09-10": { itemId: "custom" } },
    planRows: [{ date: "2026-09-10", projectType: "实验专案", dayType: "正常" }],
    schedule: { "2026-09-10": { 10: "My notes" } }, vocabularyCards: { saved: true }, phdTracker: { saved: true },
  };
  model.migrate(state, seeds);
  assert.equal(state.planningTasks.length, 6);
  assert.equal(state.planningTasks.some((task) => task.id === "fixed-subtask"), false);
  assert.equal(model.forMonth(state.planningTasks, "2026/09", "external").length, 1);
  assert.equal(model.forMonth(state.planningTasks, "2026/10", "external")[0].id, "personal");
  assert.equal(model.forDate(state.planningTasks, "2026-09-10")[0].text, "Run simulation");
  assert.equal(state.planningTasks.find((task) => task.id === "personal").done, true);
  assert.equal(state.planningTasks.find((task) => task.text === "Model IV").done, false);
  assert.equal(state.schedule["2026-09-10"][10], "My notes");
  assert.equal(state.vocabularyCards.saved, true);
  assert.equal(state.phdTracker.saved, true);
  assert.equal(state.roadmap.gates.g1, true);
});

test("date assignments are unique, move between months, and share text and completion", () => {
  const task = model.normalize({ id: "t", module: "research", lane: "TCAD", text: "Simulate" });
  const tasks = [task];
  assert.equal(model.assign(task, "2026-02-30"), false);
  assert.equal(model.assign(task, "2026-09-30"), true);
  model.assign(task, "2026-09-30");
  assert.equal(task.dates.length, 1);
  model.moveDate(tasks, "2026-09-30", "2026-10-01");
  assert.equal(model.forMonth(tasks, "2026/09", "research").length, 0);
  assert.equal(model.forMonth(tasks, "2026/10", "research")[0], task);
  task.text = "Updated simulation";
  task.done = true;
  assert.equal(model.forDate(tasks, "2026-10-01")[0].text, "Updated simulation");
  assert.equal(model.forMonth(tasks, "2026/10", "research")[0].done, true);
  model.moveDate(tasks, "2026-10-01", "2026-11-02", true);
  assert.equal(task.dates.length, 2);
  task.dates = task.dates.filter((date) => date !== "2026-10-01");
  assert.equal(model.forMonth(tasks, "2026/10", "research").length, 0);
  assert.equal(model.forMonth(tasks, "2026/11", "research").length, 1);
  assert.deepEqual(Array.from(model.setDates(task, ["2027-01-03", "bad", "2027-01-01", "2027-01-03"])), ["2027-01-01", "2027-01-03"]);
  assert.equal(model.forMonth(tasks, "2026/11", "research").length, 0);
  assert.equal(model.forMonth(tasks, "2027/01", "research").length, 1);
});

test("deleted or edited tasks are not restored by reload or a cloud-state round trip", () => {
  const state = model.migrate({}, seeds);
  state.planningTasks = state.planningTasks.filter((task) => task.module !== "research");
  const poster = state.planningTasks.find((task) => task.module === "external");
  poster.text = "New poster";
  model.assign(poster, "2027-02-03");
  const restored = model.migrate(JSON.parse(JSON.stringify(state)), seeds);
  assert.equal(model.forMonth(restored.planningTasks, "2026/09", "research").length, 0);
  assert.equal(model.forDate(restored.planningTasks, "2027-02-03")[0].text, "New poster");
  assert.equal(model.forMonth(restored.planningTasks, "2026/09", "external")[0].text, "New poster");
  assert.equal(JSON.stringify(model.migrate(restored, seeds)), JSON.stringify(restored));
});
