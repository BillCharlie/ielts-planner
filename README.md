# IELTS 制程整合日历

这是一个 PWA 日历 + 主计划表，现在支持 Railway 后端云端同步，也保留 GitHub Pages 纯前端部署能力。

## 本地/网页使用

1. 打开网页。
2. 输入密码 `Bill`。
3. 日历以小时编辑 06:00 到 24:00 的安排。
4. 主计划表支持编辑、保存、复制行、插入行、删除行、上下移动和继续延伸。
5. 未保存的日历小时或主计划表行会在保存按钮上变色提醒。
6. 每天的 IELTS 和游泳是固定提醒；主计划当天事项未排进小时表时会提示。

## Railway 后端部署

Railway 直接连接这个 GitHub 仓库即可。项目根目录已有：

- `package.json`
- `server/server.js`
- `railway.json`

建议在 Railway 添加一个 Postgres 数据库，并设置环境变量：

- `BILL_PASSWORD=Bill`
- `SESSION_SECRET=一个随机长字符串`
- `DATABASE_URL=Railway Postgres 自动提供`

部署后访问 Railway 域名，网页和 API 在同一个域名下，登录 `Bill` 后就会自动云端同步。

## GitHub Pages + Railway API

如果继续用 GitHub Pages 打开前端，也可以同步到 Railway 后端。部署 Railway 后，把 `config.js` 里的地址改成：

```js
window.IELTS_API_BASE = "https://你的-railway-域名";
```

或者第一次打开 GitHub Pages 时在 URL 后加：

```text
?api=https://你的-railway-域名
```

这个地址会保存到浏览器本地，以后不用重复输入。

## Android App / Widget

Android 工程在 `android-widget/`。

使用方法：

1. 用 Android Studio 打开 `android-widget/`。
2. 构建并安装到手机。
3. 打开 App，输入 Railway URL 和密码 `Bill`。
4. 回到桌面添加 `IELTS Planner Today` 小组件。

Widget 会读取同一个 Railway 后端的 `/api/widget/today`，显示今天的主计划和小时安排。
