// Regenerate plan-data.js for the 2026-06-27 reset.
// Rules:
//  - Plan starts 2026-06-27 (06-25 / 06-26 deleted).
//  - Cambridge sequence restarts at C7T1.
//  - 06-27 / 06-28 / 06-29: 3 tests/day, labelled 早/中/晚 (no clock times).
//  - 06-30 onward: original weekly rhythm (Tue/Thu/Sat/Sun = 2, Mon/Wed/Fri = 1),
//    no preset time slots — just the test count + which Cambridge tests.
//  - ieltsModule never contains specific clock times.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "..", "plan-data.js");

const START = "2026-06-27";
const END = "2026-08-06";
const TRIPLE_DAYS = new Set(["2026-06-27", "2026-06-28", "2026-06-29"]);

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

// Continuous Cambridge test generator starting at C7T1 (4 tests per book).
function makeSeq() {
  let book = 7;
  let test = 1;
  return () => {
    const value = { book, test };
    test += 1;
    if (test > 4) {
      test = 1;
      book += 1;
    }
    return value;
  };
}
const nextTest = makeSeq();
const full = (t) => `Cambridge ${t.book} Test ${t.test}`;
const code = (t) => `C${t.book}T${t.test}`;

function countFor(date) {
  if (TRIPLE_DAYS.has(date)) return 3;
  const wd = new Date(date + "T00:00:00").getDay(); // 0=Sun .. 6=Sat
  return [0, 2, 4, 6].includes(wd) ? 2 : 1; // Sun/Tue/Thu/Sat = 2, others = 1
}

const dates = eachDate(START, END);
const mainPlan = [];
const dailyTemplates = [];

dates.forEach((date, idx) => {
  const count = countFor(date);
  const tests = Array.from({ length: count }, () => nextTest());
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
});

const payload = {
  generatedAt: "2026-06-27T00:00:00.000+08:00",
  source:
    "Planner reset v13: visible plan starts on 2026-06-27, Cambridge sequence restarts at C7T1, 06-27/28/29 run three tests (early/noon/evening) and 06-30 onward keep the weekly 1-2 rhythm with no preset time slots",
  mainPlan,
  dailyTemplates,
  planVersion: "2026-06-27-cambridge-7-reset-v13",
  resetFromDate: "2026-06-27",
};

const out = "window.IELTS_PLANNER_DATA = " + JSON.stringify(payload, null, 2) + ";\n";
writeFileSync(outPath, out);
console.log(`Wrote ${mainPlan.length} mainPlan + ${dailyTemplates.length} dailyTemplates to ${outPath}`);
console.log("First 5 days:");
mainPlan.slice(0, 5).forEach((m) => console.log(`  ${m.date} ${m.weekday} [${m.ieltsPriority}] ${m.cambridge}`));
console.log("Last day:", mainPlan.at(-1).date, mainPlan.at(-1).cambridge);
