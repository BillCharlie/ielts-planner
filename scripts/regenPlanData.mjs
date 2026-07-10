// Regenerate plan-data.js for the 2026-07-11 reset.
// Rules:
//  - Plan starts 2026-07-11 (everything on/before 2026-07-10 deleted).
//  - Cambridge sequence restarts at C7T1 and stops after C20T4.
//  - Per-day count overrides (COUNT_OVERRIDES): 07-11/12/13 = 3 (早/中/晚),
//    07-14/15/16/18/20/21/22 = 1.
//  - Every other day: 3 tests/day.
//  - No preset time slots — just the test count + which Cambridge tests.
//  - ieltsModule never contains specific clock times.
//  - The plan ends on the day C20T4 is assigned.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "..", "plan-data.js");

const START = "2026-07-11";
const END = "2026-09-30"; // safety bound; real end is when C20T4 is assigned
const MAX_BOOK = 20; // Cambridge sequence stops after C20T4
// Explicit per-day test counts; days not listed use three tests/day.
const COUNT_OVERRIDES = {
  "2026-07-11": 3,
  "2026-07-12": 3,
  "2026-07-13": 3,
  "2026-07-14": 1,
  "2026-07-15": 1,
  "2026-07-16": 1,
  "2026-07-18": 1,
  "2026-07-20": 1,
  "2026-07-21": 1,
  "2026-07-22": 1,
};

const weekdayZh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const priorityZh = { 1: "单份雅思", 2: "双份雅思", 3: "三份雅思" };

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eachDate(start, end) {
  const out = [];
  const d = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (d <= last) {
    out.push(fmt(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Finite Cambridge pool: C7T1 .. C20T4 (4 tests per book).
const pool = [];
for (let book = 7; book <= MAX_BOOK; book++) {
  for (let test = 1; test <= 4; test++) pool.push({ book, test });
}
let cursor = 0;
const full = (t) => `Cambridge ${t.book} Test ${t.test}`;
const code = (t) => `C${t.book}T${t.test}`;

function countFor(date) {
  if (date in COUNT_OVERRIDES) return COUNT_OVERRIDES[date];
  return 3;
}

const dates = eachDate(START, END);
const mainPlan = [];
const dailyTemplates = [];

for (let idx = 0; idx < dates.length; idx++) {
  if (cursor >= pool.length) break; // Cambridge sequence exhausted (C20T4 reached)
  const date = dates[idx];
  const want = countFor(date);
  const tests = pool.slice(cursor, cursor + want); // may be fewer on the final day
  cursor += tests.length;
  const count = tests.length;
  const fulls = tests.map(full);
  const codes = tests.map(code);
  const weekday = weekdayZh[new Date(date + "T00:00:00").getDay()];

  let ieltsPlan;
  let ieltsModule;
  let limits;
  let mainTask;
  let morningCore;
  let afternoon;
  let night;
  let notes;

  if (count === 3) {
    ieltsPlan = `早 ${fulls[0]} / 中 ${fulls[1]} / 晚 ${fulls[2]}`;
    ieltsModule = "早中晚各一份（共三份，不设具体时间）";
    limits = "今日早中晚共三份雅思，不预设具体时间。";
    mainTask = `早 ${fulls[0]} / 中 ${fulls[1]} / 晚 ${fulls[2]}`;
    morningCore = fulls[0];
    afternoon = fulls[1];
    night = fulls[2];
    notes = "今日早中晚共三份雅思；其他时段可选，不预设具体钟点。";
  } else if (count === 2) {
    ieltsPlan = `${fulls[0]} + ${fulls[1]}`;
    ieltsModule = "做两份雅思（时段自定）";
    limits = "今日两份雅思，时段自定。";
    mainTask = `${fulls[0]} + ${fulls[1]}`;
    morningCore = `${fulls[0]} / ${fulls[1]}（今日两份，时段自定）`;
    afternoon = "可选：自由安排 / 午休 / 错题整理";
    night = "可选：错题 / 单词 / 口语素材";
    notes = "今日两份雅思，时段自定；其他时段可选。";
  } else {
    ieltsPlan = fulls[0];
    ieltsModule = "做一份雅思（时段自定）";
    limits = "今日一份雅思，时段自定。";
    mainTask = fulls[0];
    morningCore = `${fulls[0]}（今日一份，时段自定）`;
    afternoon = "可选：自由安排 / 午休 / 错题整理";
    night = "可选：错题 / 单词 / 口语素材轻量收尾";
    notes = "今日一份雅思，时段自定；其他时段可选。";
  }

  mainPlan.push({
    id: `main-${idx + 1}`,
    date,
    weekday,
    dayType: "正常",
    ieltsPriority: priorityZh[count],
    ieltsPlan,
    ieltsModule,
    cambridge: codes.join(" + "),
    projectType: "",
    projectPlan: "",
    limits,
    status: "未开始",
    actual: "",
    projectModule: "",
  });

  dailyTemplates.push({
    id: `daily-${idx + 1}`,
    date,
    weekday,
    dayType: "正常",
    swim: count === 3 ? "晚泳 20:30–21:30；必要时早泳" : "可选：当天体力允许再安排游泳",
    morningEarly: "可选：早泳 / 早餐 / 热身",
    morningCore,
    afternoon,
    evening: "可选：晚餐 + 缓冲",
    night,
    mainTask,
    notes,
  });
}

const payload = {
  generatedAt: "2026-07-11T00:00:00.000+08:00",
  source:
    "Planner reset v19: visible plan starts on 2026-07-11, Cambridge sequence restarts at C7T1 and stops after C20T4, 07-14/15/16/18/20/21/22 run one test, and every other day runs three tests with no preset time slots",
  mainPlan,
  dailyTemplates,
  planVersion: "2026-07-11-cambridge-7to20-reset-v19",
  resetFromDate: "2026-07-11",
};

const out = "window.IELTS_PLANNER_DATA = " + JSON.stringify(payload, null, 2) + ";\n";
writeFileSync(outPath, out);
console.log(`Wrote ${mainPlan.length} mainPlan + ${dailyTemplates.length} dailyTemplates to ${outPath}`);
console.log("First 5 days:");
mainPlan.slice(0, 5).forEach((m) => console.log(`  ${m.date} ${m.weekday} [${m.ieltsPriority}] ${m.cambridge}`));
console.log("Last day:", mainPlan.at(-1).date, mainPlan.at(-1).cambridge);
