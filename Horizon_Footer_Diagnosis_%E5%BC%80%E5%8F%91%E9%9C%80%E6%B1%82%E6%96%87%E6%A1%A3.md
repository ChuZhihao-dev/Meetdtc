# Shopify Horizon 自定义 Footer 开发需求文档（交付 DeepSeek）

版本：1.0｜目标：按照用户提供的 1124×1210 设计截图，实现完整的 Growth Diagnosis Footer。

> **工作原则**：先检查当前 Horizon 主题的真实文件结构、Footer Group、已有页脚功能、翻译文件与样式约定，再修改代码。不能假设主题版本、现有 `footer-group.json` 的具体内容；禁止直接覆盖线上配置。截图为视觉依据，下面的像素尺寸均为估计值，若可获取 Figma 标注以标注为准。

## 1. 项目背景与目标

项目使用 Shopify Online Store 2.0 **Horizon** 主题。要将截图中的三个区域整合为一个连续背景的完整 Footer：

1. 顶部 CTA：左侧营销内容与四项优势，右侧白色联系表单。
2. 中部导航：Company、Services、Expertise、Agency Insights 四列菜单。
3. 底部地址：总部说明 + New York City、Miami、Dubai 三列地址，桌面端位于整体内容的**右半区域**，不是整页居中。

要求在 Shopify Theme Editor 中可维护、支持桌面/平板/移动端，遵循 Horizon 原有页面宽度与排版系统，避免影响全站其他模块。默认文案为英文。

### 1.1 范围

**包含**：Liquid Section、Section Blocks、CSS、必要 JS、Schema、菜单绑定、Shopify 联系表单、基础多语言、响应式、可访问性、提交状态、配置集成与测试。

**不包含**：CRM/邮件营销自动化、文件上传、验证码服务接入、第三方表单 App、数据落库、自动创建客户、版权/支付图标等设计稿未显示且未确认的功能。

## 2. 开发前检查（必须先执行）

1. 读取 `sections/footer-group.json`，确认文件是否存在、组中 Section ID/type、顺序和 `footer-utilities` 的职责；如主题采用其他路径/结构，以实际代码为准。
2. 阅读现有 `sections/footer.liquid`、相关 `sections/footer-utilities.liquid`（若存在）、`layout/theme.liquid` 中 `{% sections 'footer-group' %}` 或等价调用、相关 CSS 和翻译文件。
3. 检查 `blocks/contact-form.liquid`（若存在）及其校验、成功/失败文案，仅复用兼容的模式，不强行引入会影响布局的原有 CSS。
4. 检查 Horizon 当前版本 Section schema 对 `blocks`、`presets`、`enabled_on`、`max_blocks`、`limit` 的支持和现有命名规范。
5. 记录旧 Footer 中的版权、隐私政策、付款图标、社交链接、地区/语言选择器、辅助功能链接；**不得未经确认删除**。
6. 在开发主题/未发布主题中修改，备份 `footer-group.json`，不要直接发布 Live Theme。
7. 首次输出简短的“现状分析 + 拟修改文件清单”，然后再写代码；如与本文档假设不一致，先说明差异并选取兼容方案。

## 3. 推荐技术架构

优先使用**一个 Section + 三类 Section Blocks**，而不是多个独立 Footer Section，也不必为了拆文件而强行使用 Horizon Theme Blocks：

```text
sections/
  footer-diagnosis.liquid          # 结构 + schema + form + block 循环
  footer-group.json               # 将新 section 纳入 footer group，谨慎处理旧 footer
assets/
  footer-diagnosis.css            # 所有样式作用域限定
  footer-diagnosis.js             # 仅在需要时实现客户端增强
locales/
  en.default.json                 # 如确实需要，增加前台翻译键
  en.default.schema.json          # 如确实需要，增加编辑器 schema 翻译键
```

主题中实际翻译文件名可能不同，必须先检查。可以先用可编辑的 Schema 默认英文文本，后续再按项目实际语言需求接入 `t` 翻译键；不能引用不存在的翻译键。

Section type：`footer-diagnosis`，Section 编辑器显示名：`Growth diagnosis footer`。

Block type：`feature`、`menu_column`、`location`。通过 `section.blocks` 按类型输出到各自容器；每个 Block 的 HTML 元素要带 `{{ block.shopify_attributes }}` 以支持编辑器定位。

**注意**：Shopify Section Blocks 的总 `max_blocks` 是整体限制，并非按类型分别限制。可以为每种 block 设置 `limit`（在当前 Shopify schema 允许的情况下），例如 feature 4、menu_column 4、location 3；默认 preset 放入 4+4+3 个 Block。Block 增删时前端不应报错。

## 4. 视觉结构与内容

### 4.1 整体容器与背景

- 背景贯穿三个区域，不允许顶部 CTA、导航、地址分别出现不同的背景断层。
- 左侧饱和蓝色、中心蓝紫、右侧粉紫；使用多层 `linear-gradient()` / `radial-gradient()` 调整，避免用大图导致模糊或额外网络开销。
- 建议参考色：`#1550FF`（左）、`#6551F5`（中）、`#AF67F7`（右）；这些是估算值，必须按截图调优。
- 内容居中，优先复用 Horizon 的 page-width 约束；如无法复用，使用 `max-width: 1200px` + 自适应左右 padding，不能在 1124px 截图上机械固定宽度。
- 全部文字为白色（表单内部深色）。设计稿未显示显式分隔线，默认不要添加。
- 需避免主题默认 `footer` / `section` 背景、上下间距、容器宽度产生额外边框和空白。

### 4.2 顶部 CTA（桌面端双栏）

左侧内容：

- Eyebrow：`FREE GROWTH DIAGNOSIS`（约 19px，正常字重，英文大写）。
- 主标题：`Request a Free Growth Diagnosis`（约 36–40px、粗体，设计稿换成两行；原截图文字疑似因排版挤压，实际应保证单词之间正常空格）。
- 描述（严格修正原截图中连写的空格）：
  `Tell us about your business and current challenges. Our team will review your needs, identify growth priorities and recommend the most suitable next steps.`
- 4 个优势列表：
  1. Expert Diagnosis —— 右上箭头（arrow-up-right）
  2. Tailored Recommendations —— 矩形/信息页图标（可用内置 SVG）
  3. No Obligation —— check
  4. Your Information is Secure —— shield
- 每个优势项：约 44–46px 半透明浅色圆形图标容器，右侧白色 16px 左右中等字重文字；垂直间距约 14–18px。

右侧表单卡片：

- 纯白或极浅灰背景，圆角约 32px，卡片内边距约 32px；默认无明显阴影。
- 桌面卡片宽度略大于左侧文本栏；可用 grid `minmax(0, 0.88fr) minmax(0, 1.12fr)`，实际根据容器调整。
- 标签黑色、约 14px、半粗体；输入框 1px 浅灰边框、约 12–14px 圆角、44px 高；placeholder 浅灰。
- 表单结构（顺序不能改变）：

| 行 | 左列 | 右列 |
|---|---|---|
| 1 | Your Name * | Company Name |
| 2 | Work Email * | Contact Number |
| 3 | Company Website *（跨两列） | — |
| 4 | Tell Us About Your Goals or Challenges *（跨两列，多行） | — |
| 5 | Get My Free Growth Diagnosis（跨两列，按钮） | — |

- placeholder：`Your name`、`Your company`、`you@company.com`、`+ 65 1234 5678`、`https://`、`Tell us what your business does, the challenges you are facing, and what you would like to achieve.`
- textarea 高约 104px，允许用户拉伸时不得破坏布局；提交按钮高约 49px、全宽胶囊圆角、从紫色到偏蓝紫渐变、白色加粗文字。
- 必填项只包括姓名、工作邮箱、公司网站、目标/挑战。Company Name、Contact Number 非必填。
- 卡片的成功/错误提示应占据合理空间，不遮挡字段和按钮。

### 4.3 中部四列菜单

- 距离 CTA 区域底部约 55–65px（参考值）。
- 4 列等宽或近似等宽，标题 16px 左右、半粗体；链接 12px 左右、白色、下划线、行高和条目间距保持截图密度。
- 标题及链接内容由 Theme Editor 的 `link_list` 维护；如菜单为空，编辑器可显示占位提示，生产环境不输出无意义的空列表。
- 设计稿默认菜单内容（仅用于配置/验收，不要写死在 Liquid 中）：

**Company**：About us、Services、Design Studio、TikTok Studio、AI Lab、Creator Studio、Careers、Newsletter、NY Agency、Blog、Contact us、Goodie AI、Privacy Policy。

**Services**：Shopify Development、SEO & AEO、Conversion Optimization、CRM & Lifecycle Marketing、Email, SMS & WhatsApp、Loyalty Programs、Affiliate Marketing、Referral Marketing、Creator Partnerships、Business Intelligence、AI Solutions、Agent Automation、Cloud Infrastructure。

**Expertise**：SaaS、B2B、Consumer、Healthcare、Fintech、Crypto、Startups、AI。

**Agency Insights:**：AEO: Answer Engine Optimization、Marketing Gen. AI Report、Google AI Overview SEO、ChatGPT in Marketing、Zero Party Data Strategy、TikTok Ads Guide、Performance Marketing List、Benefits of Content Marketing、Generative Engine Optimization。

链接 URL 必须来自 Shopify Navigation，禁止推测真实 URL。不要为截图中没有对应链接的项目制造无效 `#` 地址。

### 4.4 底部全球办公地点

- 整体位于 Footer 下部右半区，标题左对齐，不是全页面水平居中。
- 标题：`Headquartered in NYC with strategic global hubs across:`，约 16px。
- 下方三列：
  - New York City / `HQ in Soho,` 换行 `New York`
  - Miami / `Brickell,` 换行 `Miami`
  - Dubai / `Trade Centre 2,` 换行 `Dubai`
- 城市与地址为 Block 可编辑字段，地址保留换行；城市可选设置链接但默认不需要。
- 地址文字约 11–12px，列间距合理，底部留出 40–60px 左右安全空间。

## 5. Shopify Section Schema

Section Settings 建议分组：

**General**
- `content_max_width`：range，默认按主题容器，或 1200px。
- `padding_top` / `padding_bottom`：range。
- `desktop_column_gap`、`section_spacing`：range。

**Background**
- `gradient_left`、`gradient_middle`、`gradient_right`：color。
- `background_gradient`：可选 `color_background`（若主题支持且与颜色设置不冲突），优先单一可配置方式，不要重复配置。

**CTA**
- `eyebrow`：text。
- `heading`：text / inline_richtext。
- `description`：textarea / richtext。
- 可选 `heading_size`、`description_size`，但避免为每个像素提供冗余设置。

**Form**
- `form_heading`：可选，设计稿默认不显示。
- `name_label`、`company_label`、`email_label`、`phone_label`、`website_label`、`goals_label`。
- 对应 placeholder 文案。
- `submit_label`、`success_message`（若用 locale 可不重复设）。
- `card_background`、`card_radius`、`input_radius`、`button_gradient_start`、`button_gradient_end`。

**Locations**
- `locations_heading`：text。

**Blocks**
- `feature`：`icon` select（4 种预设）+ `custom_icon` image_picker（可选）+ `text` text。
- `menu_column`：`heading` text + `menu` link_list。
- `location`：`city` text + `address` textarea。

**Presets**
- 预置四个 feature、四个 menu_column（标题预填，但菜单需后台选择）、三个 location（城市和地址预填）。
- 所有 Schema ID 必须唯一；`name` 长度、range 默认值与步长、setting 类型均符合当前 Shopify 校验规则。
- Section 只能放在 footer group 时，可用适当的 `enabled_on` / `disabled_on` 限制，具体取决于当前主题和 Shopify 支持范围。

## 6. 表单技术实现（关键）

必须使用 Shopify 原生 Liquid：

```liquid
{% form 'contact', id: form_id, class: 'footer-diagnosis__form' %}
  {%- comment -%} Render fields, error/success states and submit button {%- endcomment -%}
{% endform %}
```

`form_id` 在进入 `{% form %}` 前由 `section.id` 构造，确保页面唯一。所有 label 的 `for` 与 input 的 `id` 一一对应。

| 字段 | name | 类型 | 必填 |
|---|---|---|---|
| 姓名 | `contact[name]` | text | 是 |
| 公司 | `contact[Company Name]` | text | 否 |
| 工作邮箱 | `contact[email]` | email | 是 |
| 联系电话 | `contact[phone]` | tel | 否 |
| 公司网站 | `contact[Company Website]` | url 或 text + URL 校验 | 是 |
| 目标挑战 | `contact[Goals or Challenges]` | textarea | 是 |

- 建议 `contact[email]` 为原生 email 类型，`required`、`autocomplete="email"`。
- 网站字段若使用 `type="url"`，浏览器通常要求完整协议；提示用户输入 `https://...`，或用少量 JS 在提交前规范化缺失协议的域名，并做合理校验。**不要只依赖前端 JS 保证后端数据质量。**
- `contact[phone]` 使用 `autocomplete="tel"`，不要强制特定国家格式。
- 必须渲染 `form.errors`（使用 `default_errors` 或主题一致的错误结构）及 `form.posted_successfully?` 成功提示。
- 邮件发送给 Shopify 商店配置的联系收件邮箱，需在测试商店实际验证。附加 `contact[...]` 字段是邮件内容，不等于自动写入 Customer Metafields 或 CRM。
- 必须支持无 JS 情况下正常提交；JS 仅用于 URL 补全、交互增强。不要在未经确认的情况下使用 fetch 伪造异步 Shopify Contact Form 提交。
- 提交按钮 `type="submit"`，可在前端通过 `submit` 事件短暂防止重复点击，但不能阻断原生提交；错误发生后应允许重新提交。
- 联系表单有可能触发 Shopify 的反垃圾机制；不要自行绕过。
- 不得在成功提示中暴露用户输入的敏感信息。

## 7. CSS 与响应式

样式全部以 `.footer-diagnosis` 为根作用域，例如 `.footer-diagnosis__card`，避免裸写 `input`、`a`、`h2`、`.button` 等全局选择器。优先使用 CSS 变量承接 Theme Editor 设置，并对 Liquid 输出的动态样式进行合理约束。

推荐断点：

| 断点 | CTA | 表单 | 导航 | 地址 |
|---|---|---|---|---|
| ≥ 1024px | 左右双栏 | 两列字段 | 四列 | 右半区三列 |
| 768–1023px | 上下堆叠 | 两列字段 | 两列 | 三列，可左对齐 |
| 480–767px | 上下堆叠 | 单列字段 | 两列 | 三列或根据内容自适应 |
| < 480px | 上下堆叠 | 单列字段 | 两列（极窄可单列） | 单列或自适应 |

- CSS Grid 布局，子元素设置 `min-width: 0`，避免文本撑破列。
- 小屏 CTA 文案缩小、表单内边距缩小；不允许出现水平滚动。
- 表单交互元素的点击区域尽量不小于 44px。
- 输入框 focus 状态必须清晰可见，不能只用颜色极淡的边框。
- `prefers-reduced-motion: reduce` 下禁用非必要动画。
- 所有链接必须有 hover / focus-visible 反馈，文本与背景对比度尽量达到 WCAG AA。
- 长菜单文本、长地址、不同语言翻译均不能溢出。

## 8. 图标处理

优先采用 Section 内定义的少量 SVG 图标（箭头、列表/矩形、对勾、盾牌），使用 `currentColor`，添加 `aria-hidden="true"`；也可通过 Block 的 `image_picker` 覆盖。不要引入整个第三方图标库。若复用 Horizon 图标 snippet，必须先检查 snippet 的名称和参数。

## 9. Footer Group 集成策略

1. 先确认主题是否通过 `sections/footer-group.json` 输出 Footer。
2. 新建 Section 后，在**开发主题**的 Theme Editor 或通过谨慎编辑 JSON 添加 Section 实例。
3. 若旧 `footer` 与新 Section 同时输出菜单/联系表单，应停用旧主 Footer，避免重复。
4. 如 `footer-utilities` 含版权、支付图标、政策链接、语言切换等未被新 Section 覆盖的内容，应保留并根据视觉需求调整；不得直接删除。
5. `footer-group.json` 中的 section key 唯一，`order` 引用的 key 必须存在，所有 JSON 必须可解析；避免删除已有设置数据。
6. 注意 Shopify 的 Footer Section Group 是全站共享的，修改会影响所有使用该组的页面；需检查首页、产品页、集合页、文章页等。
7. 如果设计要求 Footer 末尾完全没有 utilities，先确认业务是否允许移除版权等内容。

## 10. 开发顺序

**阶段 A：分析**：读取现有主题文件，报告当前 Footer 结构、需保留的功能、拟修改文件。

**阶段 B：基础结构**：创建 Section、三个区域的 Liquid、Block 循环与 Schema preset，确保 Theme Editor 能加载。

**阶段 C：表单**：完成字段、必填、成功/失败反馈，实际提交验证。

**阶段 D：视觉**：完成渐变、两栏 CTA、白卡、四列菜单、偏右地址布局，对照设计稿逐项调整。

**阶段 E：响应式**：验证 1440 / 1280 / 1124 / 1024 / 768 / 390 / 375 / 320px 等视口，处理换行和溢出。

**阶段 F：集成**：谨慎修改 Footer Group，保留必要 utilities；检查各模板页面。

**阶段 G：交付**：输出修改文件清单、完整代码、设置说明、创建 Shopify Navigation 菜单的方法、测试结果与未解决问题。

## 11. 验收标准

### 功能

- [ ] 新 Section 能在 Horizon Theme Editor 正常显示、保存和预览。
- [ ] 三类 Blocks 可以新增、编辑、排序、删除；不会因数量变化报错。
- [ ] 四列导航使用 `link_list`，链接由商店菜单控制，正确打开目标页面。
- [ ] 表单必填和邮箱/网站校验正常；成功与错误状态可见。
- [ ] 联系邮件包含姓名、公司、邮箱、电话、网站、目标挑战。
- [ ] 无 JS 时仍能提交联系表单。
- [ ] 旧 Footer 功能没有被意外删除或重复输出。

### 视觉

- [ ] Footer 三部分背景连续，渐变接近截图。
- [ ] 桌面 CTA 左右双栏，右侧白卡圆角和按钮接近截图。
- [ ] 菜单四列、文字下划线与密度接近截图。
- [ ] 地址区桌面位于右半侧，而非全页居中。
- [ ] 1124px 宽度下无明显溢出，桌面与移动端均自然换行。

### 工程质量

- [ ] CSS 无全局污染，使用统一 BEM 或主题兼容命名。
- [ ] Liquid 与 Schema 通过 `shopify theme check`（如本地 CLI 可用）。
- [ ] 控制台无新增 JS 错误，页面无明显布局抖动。
- [ ] label、aria、键盘焦点、错误提示满足基础无障碍要求。
- [ ] 无未经确认的外部依赖，不影响主题其他 Section。

## 12. DeepSeek 执行指令（请严格遵守）

你是 Shopify Horizon 主题开发工程师。请根据此文档和我提供的 Footer 设计截图，**直接实现完整、可运行、可配置的代码**，不要只给概念或伪代码。

执行时：

1. **先分析真实主题代码**，确认文件路径与 Footer Group 结构，输出不超过一页的差异分析；如无法读取本地文件，请明确索要关键文件，不要虚构其内容。
2. 严格遵循文档的三个区域、字段顺序、英文文案和桌面地址区右侧定位；不要自行增加版权、装饰分隔线、卡片阴影等截图没有的元素。
3. 采用一个 Section + `feature` / `menu_column` / `location` Section Blocks；提供完整 Section Liquid + Schema、CSS、必要 JS 和 Footer Group 最小修改方案。
4. 遵循 Shopify Liquid、Schema、Contact Form 的实际语法；不使用 React/Vue、第三方图标包或外部表单服务。
5. 对任何不确定的 Horizon 特定文件、Snippet、CSS 变量或翻译键，先查证再引用。
6. 不要覆盖现有 Footer Group 或删除 utilities；先说明保留/替换策略。
7. 提供可复制的完整文件内容、文件路径、CLI 检查步骤、后台菜单配置步骤与验收清单。
8. 如可直接操作项目，先在开发主题修改并运行检查；如不能操作文件，则逐文件输出完整代码，不省略任何关键部分。

**最终目标**：视觉上接近截图、功能上可正常提交表单、后台可维护、响应式可靠，并安全地集成 Horizon Footer Group。
