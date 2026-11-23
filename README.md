# 圣诞树 · Merry Christmas

一棵会旋转、呼吸、闪烁的粉色圣诞树 —— 纯 Canvas 粒子动画，零依赖、单页、响应式，可直接部署到任意静态托管平台。

## 目录结构

```
christmas-tree-site/
├── index.html      # 页面入口（含 SEO / Open Graph / 移动端适配）
├── favicon.svg     # 网站图标（浅紫色星星）
├── audio/
│   └── bgm.mp3     # 背景音乐（点开信时自动播放）
├── gifts/
│   └── star1~5.png # 绕树旋转的 5 颗小星星（点击查看图片）
├── css/
│   └── style.css   # 页面基础样式
└── js/
    └── main.js     # 全部动画逻辑（粒子树、流星、花瓣、星光、文字）
```

## 本地运行

直接双击 `index.html` 即可在浏览器打开（无需服务器）。

也可以在目录下启动一个本地服务器预览：

```bash
# 方式一：Python
python -m http.server 8000
# 方式二：Node.js
npx serve .
```

然后访问 <http://localhost:8000>。

## 部署上线

### GitHub Pages

1. 新建仓库并把本目录推送到 `main` 分支；
2. 仓库 **Settings → Pages → Source** 选择 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`；
3. 保存后稍等片刻，即可通过 `https://<用户名>.github.io/<仓库名>/` 访问。

### Vercel / Netlify

把整个 `christmas-tree-site` 目录拖到 Vercel 或 Netlify 的导入面板即可，默认配置无需改动，会自动生成 `https://xxx.vercel.app` 之类的地址。

## 常见调整

| 想改什么 | 改哪里 |
| --- | --- |
| 树的颜色 / 粒子数量 | `js/main.js` 顶部 `PALETTE` 和 `buildScene()` 里的 `total`（默认 7200） |
| 星星颜色 / 粒子数 | `js/main.js` 顶部 `STAR_PALETTE` 和 `buildStar()` 里的 `count`（默认 560） |
| 祝福文字 | `js/main.js` 中 `drawGreeting()` 的 `fillText('Merry Christmas', ...)` |
| 圣诞信内容 | `index.html` 里 `.letter-body` 的段落（信藏在树顶的星星里，点击星星打开） |
| 开场文字 / 节奏 | `js/main.js` 顶部 `OPEN_TEXT` 及 `OPEN_T0`、`OPEN_CHAR`、`INTRO_DELAY` |
| 背景音乐 | `audio/bgm.mp3`（点开信时自动播放，右上角 🎵 按钮可暂停/恢复） |
| 页面标题 / 描述 | `index.html` 的 `<title>` 与 `<meta>` |
| 旋转速度 / 呼吸节奏 | `js/main.js` 中 `render()` 的 `angle` 与 `drawTree()` 的 `breathe` |

祝圣诞快乐！🎄
