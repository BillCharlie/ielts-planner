import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const context = {};
vm.runInNewContext(await readFile(new URL("../eu-radar.js", import.meta.url), "utf8"), context);
const data = context.EU_RADAR;

test("merges the radar dataset with the guide's A/B/C grouping", () => {
  // 分组按申请机制，不按地理：八国各自归入 A／B／C。
  assert.deepEqual(Array.from(data.GROUPS, (g) => g.id), ["A", "B", "C"]);
  const byGroup = {};
  for (const row of data.SYSTEMS) (byGroup[row.group] ||= []).push(row.country);
  // 用集合比较：中文的预设排序依码位，不要依赖顺序
  const same = (got, want) => assert.deepEqual([...new Set(got)].sort(), [...want].sort());
  same(byGroup.A, ["荷兰", "瑞典", "丹麦", "挪威"]);
  same(byGroup.B, ["德国", "法国", "比利时"]);
  same(byGroup.C, ["芬兰"]);
  assert.equal(data.SYSTEMS.length, 8);

  // 每个国家都要讲清楚身分、入口、经费与课程，否则表格没有意义。
  for (const row of data.SYSTEMS) {
    for (const key of ["identity", "entry", "funding", "coursework", "action", "sources"]) {
      assert.ok(row[key] && row[key].length > 2, `${row.country} 缺 ${key}`);
    }
  }
});

test("keeps the source data verbatim: no invented deadlines or salaries", () => {
  assert.equal(data.JOBS.length, 10);
  // 原始公告没写的就该保持「未公开」，不可用估算值替换。
  const vague = data.JOBS.filter((job) => /未公开|未公布/.test(`${job.salary}${job.deadlineText}${job.startDate}`));
  assert.ok(vague.length >= 3, "应保留原始公告的『未公开』标注");
  for (const job of data.JOBS) {
    assert.ok(job.sourceUrl.startsWith("http"), `${job.id} 缺来源连结`);
    assert.ok(["active", "upcoming", "verify", "closed"].includes(job.status));
  }
  // 过期职缺要保留并标记 closed，不是删掉。
  assert.ok(data.JOBS.some((job) => job.status === "closed"));
});

test("search matrix and triage questions come through", () => {
  assert.equal(data.SEARCH_MATRIX.length, 8);
  assert.ok(data.SEARCH_MATRIX.some((row) => /p-GaN gate/.test(row.terms)));
  assert.equal(data.TRIAGE.length, 6);
  assert.match(data.TRIAGE[0].q, /Who employs/);
  assert.equal(data.SOURCES.length, 33);
  for (const src of data.SOURCES) assert.ok(src.url.startsWith("http"), `${src.name} 缺网址`);
});

test("display text is simplified Chinese, URLs untouched", () => {
  const all = JSON.stringify(data);
  // 转换后不应残留这些繁体字形
  assert.doesNotMatch(all, /[後說體臺據證際經過導繫]/);
  assert.match(all, /德国|荷兰|比利时/);
  assert.ok(data.SOURCES[0].url.startsWith("https://"));
});
