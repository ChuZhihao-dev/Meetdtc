# Shopify Horizon 主题 · 定制 Section 高性能开发规范

> **用途**：本文件用于约束 AI（或开发者）在 Horizon 主题中开发定制 `section` / `block` / `snippet` 时的性能与代码质量标准。
> **使用方式**：将本文件放入项目根目录（如 `docs/` 或 `.cursor/rules/`、`CLAUDE.md` 引用），每次让 AI 写 section 时要求其**先阅读并严格遵守**本规范。

---

## 0. 核心原则（AI 必须先理解）

1. **先看现有代码再写**：开发前先阅读 Horizon 现有的 `sections/`、`blocks/`、`snippets/`、`assets/` 中相似实现，**复用现有 snippet、CSS 变量、JS 基类与工具函数**，不要重复造轮子。
2. **零 JS 优先**：能用 HTML + CSS 解决的，不写 JS（如 `<details>`、CSS scroll-snap、`:has()`、容器查询）。
3. **按需加载**：资源（图片、视频、JS、CSS）只在需要时加载；首屏之外一律延迟。
4. **不引入第三方库**：除非有明确且不可替代的理由，禁止引入 jQuery、Swiper、GSAP 等大型库。
5. **避免布局抖动（CLS）**：所有媒体必须预留空间（`aspect-ratio` / 明确宽高）。
6. **服务端渲染（Liquid）成本也是性能**：Liquid 渲染慢会直接拖慢 TTFB。
7. **可在 Theme Editor 中正常工作**：支持 `shopify:section:load/unload`、`block:select` 等事件，且不能因此牺牲线上性能。

### 性能预算（单个 Section 目标）

| 指标 | 目标 |
|---|---|
| 该 Section 新增 JS（未压缩） | ≤ 5 KB（理想为 0） |
| 该 Section 新增 CSS（未压缩） | ≤ 6 KB |
| 首屏外图片 | 全部 `loading="lazy"` |
| 对 LCP 的影响 | 不得使 LCP 变差；首屏 Section 的主图需 `fetchpriority="high"` |
| 对 CLS 的影响 | 0（不得引入新的布局偏移） |
| 对 INP 的影响 | 主线程单任务 < 50ms |
| Liquid 渲染 | 避免嵌套循环、避免大集合遍历 |

---

## 1. 文件结构与组织

```
sections/custom-xxx.liquid      # Section 入口（schema + 结构 + 局部 stylesheet）
blocks/_custom-xxx-item.liquid  # 可复用 Block（以 _ 开头表示私有 block）
snippets/custom-xxx-*.liquid    # 可复用片段
assets/custom-xxx.js            # 仅在确实需要交互时创建
```

规则：

- 命名使用 `kebab-case`，自定义文件统一加前缀（如 `custom-`、`x-`），便于和主题原生文件区分，也方便后续主题升级合并。
- 优先使用 **Theme Blocks 架构**（`{% content_for 'blocks' %}` + `blocks/` 目录），而不是在 section schema 里硬编码 blocks，提升复用性。
- 一个 Section 只做一件事。超过 ~200 行 Liquid 时，拆分为 snippet。
- **不要直接修改 Horizon 原生文件**；确需修改时，在 PR / 注释中标记，方便升级时 diff。

---

## 2. Liquid 性能规范

### 2.1 必须遵守

- ✅ 使用 `{% render %}`，**禁止** `{% include %}`（已废弃，且作用域污染、更慢）。
- ✅ 多行 Liquid 逻辑使用 `{% liquid ... %}` 标签，减少解析开销、提高可读性。
- ✅ 重复使用的计算结果用 `assign` 缓存一次，不要在循环里重复计算。
- ✅ 循环必须限制数量：`{% for item in collection.products limit: section.settings.products_to_show %}`。
- ✅ 在循环**外**完成不变量的计算（如 `sizes` 字符串、class 拼接、设置项读取）。
- ✅ 提前 `break` / 提前判断空值，避免无意义渲染：

```liquid
{%- liquid
  assign products = section.settings.collection.products
  if products.size == 0 and request.design_mode == false
    return
  endif
-%}
```

> 注意：section 中不能使用 `return`，请用 `if` 包裹整个输出。上例仅表达"提前判断空"的思想，section 中应写为 `if products.size > 0 ... endif`。

### 2.2 严格禁止

- ❌ **嵌套 for 循环**遍历大集合（如 `collection.products` 中再遍历 `variants`、`metafields`）。
- ❌ 使用 `all_products['handle']` 在循环里反复取商品（每次都是一次对象加载，有上限且慢）。
- ❌ 在循环中重复调用 `| image_url`、`| money`、`| where`、`| sort` 等可预先处理的 filter。
- ❌ 对大数组使用 `| where` / `| sort` / `| map` 链式调用。
- ❌ 无分页地遍历 `collection.products`（默认上限 50，且慢）。
- ❌ 在 Section 里输出大量未使用的 JSON（如 `{{ product | json }}`），体积大、序列化慢。
- ❌ 在 Liquid 里拼接大段内联 `<script>` 或 `<style>`（除非是极少量的动态 CSS 变量）。

### 2.3 数据输出

- 需要传给 JS 的数据，**只传必要字段**，使用 `data-*` 属性或精简 JSON，不要序列化整个对象。
- 动态数据优先使用 **Section Rendering API** 局部刷新（Horizon 已有相关模式），不要整页刷新。

---

## 3. 图片与媒体（影响 LCP/CLS 最大的部分）

### 3.1 图片

- 使用 `image_url` + `image_tag`，生成 `srcset`；**必须**设置合理的 `sizes`。
- 必须有 `width` / `height` 或 CSS `aspect-ratio`，防止 CLS。
- **首屏判断**：根据 `section.index` 决定加载策略（Horizon 已有类似惯例，优先复用其 snippet）。

```liquid
{%- liquid
  assign is_above_fold = false
  if section.index <= 2
    assign is_above_fold = true
  endif
-%}

{%- if section.settings.image != blank -%}
  {{
    section.settings.image
    | image_url: width: 2400
    | image_tag:
      widths: '400, 600, 800, 1200, 1600, 2000, 2400',
      sizes: '(min-width: 1200px) 50vw, 100vw',
      loading: is_above_fold | ternary: 'eager', 'lazy',
      fetchpriority: is_above_fold | ternary: 'high', 'auto',
      decoding: 'async',
      class: 'custom-hero__image'
  }}
{%- endif -%}
```

规则：

| 场景 | `loading` | `fetchpriority` | `decoding` |
|---|---|---|---|
| 首屏主图（LCP 候选，每页**仅 1 张**） | `eager` | `high` | `async` |
| 首屏其它图 | `eager` | `auto` | `async` |
| 非首屏图 | `lazy` | `auto` | `async` |

- 不要给多张图同时设置 `fetchpriority="high"`。
- 避免 CSS `background-image` 承载内容图（无法 srcset、无法 lazy、不利于 LCP 预加载）；如需背景效果，使用 `<img>` + `object-fit: cover`。
- 需要纯装饰图时 `alt=""`；内容图必须有有意义的 `alt`。
- 占位图使用主题已有的 `placeholder_svg_tag`，不要引入外部占位图。

### 3.2 视频

- 优先使用 Shopify 托管视频（`video_tag` / `media`），并设置 `poster`。
- 非首屏视频：`preload="none"`，点击/进入视口后再加载。
- 背景视频：`muted playsinline loop autoplay`，移动端可考虑降级为 poster 图以节省流量。
- 第三方嵌入（YouTube / Vimeo）使用**点击后加载（facade）**或 `loading="lazy"` iframe，禁止首屏直接加载 iframe。

### 3.3 图标

- 使用主题已有的 icon snippet 或内联 SVG；**不要**引入整套 icon font。
- 内联 SVG 保持精简（经过 SVGO 优化）。

---

## 4. CSS 规范

### 4.1 编写位置与方式

- Section 专属样式写在 `{% stylesheet %}` 标签内（Shopify 会合并/压缩并按需输出），**不要**使用 `{% style %}` 写静态样式。
- 仅**真正动态**的值（来自 schema 设置的颜色、间距、尺寸）使用 `{% style %}` 输出 **CSS 变量**，再由静态 CSS 消费：

```liquid
{% style %}
  #shopify-section-{{ section.id }} {
    --custom-gap: {{ section.settings.gap }}px;
    --custom-overlay-opacity: {{ section.settings.overlay_opacity | divided_by: 100.0 }};
  }
{% endstyle %}

{% stylesheet %}
  .custom-banner {
    display: grid;
    gap: var(--custom-gap, 16px);
  }
{% endstylesheet %}
```

### 4.2 选择器与命名

- 采用 **BEM** 命名：`.custom-banner`、`.custom-banner__title`、`.custom-banner--dark`。
- 选择器层级 ≤ 2 层；**禁止** ID 选择器与 `!important`（除非覆盖第三方且注明原因）。
- 所有类名带 Section 前缀，避免污染全局。
- 优先使用 Horizon 已有的 CSS 变量（颜色方案、间距、字体、圆角等），保证与主题风格统一并支持颜色方案切换。

### 4.3 性能相关

- ✅ 使用 `aspect-ratio` 预留空间。
- ✅ 非首屏的大型 Section 外层可加 `content-visibility: auto; contain-intrinsic-size: auto 600px;`，减少渲染成本（⚠️ 首屏 Section 不要用）。
- ✅ 用 `contain: layout paint style` 隔离独立组件（谨慎，确认不影响溢出展示）。
- ✅ 动画只使用 `transform` 与 `opacity`（合成层属性）。
- ✅ `will-change` 仅在动画**即将发生**时设置，动画结束后移除，**禁止**常驻。
- ✅ 必须处理 `@media (prefers-reduced-motion: reduce)`。
- ✅ 优先使用现代布局：`grid` / `flex` / `gap` / `clamp()` / 容器查询 `@container`。
- ❌ 禁止 `@import`。
- ❌ 禁止动画 `width/height/top/left/margin`（触发重排）。
- ❌ 避免大面积 `box-shadow` / `filter: blur()` / `backdrop-filter` 叠加（移动端 GPU 开销大）。
- ❌ 避免过于复杂的 `:has()` / `:not()` 链式选择器作用于大 DOM。

### 4.4 响应式

- 移动端优先（mobile-first），使用 `min-width` 媒体查询。
- 使用主题已有断点变量/约定，不要随意新增断点。
- 优先让组件自适应容器（容器查询）而非视口。

---

## 5. JavaScript 规范

### 5.1 是否需要 JS？

按顺序自查：

1. 能用纯 CSS / 原生 HTML 完成吗？（`<details>`、`scroll-snap`、`:target`、`popover`、`dialog`）
2. 能复用 Horizon 现有组件（如已有的 slideshow、dialog、drawer、accordion、marquee 等）吗？
3. 只有以上都不满足时，才写新 JS。

### 5.2 实现方式

- 使用 **Web Component（Custom Element）**，遵循 Horizon 现有基类与模式（如继承主题提供的 `Component`，使用 `ref` / `data-ref` 与声明式事件绑定等，**以仓库内现有代码为准**）。
- 脚本以 **ES Module** 加载，使用 `type="module"`（天然 defer），并放在对应 section 内，**仅在该 section 出现时加载**：

```liquid
<script src="{{ 'custom-xxx.js' | asset_url }}" type="module" fetchpriority="low"></script>
```

- 同一页面多个同类 Section 实例，脚本只会执行一次（模块缓存）；组件逻辑通过 `customElements.define` 复用。
- 重功能使用**动态 `import()`** 懒加载（如点击后才加载弹窗逻辑）。

### 5.3 性能与健壮性

- ✅ 用 `IntersectionObserver` 实现"进入视口再初始化"（动画、懒加载视频、计数器等）。
- ✅ 事件使用**事件委托**；滚动/触摸类监听加 `{ passive: true }`。
- ✅ 高频事件（`resize`、`scroll`、`input`）使用 `requestAnimationFrame` 节流或防抖；优先改用 `ResizeObserver` / `IntersectionObserver`。
- ✅ **读写分离**：先批量读取布局属性（`offsetHeight`、`getBoundingClientRect`），再批量写入样式，避免强制同步布局（layout thrashing）。
- ✅ 在 `connectedCallback` 初始化，在 `disconnectedCallback` 中**清理**所有监听器、Observer、定时器、AbortController。
- ✅ 使用 `AbortController` 统一管理 `addEventListener` 与 `fetch` 的取消。
- ✅ 使用 `const` / `let`、可选链、`async/await`；**不使用**全局变量，不污染 `window`。
- ✅ 用 CSS 类切换状态，而不是逐个修改 `style`。
- ✅ 长任务拆分（`scheduler.yield()` / `setTimeout` / `requestIdleCallback`，注意兼容性回退）。
- ❌ 禁止使用 `document.write`、同步 XHR、`eval`。
- ❌ 禁止在循环中频繁操作 DOM（使用 `DocumentFragment` 或一次性 `innerHTML` / `replaceChildren`）。
- ❌ 禁止轮询（`setInterval` 反复请求）；需要实时数据请使用事件驱动。

### 5.4 Theme Editor 兼容

- 监听并正确处理 `shopify:section:load`、`shopify:section:unload`、`shopify:block:select`、`shopify:block:deselect`。
- 编辑器相关的逻辑**仅在 `Shopify.designMode` 为真时**挂载，避免线上多余代码。

### 5.5 网络请求

- 使用 Section Rendering API / Cart API / Storefront 已有封装；**不要**重复实现 fetch 封装。
- 请求要有错误处理、超时与取消机制；失败时 UI 有降级表现。
- 对相同请求做**去重 / 缓存**（如 `Map` 缓存已获取的 Section HTML）。
- 悬停预加载（prefetch）要节制，仅在用户意图明确（如 `pointerenter` 后延迟 ~100ms）时触发。

---

## 6. Schema（Theme Editor 设置）规范

- 设置项精简：**每个设置都会增加编辑器负担与 Liquid 读取成本**，只暴露商家真正需要的选项。
- 合理分组：使用 `header` 类型分隔，`info` 给出提示。
- 必须设置合理的 `default`，保证新增 Section 即有良好默认表现。
- 数值类使用 `range`（带 `min` / `max` / `step` / `unit`），不要让商家随意输入。
- 图片设置项中提示推荐尺寸/比例。
- 如需多内容项，使用 **blocks**，并通过 `max_blocks` / 块级 `limit` 限制数量，防止商家无限添加拖垮性能。
- 提供有意义的 `presets`，并设置 `name`、必要的 `category`。
- 文案与标签使用主题现有的 locale 约定（`t:` 引用 `locales/*.schema.json`），便于多语言。

---

## 7. 字体、第三方脚本与其他

- **字体**：只使用主题已加载的字体（`font_face`、`font_url` 由主题统一处理）；Section 内不得再单独加载 Web Font。
- **第三方脚本**（评论、社媒、追踪等）：
  - 必须异步（`async` / `defer` / `type="module"`）。
  - 优先在**用户交互后**或 **进入视口后**再加载。
  - 评估其对 INP / TBT 的影响后再接入。
- **预加载**：仅对首屏确定的 LCP 资源使用 `preload`，且不超过 1–2 个。
- **Preconnect**：只为确实使用的第三方域名添加，不滥用。

---

## 8. 可访问性（性能之外的质量底线）

- 语义化标签：`<section>`、`<h2>`、`<button>`、`<a>`、`<ul>` 等，不要用 `div` 模拟按钮。
- 交互元素可键盘操作（Tab / Enter / Space / Esc），焦点可见（`:focus-visible`）。
- 正确使用 ARIA（`aria-expanded`、`aria-controls`、`aria-label`、`aria-live`），避免滥用。
- 颜色对比度符合 WCAG AA。
- 尊重 `prefers-reduced-motion`。
- 轮播/自动播放内容必须可暂停。

---

## 9. 代码质量标准

- **可读性**：命名清晰，Liquid 变量使用 `snake_case`，JS 使用 `camelCase`，CSS 使用 BEM。
- **注释**：说明"为什么"而不是"做什么"；Liquid 文件顶部用 `{% comment %}` 说明用途、依赖的 snippet 与设置项。
- **DRY**：重复结构抽成 snippet / block。
- **健壮性**：对空值、缺失设置、无图片、无商品等边界情况给出合理渲染（或不渲染）。
- **国际化**：用户可见文案不硬编码，使用 `{{ 'key' | t }}` 与 locale 文件。
- **安全**：输出用户可控内容时使用 `| escape`；富文本使用 schema 的 `richtext`/`inline_richtext` 类型；不拼接未转义的字符串到 HTML / JS 中。
- **无废代码**：不保留未使用的变量、CSS、JS、调试 `console.log`。
- **运行 Theme Check**：提交前必须通过 `shopify theme check`，无 error，尽量无 warning。

---

## 10. 验证与测试清单

### 10.1 开发完成后自查

- [ ] 首屏 / 非首屏两种位置放置该 Section，图片加载策略都正确
- [ ] 无 CLS（Chrome DevTools → Performance → Layout Shift）
- [ ] 移动端（375px）、平板、桌面表现正常
- [ ] 空状态（未设置图片 / 集合 / 文案）不报错、不崩坏
- [ ] Theme Editor 中新增、删除、排序、复制 Section / Block 均正常，JS 无重复绑定
- [ ] 同页面放置多个该 Section 实例互不干扰
- [ ] `disconnectedCallback` 清理完整（无内存泄漏）
- [ ] 键盘可操作、屏幕阅读器可读
- [ ] 开启 `prefers-reduced-motion` 时无强动画
- [ ] `shopify theme check` 通过
- [ ] 无控制台报错 / 警告

### 10.2 推荐工具

- **Shopify Theme Check**（CLI / VS Code 插件）：静态检查
- **Shopify Theme Inspector for Chrome**：分析 Liquid 渲染耗时（火焰图）
- **Lighthouse / PageSpeed Insights**：综合性能（用 **移动端** 数据）
- **Chrome DevTools → Performance / Coverage / Network**：主线程、未使用 CSS/JS、请求瀑布
- **WebPageTest**：真实网络与设备模拟
- **Web Vitals 扩展**：实时查看 LCP / CLS / INP

---

## 11. 反模式速查（AI 常犯错误）

| ❌ 常见错误 | ✅ 正确做法 |
|---|---|
| 所有图片都用 `loading="lazy"`（包括首屏） | 按 `section.index` 区分，首屏用 `eager` + `fetchpriority="high"` |
| 用 CSS `background-image` 放主视觉 | `<img>` + `object-fit: cover` + `srcset` |
| 引入 Swiper / GSAP / jQuery | 用 CSS scroll-snap / 原生 API / 主题现有组件 |
| `{% include %}` | `{% render %}` |
| 把整个对象 `\| json` 输出给 JS | 只传必要字段 |
| 在 `{% style %}` 里写大量静态 CSS | 静态用 `{% stylesheet %}`，动态用 CSS 变量 |
| `scroll` 事件里直接读写布局 | `IntersectionObserver` / `rAF` 节流 / 读写分离 |
| 忘记在 `disconnectedCallback` 清理 | 统一用 `AbortController` 管理 |
| 动画 `top/left/width/height` | 动画 `transform/opacity` |
| `will-change` 常驻 | 动画前后动态添加/移除 |
| 无限制 `for` 遍历集合 | 加 `limit:`，必要时分页 |
| 硬编码文案 | 使用 locale 文件 `t:` / `\| t` |
| 一个 Section 塞入多个无关功能 | 拆分为多个 Section / Block / Snippet |
| 为 Theme Editor 写的逻辑一直保留在线上 | 仅 `design mode` 下挂载 |

---

## 12. AI 交付格式要求

AI 在生成 Section 时，**必须按以下格式输出**：

1. **方案说明（简短）**：功能拆解、是否需要 JS、性能关键点与取舍。
2. **文件清单**：每个文件的路径与完整代码（不要省略，不要用 `...` 占位）。
3. **Schema 设计说明**：设置项、默认值、blocks 限制。
4. **性能自检表**：对照第 0 章"性能预算"与第 10.1 节"自查清单"逐项说明。
5. **使用与测试说明**：如何添加到页面、需要的 locale key、需要手动验证的点。
6. **已知限制 / 可选优化**：诚实指出未覆盖的场景。

> 如果需求与本规范冲突（例如要求必须使用某个重型库），AI 应**先说明性能影响并给出替代方案**，再由开发者决定。

---

## 13. 可直接复制的 Prompt 模板

```text
你是一名资深 Shopify 主题工程师，正在 Horizon 主题中开发定制 Section。

请严格遵守项目内的《Shopify Horizon 主题 · 定制 Section 高性能开发规范》（horizon-section-performance-guide.md）。

开发前：
1. 先阅读仓库中与本需求相似的 sections / blocks / snippets / assets，复用现有 snippet、CSS 变量和 JS 组件模式。
2. 如需求不明确，先列出你的假设再开发。

需求：
- Section 名称：<custom-xxx>
- 功能描述：<详细描述>
- 设计稿 / 参考：<链接或描述>
- 需要的设置项：<列表>
- 是否需要交互：<是/否，具体交互>
- 是否可能出现在首屏：<是/否>

硬性要求：
- 零 JS 优先；确需 JS 时用 Web Component + ES Module，并正确清理。
- 图片使用 image_url + image_tag，带 srcset / sizes / 尺寸，首屏与非首屏策略区分。
- 样式使用 {% stylesheet %} + BEM + 主题 CSS 变量，动画仅 transform/opacity。
- Schema 精简、有默认值、有 presets，blocks 有数量上限。
- 文案走 locale，通过 shopify theme check。
- 兼容 Theme Editor（section/block 事件）。

输出格式：按规范第 12 章（方案说明 → 文件清单与完整代码 → Schema 说明 → 性能自检表 → 测试说明 → 已知限制）。
```

---

## 14. 版本记录

| 版本 | 日期 | 说明 |
|---|---|---|
| v1.0 | 2026-10-14 | 初版 |

> **维护建议**：Horizon 主题会持续更新（组件基类、事件机制、snippet 命名等可能变化）。请定期对照主题最新源码校对本规范中"以仓库现有代码为准"的部分，并把团队踩过的坑补充到第 11 章。
