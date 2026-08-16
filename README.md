# 研究与 IELTS 规划记事薄

这是一个可安装的个人规划网站，现已把原 IELTS 日历与完整的硕士研究／PhD 路线整合到同一个项目中。

## 主要页面

- **研究路线**：GaN FinFET、TCAD / AI、IELTS、IEDMS / IWN、PhD 申请、Gate 与 Plan A / B。
- **日历**：按小时安排 06:00–24:00 的任务。
- **总体计划**：建立日期后，可编辑、复制、插入、删除与延伸计划行。

任务、Gate、申请状态、日期与小时安排都会保存在浏览器；连接 Railway 后也会同步到云端。

IEDMS 与 IWN 两项投稿均已接受，目前追踪的是 poster、现场表达与参会节点。

IELTS 二战考试日已定于 `2026/11/06`；Speaking 的具体时间与地点待通知后补登。

日历会自动定位当天，并已预排：

- `2026/08/24–08/28`：每天 1 份完整真题
- 从 `2026/09/07` 起：周一 2 份；周二全天制程；周三半天制程＋书报讨论＋Meeting；周四至周日每天 1 份
- 周二、周三不排 IELTS 真题
- `2026/11/06`：IELTS 二战考试日，不排制程与其他真题

日历中的“单词卡”按钮可输入当天的纯英文单词或短语，并可随时删除。选择任一周日时，会显示截至该周日为止的全部历史卡片，并依自然周分组累计，不限制周数；全部卡片可导出为 `.xlsx`，其中包含 `Cards` 与 `Weekly Summary` 两个工作表。

完整真题范围为 Cambridge 9–21，共 52 份。加入周日后，考试日前共有 56 个位置：先依序排完 `C9T1` 至 `C21T4`，最后 4 个位置重做 `C18T4`、`C19T4`、`C20T4`、`C21T4`。

## 本次资料重置

版本 `2026-08-16-sunday-paper-v6` 会在首次打开时自动：

- 清空旧 IELTS 日期与 Cambridge 题目安排
- 清空旧小时表、完成记录与备注
- 清空旧专案行与模块进度
- 将新的研究任务、Gate 与 PhD 申请状态归零

旧内容仍可从 Git 历史找回，但不会继续出现在新计划中。

## 本地运行

```powershell
npm install
npm run dev
```

默认打开：

```text
http://localhost:3000
```

登录密码仍为 `Bill`。

## Railway 云端同步

项目可直接部署到 Railway。建议连接 Postgres，并设置：

- `BILL_PASSWORD`
- `SESSION_SECRET`
- `DATABASE_URL`

GitHub Pages 若要连接 Railway API，可在 `config.js` 填入地址，或首次打开时加上 `?api=https://你的-railway-域名`。

## Android Widget

Android 工程位于 `android-widget/`，Widget 会读取相同后端的 `/api/widget/today`。日期归零期间会显示没有当日主计划，直到你重新建立日期。
