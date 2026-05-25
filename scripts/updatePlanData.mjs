import fs from "node:fs";
import vm from "node:vm";

const content = fs.readFileSync("plan-data.js", "utf8");
const sandbox = { window: {} };
vm.runInNewContext(content, sandbox);

const payload = sandbox.window.IELTS_PLANNER_DATA;
const originalMain = payload.mainPlan;
const originalDaily = new Map(payload.dailyTemplates.map((item) => [item.date, item]));
const startDate = "2026-05-26";
const alreadyAdjusted = originalMain.some((item) => item.date === "2026-06-17" && /不排雅思/.test(item.ieltsPlan || ""));
const extraDays = alreadyAdjusted ? 0 : 6;
const endDate = addDays(originalMain.at(-1).date, extraDays);
const blockedStart = "2026-06-17";
const blockedEnd = "2026-06-22";

const ieltsQueue = originalMain
  .filter((item) => !alreadyAdjusted && item.date >= blockedStart)
  .map((item) => ({
    ieltsPriority: item.ieltsPriority,
    ieltsPlan: item.ieltsPlan,
    ieltsModule: item.ieltsModule,
    cambridge: item.cambridge,
  }));

let queueIndex = 0;
const mainPlan = [];
for (let date = startDate, index = 0; date <= endDate; date = addDays(date, 1), index += 1) {
  const original = originalMain.find((item) => item.date === date) || {};
  const row = {
    id: `main-${index + 1}`,
    date,
    weekday: weekdayZh(date),
    dayType: original.dayType || "正常",
    ieltsPriority: original.ieltsPriority || "",
    ieltsPlan: original.ieltsPlan || "",
    ieltsModule: original.ieltsModule || "",
    cambridge: original.cambridge || "",
    projectType: original.projectType || "",
    projectPlan: original.projectPlan || "",
    limits: original.limits || "按主计划执行",
    status: original.status || "未开始",
    actual: original.actual || "",
  };

  if (date >= blockedStart && date <= blockedEnd) {
    row.dayType = "端午旅行";
    row.ieltsPriority = "暂停";
    row.ieltsPlan = "端午不排雅思";
    row.ieltsModule = "暂停";
    row.cambridge = "";
    row.projectType = "端午";
    row.projectPlan = "端午/行程；不排雅思计划，实验专案视行程暂停";
    row.limits = "端午：2026/06/17–2026/06/22 不排任何雅思计划";
  } else if (!alreadyAdjusted && date > blockedEnd) {
    const shifted = ieltsQueue[queueIndex];
    if (shifted) {
      row.ieltsPriority = shifted.ieltsPriority;
      row.ieltsPlan = shifted.ieltsPlan;
      row.ieltsModule = shifted.ieltsModule;
      row.cambridge = shifted.cambridge;
      queueIndex += 1;
    }
  }

  row.projectType = normalizeProjectType(row);
  row.projectModule = row.projectType === "实验专案" ? inferModule(row.projectPlan) : "";
  row.projectPlan = normalizeProjectPlan(row);
  row.limits = normalizeLimits(row.limits);
  mainPlan.push(row);
}

const dailyTemplates = mainPlan.map((item, index) => {
  const original = originalDaily.get(item.date) || {};
  const hasIelts = hasActualIelts(item);
  const projectText = item.projectType === "实验专案"
    ? "实验专案 / 资料整理主任务"
    : item.projectType === "学务"
      ? "学务安排 / 路程 / 上课"
      : "自由调配 / 生活整理";

  if (isBlockedDuanwu(item.date)) {
    return {
      id: `daily-${index + 1}`,
      date: item.date,
      weekday: item.weekday,
      dayType: item.dayType,
      swim: "可早泳；晚上视行程决定",
      morningEarly: "早泳 / 早餐 / 行程准备",
      morningCore: "端午不排雅思；行程 / 休息 / 生活安排",
      afternoon: "行程 / 家庭时间 / 休息",
      evening: "晚餐 + 放空",
      night: "游泳 / 拉伸 / 早睡",
      mainTask: "端午不排雅思",
      notes: "2026/06/17–2026/06/22 不排任何雅思计划；只保留游泳和生活安排。",
    };
  }

  return {
    id: `daily-${index + 1}`,
    date: item.date,
    weekday: item.weekday,
    dayType: item.dayType,
    swim: original.swim || "晚泳 20:30–21:30；必要时早泳",
    morningEarly: original.morningEarly || "可早泳 / 早餐 / 今日任务启动",
    morningCore: hasIelts ? `IELTS主任务：${item.ieltsModule || item.ieltsPlan}` : "休息 / 生活整理",
    afternoon: projectText,
    evening: original.evening || "晚餐 + 自由缓冲",
    night: hasIelts ? "游泳 + IELTS错题/口语/作文轻量收尾" : "游泳 / 拉伸 / 轻量整理",
    mainTask: hasIelts ? item.ieltsPlan : item.projectType || "自由安排",
    notes: item.projectType === "实验专案"
      ? "实验专案模块可在主计划表中选择，并为每个模块规划预计天数。"
      : original.notes || "上午固定IELTS核心，下午按当天主任务自由调配。",
  };
});

payload.generatedAt = new Date().toISOString();
payload.source = "IELTS planner adjusted: Duanwu no IELTS, experiment modules, extended to August";
payload.mainPlan = mainPlan;
payload.dailyTemplates = dailyTemplates;

fs.writeFileSync(
  "plan-data.js",
  `window.IELTS_PLANNER_DATA = ${JSON.stringify(payload, null, 2)};\n`,
  "utf8",
);

console.log(`Updated plan-data.js: ${mainPlan.length} days, ${mainPlan[0].date} to ${mainPlan.at(-1).date}`);

function hasActualIelts(item) {
  return item.ieltsPlan && !/休息|暂停|不排雅思/.test(item.ieltsPlan);
}

function isBlockedDuanwu(date) {
  return date >= blockedStart && date <= blockedEnd;
}

function normalizeProjectType(item) {
  const text = `${item.dayType} ${item.projectType} ${item.projectPlan}`;
  if (/休息/.test(`${item.dayType} ${item.projectType}`)) return "休息";
  if (/端午\/行程|端午旅行/.test(text)) return "端午";
  if (/Meeting|上课|回中央|TSMC/.test(text)) return "学务";
  if (/考试周/.test(`${item.dayType} ${item.projectType}`) && /不排/.test(item.projectPlan || "")) return "休息";
  if (/制程|量测|TCAD|光罩|Runcard|黄光|显影|ICP|RIE|RTA|PVD|PECVD|设备|Pad|recess|TLM|CV|Id|Vg|Vd|AI-TCAD|蚀刻|金属|退火|钝化|runcard/i.test(text)) {
    return "实验专案";
  }
  if (/考试周/.test(text)) return "休息";
  if (!item.projectPlan) return "";
  return item.projectType || "";
}

function normalizeProjectPlan(item) {
  if (item.projectType === "实验专案") return "";
  if (item.projectType === "学务") return "";
  if (item.projectType === "休息") return "";
  if (item.projectType === "端午") return "";
  return "";
}

function inferModule(text) {
  const value = text || "";
  if (/光罩|黄光|显影|对准|Runcard|runcard|Pad|recess/.test(value)) return "光罩";
  if (/量测|Id|Vg|Vd|CV|TLM|曲线|指标/.test(value)) return "量测";
  if (/TCAD|AI-TCAD|baseline|run list|收敛/.test(value)) return "TCAD";
  return "制程";
}

function normalizeLimits(value) {
  return `${value || ""}`
    .replaceAll("制程", "实验专案")
    .replaceAll("TCAD", "实验专案");
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayZh(iso) {
  const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return names[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}
