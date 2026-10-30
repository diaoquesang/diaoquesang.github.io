# Yifei Sun — Homepage v2

完全数据驱动的个人主页：版式与内容分离，**改内容只需要编辑 `_data/*.yml`，不需要碰任何 HTML/Liquid**。
页面所有文字、链接、图片、歌曲与原版 `diaoquesang.github.io` 逐条一致。

## 目录结构

```
_config.yml          站点设置 + 作者档案（姓名 / 头像 / bio / 所在地）
_data/
  navigation.yml     侧边栏导航（锚点顺序）
  social.yml         侧边栏社交图标（可增删排序）
  about.yml          About Me 段落 + 统计徽章
  education.yml      教育经历（logo + 一行富文本）
  experience.yml     科研/实习经历
  news.yml           News 列表（新的放最上面）
  honors.yml         Distinctions / Scholarships
  funding.yml        科研项目资助
  publications.yml   论文：featured 大卡片 / list 折叠列表
  patents.yml        发明专利 / 外观专利
  software.yml       软著：featured 卡片 / list
  competitions.yml   国际国家级 / 区域省级奖项
  music.yml          音乐卡片 + 底部播放器歌单（同一份数据驱动）
_includes/           可复用组件（卡片、列表、播放器等）
_layouts/default.html 页面骨架（侧边栏 + 正文 + 播放器）
_pages/about.md      纯装配文件：只负责按顺序引入各区块
assets/css/main.css  全部样式（顶部 CSS 变量即主题，改一处换全局配色）
assets/js/           播放器 / 主题切换 / 导航高亮
images/ music/ pdfs/ 静态资源，路径与原版一致
```

## 常见维护操作

- **加一条新闻**：在 `_data/news.yml` 顶部加 `- date: "YYYY.MM"` 和 `text_html: '...'`（HTML 直接写即可）。
- **新论文（大卡片）**：复制 `_data/publications.yml` 中任意一条 `featured:`，改 `badge / image / title / url / resources / authors_html / venue_html`。`image` 可写站外 URL 或站内相对路径（如 `images/XXX.jpg`）。
- **新论文（列表行）**：加到对应 `list:`，字段多一个 `highlight`（如 `MICCAI 2026 (Oral)`）。
- **加一首歌**：在 `_data/music.yml` 的 `tracks:` 追加一项即可——卡片和底部播放器歌单会同步更新，无需改第二处。
- **改配色/字号**：只改 `assets/css/main.css` 顶部 `:root` 里的 CSS 变量；暗色主题在 `[data-theme="dark"]` 中覆盖同名变量。

## 本地预览（无需 Ruby）

```bash
cd tools && npm install liquidjs js-yaml   # 一次性
node scripts/preview.mjs                    # 生成 preview/index.html
npx serve .                                 # 浏览器打开 http://localhost:3000/preview/
```

`preview/` 只是本地快照，不参与 GitHub Pages 构建（`_config.yml` 已 exclude）。

## 部署

把本目录内容作为仓库根推到 `diaoquesang.github.io`（GitHub Pages 用默认 Jekyll 构建即可，无需 Actions）。
`_config.yml` 已保留原版 Google/Bing 站点校验，SEO 归属不变。

## 与原版对应的已知小问题（按“内容一致”原则原样保留）

- 浙江大学计算机学院链接为 `http://http://www.cs.zju.edu.cn/`（原版即如此，点开才会发现是坏链）。
- ACM MM 2026 那条新闻的链接指向 MICCAI 2026 官网（原文即如此）。
- MIND 论文的 `[🌐 Page]`、`[📜 Poster]` 是空链接（原文即如此）。
- 原版 `p/` 目录已废弃，新站未带入。
