# IELTS 制程整合日历

这是一个可直接部署到 GitHub Pages 的纯前端 PWA。

## 使用

1. 打开 `index.html`。
2. 输入保存密码 `Bill`。
3. 在日历里选择日期，按小时编辑 06:00 到 24:00 的计划。
4. 点击“排入主任务”可把当天主计划事项放入小时表。
5. 主计划事项未排入当天小时表时，页面会显示提醒。

## GitHub Pages 部署

把这些文件放到仓库根目录并启用 GitHub Pages：

- `index.html`
- `styles.css`
- `app.js`
- `plan-data.js`
- `manifest.webmanifest`
- `sw.js`
- `icon.svg`
- `icon-192.png`
- `icon-512.png`

GitHub Pages 设置建议：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

安卓 Chrome 打开 Pages 地址后，可从浏览器菜单选择“添加到主屏幕”。
