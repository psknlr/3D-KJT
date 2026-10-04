# 康家滩欣院 · 晋商大院与黄河村史

山西省忻州市保德县东关镇康家滩村 · 康家滩欣院旅游文化网站（GitHub Pages 静态站点）。

清代中期，保德康氏走口外经营甘草发家后营建此院；院中砖雕兼有汉族与蒙古族风格，被视为中原文化与大漠文化交融的典型。抗战时期这里是八路军一二〇师二旅司令部所在地，2002 年公布为县级文物保护单位。

## 栏目

| 栏目 | 内容 |
| --- | --- |
| 首屏 | 前院盛景推定图、竖排书法标题 |
| 壹 院史 | 院落概况、现场文物说明牌（原照477）、关键数字 |
| 贰 晋商 · 走口外 | 走西口与甘草商路示意地图（动画）、晋商归乡营宅 |
| 叁 营造 | 可点选的院落平面（A–I 构件 + 后院占位）、砖雕三法、汉蒙纹样图谱 |
| 肆 云游三维 | 加载研究模型 `courtyard.glb`：晨 / 午 / 暮 / 夜光照、构件标签与视点漫游、推定构件标示 |
| 伍 盛景 | 九组盛景复原图版，每组附“本图呈现 / 仍需核实”与对照原照 |
| 陆 家训 | 照壁对联“治家要术不外勤而俭，处世良谋唯在谦而和”、四配院八字砖雕、泥封护宝 |
| 柒 黄河古渡 | 《保德州乡土志》书影：港泊、康熙渡河；州志地名、府谷县志山崩 |
| 捌 烽火 | 一二〇师二旅司令部、许光达统战故事、大众剧社 |
| 玖 年表 · 拾 原照档案 · 拾壹 参访 · 拾贰 史料 | 时间线、39 幅现状原照筛选浏览、参访信息、出处与待考问题 |

## 本地预览

页面使用 ES Module，需要通过本地服务器打开（直接双击 `index.html` 时三维模块无法加载）：

```bash
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 发布到 GitHub Pages

仓库 **Settings → Pages → Build and deployment**：Source 选 *Deploy from a branch*，分支选存放本站的分支（合并到 `main` 后选 `main`），目录选 `/ (root)`。站点为纯静态文件，无需构建；`.nojekyll` 已就位。

## 目录

```
index.html                     页面
assets/css/style.css           样式（宣纸 / 墨 / 青砖 / 朱砂 / 晋商金）
assets/css/fonts.css           自托管字体（tools/build_fonts.py 生成）
assets/js/main.js              导航、地图动画、平面图、图版、档案、灯箱、三维按需加载
assets/js/courtyard3d.js       three.js 三维云游
assets/data/archive.js         九组图版与 39 幅原照的说明（由模型包目录生成）
assets/models/                 三维模型（meshopt 压缩版）
assets/img/plates/             九组盛景图版（含 -sm 缩略图）
assets/img/photos/             现状原照（编号与原始档案一致）
assets/img/renders/            本站三维模型渲染静帧
assets/fonts/                  Ma Shan Zheng 与 Noto Serif SC 子集（SIL OFL 1.1）
assets/vendor/three/           three.js r169（MIT）
tools/build_fonts.py           字体子集化脚本
```

## 素材来源

- **盛景图、三维模型、现状原照**：康家滩宅院建筑细节复原研究第三版（`jin-courtyard-v3_part*.zip`，`reconstruction-notes.html`）。三维模型经 `gltf-transform prune / dedup / meshopt` 压缩（9.5 MB → 2.1 MB），构件命名与 extras（来源照片编号、可信度）未改动。
- **文字史料**：《保德名胜》书页、现场文物说明牌、《康家滩欣院史料与网站内容总稿》所列 S01–S14 来源；页面“史料”一节逐条列出。
- **方志书影**：Wikimedia Commons 所收国家图书馆来源扫描（公共领域）。
- 现状原照中两张含入镜人物的照片（443、418）已裁去人物。

## 内容原则

- 盛景图是依据原照的视觉推定，三维模型是未经测绘的近似网格；页面中均如此标注。
- 院主人仅称“康氏”，不使用书页中的个人姓名。
- 面积采用现场说明牌“占地982平方米”；《保德名胜》“总面积20000平方米”一说与之差距悬殊，列入待考问题。
- 史料不足处（建院确切年份、415 号门额释读、后院形制等）明确留空，不作补写。

## 更新内容

- **增删原照**：照片放入 `assets/img/photos/编号.jpg` 与 `编号-sm.jpg`，并在 `assets/data/archive.js` 的 `photos` 中加一条。
- **修改文字后**：如新增了书法字体用字，运行 `python3 tools/build_fonts.py <字体源目录>` 重新生成字体子集（用法见脚本注释）；未覆盖的字会自动回退到系统字体。
