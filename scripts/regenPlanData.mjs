// Regenerate plan-data.js for the 2026-07-11 three-pool reset.
// Rules:
//  - Everything on/before 2026-07-10 is removed.
//  - Mon/Fri/Sat/Sun are three-pool days: full mock + mixed training + supplement.
//  - Tue/Wed/Thu are one-pool days.
//  - 2026-07-14/15/16/18/20/21/22 are limited to one pool item.
//  - Full mock pool: Cambridge 16-20, only on three-pool days.
//  - Mixed training pool: Cambridge 12-15, used first for one-pool days.
//  - Supplement pool: Cambridge 7-11, used after mixed training for one-pool days.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "..", "plan-data.js");

const START = "2026-07-11";
const END = "2026-10-31";
const SINGLE_LIMIT_DAYS = new Set([
  "2026-07-14",
  "2026-07-15",
  "2026-07-16",
  "2026-07-18",
  "2026-07-20",
  "2026-07-21",
  "2026-07-22",
]);

const weekdayZh = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

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

function makePool(kind, label, startBook, endBook) {
  const items = [];
  for (let book = startBook; book <= endBook; book++) {
    for (let test = 1; test <= 4; test++) {
      items.push({
        kind,
        label,
        book,
        test,
        full: `Cambridge ${book} Test ${test}`,
        code: `C${book}T${test}`,
      });
    }
  }
  return { items, cursor: 0 };
}

const pools = {
  full: makePool("full", "完整模考", 16, 20),
  mixed: makePool("mixed", "混合训练", 12, 15),
  supplement: makePool("supplement", "专项补量", 7, 11),
};

function take(poolName) {
  const pool = pools[poolName];
  if (pool.cursor >= pool.items.length) return null;
  return pool.items[pool.cursor++];
}

function hasRemaining() {
  return Object.values(pools).some((pool) => pool.cursor < pool.items.length);
}

function totalRemaining() {
  return Object.values(pools).reduce((sum, pool) => sum + pool.items.length - pool.cursor, 0);
}

function takeFirstAvailable(poolNames) {
  for (const poolName of poolNames) {
    const item = take(poolName);
    if (item) return item;
  }
  return null;
}

function isThreePoolDay(date) {
  if (SINGLE_LIMIT_DAYS.has(date)) return false;
  const wd = new Date(date + "T00:00:00").getDay(); // 0=Sun .. 6=Sat
  return [0, 1, 5, 6].includes(wd); // Sun/Mon/Fri/Sat
}

function takeOnePoolItem() {
  return take("mixed") || take("supplement");
}

function takeItemsForDate(date) {
  if (isThreePoolDay(date)) {
    if (totalRemaining() < 3) {
      const item = takeFirstAvailable(["full", "mixed", "supplement"]);
      return item ? [item] : [];
    }

    const items = [take("full"), take("mixed"), take("supplement")].filter(Boolean);
    while (items.length < 3) {
      const filler = takeFirstAvailable(["supplement", "mixed", "full"]);
      if (!filler) break;
      items.push(filler);
    }
    return items;
  }
  const item = takeOnePoolItem();
  return item ? [item] : [];
}

const profiles = {
  full: {
    duration: [4, 4],
    detail: "听力40分钟 + 阅读60分钟 + 写作60分钟 + 口语/对话15分钟 + 1小时细整理；单套总用时约4小时",
    limit: "Cambridge 16-20 作为完整模考",
  },
  mixed: {
    duration: [2.5, 3.5],
    detail: "听力必做40分钟 + 写作必做60分钟；阅读/口语视状态补；整理30-45分钟；单套总用时约2.5-3.5小时",
    limit: "Cambridge 12-15 作为混合训练：听力和写作必做",
  },
  supplement: {
    duration: [2, 3],
    detail: "听力必做40分钟，写作尽量做；阅读/口语按状态补；整理20-45分钟；单套总用时约2-3小时",
    limit: "Cambridge 7-11 作为专项补量：听力必做，其他按状态补",
  },
};

function timeText(items) {
  const min = items.reduce((sum, item) => sum + profiles[item.kind].duration[0], 0);
  const max = items.reduce((sum, item) => sum + profiles[item.kind].duration[1], 0);
  return min === max ? `约${min}小时` : `约${min}-${max}小时`;
}

function itemTitle(item) {
  return `${item.label} ${item.full}`;
}

function itemModule(item) {
  return `${itemTitle(item)}：${profiles[item.kind].detail}`;
}

function priorityFor(items) {
  return items.map((item) => item.label).join(" + ");
}

function planFor(items) {
  return items.map(itemTitle).join(" / ");
}

function limitsFor(items) {
  const seen = new Set();
  const parts = [];
  for (const item of items) {
    if (!seen.has(item.kind)) {
      seen.add(item.kind);
      parts.push(profiles[item.kind].limit);
    }
  }
  parts.push(`当日总体安排时间：${timeText(items)}`);
  return parts.join("；");
}

const dates = eachDate(START, END);
const mainPlan = [];
const dailyTemplates = [];

for (const date of dates) {
  if (!hasRemaining()) break;
  const items = takeItemsForDate(date);
  if (items.length === 0) continue;

  const weekday = weekdayZh[new Date(date + "T00:00:00").getDay()];
  const plan = planFor(items);
  const totalTime = timeText(items);
  const moduleText = `${items.map(itemModule).join("；")}；当日总体安排时间：${totalTime}`;
  const limits = limitsFor(items);

  mainPlan.push({
    id: `main-${mainPlan.length + 1}`,
    date,
    weekday,
    dayType: "正常",
    ieltsPriority: priorityFor(items),
    ieltsPlan: plan,
    ieltsModule: moduleText,
    cambridge: items.map((item) => item.code).join(" + "),
    projectType: "",
    projectPlan: "",
    limits,
    status: "未开始",
    actual: "",
    projectModule: "",
  });

  dailyTemplates.push({
    id: `daily-${dailyTemplates.length + 1}`,
    date,
    weekday,
    dayType: "正常",
    swim: items.length >= 3 ? "晚泳 20:30-21:30；必要时早泳" : "可选：当天体力允许再安排游泳",
    morningEarly: "可选：早泳 / 早餐 / 热身",
    morningCore: items[0] ? `${itemTitle(items[0])}；单项用时${timeText([items[0]])}` : "可选：错题整理",
    afternoon: items[1] ? `${itemTitle(items[1])}；单项用时${timeText([items[1]])}` : "可选：自由安排 / 午休 / 错题整理",
    evening: "可选：晚餐 + 缓冲",
    night: items[2] ? `${itemTitle(items[2])}；单项用时${timeText([items[2]])}` : "可选：错题 / 单词 / 口语素材轻量收尾",
    mainTask: plan,
    notes: `当日总体安排时间：${totalTime}`,
  });
}

const payload = {
  generatedAt: "2026-07-11T00:00:00.000+08:00",
  source:
    "Planner reset v23: visible plan starts on 2026-07-11 with three pools; Mon/Fri/Sat/Sun use three items, Tue/Wed/Thu and limited dates use one item, and two-item days are not generated",
  mainPlan,
  dailyTemplates,
  planVersion: "2026-07-11-three-pool-reset-v23",
  resetFromDate: "2026-07-11",
};

const out = "window.IELTS_PLANNER_DATA = " + JSON.stringify(payload, null, 2) + ";\n";
writeFileSync(outPath, out);
console.log(`Wrote ${mainPlan.length} mainPlan + ${dailyTemplates.length} dailyTemplates to ${outPath}`);
console.log("First 8 days:");
mainPlan.slice(0, 8).forEach((m) => console.log(`  ${m.date} ${m.weekday} [${m.ieltsPriority}] ${m.cambridge}`));
console.log("Last day:", mainPlan.at(-1).date, mainPlan.at(-1).cambridge);
