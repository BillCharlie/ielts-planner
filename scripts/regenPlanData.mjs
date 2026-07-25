// Regenerate plan-data.js for the 2026-07-23 blue-pool plan.
// Rules:
//  - Visible plan starts on 2026-07-23.
//  - 2026-07-26 and 2026-07-27 are two-full-mock days.
//  - 2026-07-28 has no plan.
//  - Full mocks run from Cambridge 21 Test 4 down to Cambridge 17 Test 1 without duplicates.
//  - Purple listening+writing items are optional and disabled by default.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "..", "plan-data.js");

const fullByDate = {
  "2026-07-23": ["C21T4"],
  "2026-07-24": ["C21T3"],
  "2026-07-25": ["C21T2"],
  "2026-07-26": ["C21T1", "C20T4"],
  "2026-07-27": ["C20T3", "C20T2"],
  "2026-07-29": ["C20T1"],
  "2026-07-30": ["C19T4"],
  "2026-07-31": ["C19T3"],
  "2026-08-01": ["C19T2"],
  "2026-08-02": ["C19T1"],
  "2026-08-03": ["C18T4"],
  "2026-08-04": ["C18T3"],
  "2026-08-05": ["C18T2"],
  "2026-08-06": ["C18T1"],
  "2026-08-07": ["C17T4"],
  "2026-08-08": ["C17T3"],
  "2026-08-09": ["C17T2"],
  "2026-08-10": ["C17T1"],
};

const optionalLwByDate = {
  "2026-07-23": "C16T4",
  "2026-07-24": "C16T3",
  "2026-07-25": "C16T2",
  "2026-07-29": "C15T1",
  "2026-07-30": "C14T4",
  "2026-07-31": "C14T3",
  "2026-08-01": "C14T2",
  "2026-08-02": "C14T1",
  "2026-08-03": "C13T4",
  "2026-08-04": "C13T3",
  "2026-08-05": "C13T2",
  "2026-08-06": "C13T1",
  "2026-08-07": "C12T4",
  "2026-08-08": "C12T3",
  "2026-08-09": "C12T2",
  "2026-08-10": "C12T1",
};

function parseCode(code) {
  const match = /^C(\d+)T(\d+)$/.exec(code);
  if (!match) throw new Error(`Invalid Cambridge code: ${code}`);
  return { book: Number(match[1]), test: Number(match[2]) };
}

function parseDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function weekdayZh(date) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parseDate(date).getDay()];
}

function fullTitle(code, label = "完整模考") {
  const { book, test } = parseCode(code);
  return `${label} Cambridge ${book} Test ${test}`;
}

function fullName(code) {
  const { book, test } = parseCode(code);
  return `Cambridge ${book} Test ${test}`;
}

function fullItem(code, order) {
  const title = fullTitle(code);
  const detail = "听力40分钟 + 阅读60分钟 + 写作60分钟 + 口语/对话15分钟 + 1小时细整理；单套总用时约4小时";
  return {
    id: `full-${code}`,
    order,
    kind: "full",
    label: "完整模考",
    title,
    cambridge: code,
    full: fullName(code),
    module: `${title}：${detail}`,
    duration: "约4小时",
    detail,
    status: "未开始",
  };
}

function lwItem(code, order) {
  const title = fullTitle(code, "听力+写作");
  const detail = "听力必做40分钟 + 写作必做60分钟 + 整理30分钟；单项约2-2.5小时";
  return {
    id: `lw-${code}`,
    order,
    kind: "lw",
    label: "听力+写作",
    title,
    cambridge: code,
    full: fullName(code),
    module: `${title}：${detail}`,
    duration: "约2-2.5小时",
    detail,
    status: "未开始",
    optional: true,
  };
}

function fullPlanText(items) {
  return items.map((item) => item.title).join(" / ");
}

function fullModuleText(items) {
  const hours = items.length * 4;
  return `${items.map((item) => item.module).join("；")}；当日总体安排时间：约${hours}小时`;
}

function limitsFor(date, fullItems) {
  if (date === "2026-07-26" || date === "2026-07-27") {
    return "两份完整模考必做；每份约4小时；当日总体安排时间：约8小时";
  }
  return "第一池（蓝色）完整模考每日必做；第二池（紫色）听力+写作为可选，默认关闭";
}

const dates = Object.keys(fullByDate).sort();
const mainPlan = [];
const dailyTemplates = [];

for (const date of dates) {
  const fullItems = fullByDate[date].map((code, index) => fullItem(code, index + 1));
  const optionalCode = optionalLwByDate[date];
  const trainingItems = [...fullItems];
  if (optionalCode) trainingItems.push(lwItem(optionalCode, trainingItems.length + 1));

  const plan = fullPlanText(fullItems);
  const totalHours = fullItems.length * 4;

  mainPlan.push({
    id: `main-${mainPlan.length + 1}`,
    date,
    weekday: weekdayZh(date),
    dayType: "正常",
    ieltsPriority: fullItems.length > 1 ? "完整模考 x2" : "完整模考",
    ieltsPlan: plan,
    ieltsModule: fullModuleText(fullItems),
    cambridge: fullItems.map((item) => item.cambridge).join(" + "),
    trainingItems,
    projectType: "",
    projectPlan: "",
    limits: limitsFor(date, fullItems),
    status: "未开始",
    actual: "",
    projectModule: "",
  });

  dailyTemplates.push({
    id: `daily-${dailyTemplates.length + 1}`,
    date,
    weekday: weekdayZh(date),
    dayType: "正常",
    swim: "可选：当天体力允许再安排游泳",
    morningEarly: "可选：早泳 / 早餐 / 热身",
    morningCore: `${fullItems[0].title}；单套约4小时`,
    afternoon: fullItems[1] ? `${fullItems[1].title}；单套约4小时` : "可选：自由安排 / 午休 / 错题整理",
    evening: "可选：晚餐 + 缓冲",
    night: "可选：错题 / 单词 / 口语素材轻量收尾",
    mainTask: plan,
    notes:
      fullItems.length > 1
        ? `两份完整模考必做；当日总体安排时间：约${totalHours}小时`
        : "第一池完整模考必做；第二池听力+写作可选（默认关闭）",
  });
}

const payload = {
  generatedAt: "2026-07-25T00:00:00.000+08:00",
  source:
    "Planner v41: 2026-07-26 and 2026-07-27 are two-full-mock days; 2026-07-28 has no plan; later full mock sequence is compacted without duplicates",
  mainPlan,
  dailyTemplates,
  planVersion: "2026-07-26-27-double-full-28-empty-v41",
  resetFromDate: "2026-07-26",
};

writeFileSync(outPath, `window.IELTS_PLANNER_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`Wrote ${mainPlan.length} mainPlan + ${dailyTemplates.length} dailyTemplates to ${outPath}`);
console.log("First day:", mainPlan[0].date, mainPlan[0].cambridge);
console.log("Last day:", mainPlan.at(-1).date, mainPlan.at(-1).cambridge);
