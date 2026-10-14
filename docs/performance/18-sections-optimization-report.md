# 18个定制Section性能优化交付

## 1. 方案说明

范围为原先确认的17个独立定制分区，加已有深度定制的Hero，共18个。已逐项检查其section及实际依赖的blocks/snippets/assets；本轮以保持布局、交互和商家保存配置为前提，修复重复资源、组件生命周期、媒体策略与Liquid成本。纯静态组件保持零专属JS；有交互的组件复用主题Component + ES Module，不增加第三方依赖。

本次是存量优化，不重命名既有section文件、设置ID或block类型，也不把保存的内置blocks强行迁移成Theme Blocks。18个分区的设置ID、类型、默认值与选项，以及block类型/字段均与优化前自动比较一致。只新增authoring上限及等价的后台翻译引用。未改动模板JSON、商品配置或线上主题发布状态。

### 逐项结果

CSS数字为分区自身stylesheet源码的UTF-8字节数，去除Liquid注释中用于说明的伪标签后计算；不是gzip体积，也不代表全页CSS。共享/可选snippet另行说明。

| Section | 自身CSS源码 | max_blocks | 本次处理 |
| --- | --- | --- | --- |
| `aidea-model` | 2414 → 2414 B | 不适用 | 固定标签循环上限7；装饰素材异步解码，保留尺寸与比例；维持零JS。 |
| `blog-grid` | 4657 → 4657 B | 不适用 | 实例变量内联，去除ID规则；迁移共享Web Component入场；产品摘要最多60词，减小隐藏DOM文本。 |
| `business-challenge` | 2978 → 2978 B | 12 | 最多12项；关闭动画不加载专属JS；布局批量读取；减少动态效果/编辑器跳过动画。 |
| `cta-banner` | 2709 → 2709 B | 不适用 | 动态变量放回面板，移除额外ID style块；复用现有排版与间距snippet，维持零JS。 |
| `delivery-process` | 5164 → 5166 B | 12 | 最多12步骤；循环显式上限50（兼容保存数据）；监听只在组件存续期有效；编辑器事件仅designMode挂载；后台标签locale化。 |
| `faq` | 1765 → 1765 B | 20 | 最多20项；迁移共享Web Component入场；沿用原生details和主题键盘组件；本FAQ内移除尺寸/内距过渡，仅保留opacity。 |
| `featured-client-story` | 7348 → 5355 B | 6 | 最多6指标；复用已加载主题字体，消除默认重复font-face；图片异步解码；无图占位的markup和CSS按需归属独立snippet。 |
| `footer-diagnosis` | 7125 → 6951 B | 11 | 最多11块；显式循环上限；表单拆出snippet；组件重载、取消与BFCache恢复；真实重复提交保护；统一字体继承、属性转义、删除important。 |
| `insights` | 5366 → 5366 B | 不适用 | 实例变量内联；入场Web Component；图片按首屏位置选择eager/lazy并异步解码；在image_tag外计算alt。 |
| `our-approach` | 3625 → 3625 B | 不适用 | 复用主题字体；共享组件生命周期；响应式图片异步解码；保留原图比例和已有后台选择。 |
| `our-work` | 2684 → 2684 B | 12 | 最多12张案例；实例变量内联；共享入场组件；结果卡图片alt在image_tag前计算，首屏策略与异步解码。 |
| `page-background` | 0 → 514 B | 不适用 | 动态style只输出变量；静态背景规则进入stylesheet；手机不使用fixed背景，降低滚动重绘压力。 |
| `partner-brands` | 1075 → 1206 B | 6 | 最多6行；实例变量内联；移动端覆盖由静态CSS归属；Logo首屏策略及异步解码。 |
| `product-hero` | 4513 → 4448 B | 2 | 保留原max_blocks=2；共享入场组件；按钮不再过渡box-shadow。 |
| `service-scope` | 4951 → 4951 B | 24 | 最多24张卡；复用主题字体、消除默认重复font-face；共享入场组件；无JS/编辑器/减少动态效果可见性保留。 |
| `services-globe` | 5116 → 5116 B | 不适用 | 固定列表最多5项；图像异步解码；ResizeObserver经rAF合并；减少动态效果保留静态图；异步import结束再次核对可见性及销毁状态。 |
| `why-choose-us` | 1639 → 1639 B | 12 | 最多12项；实例变量内联；图标异步解码及首屏判断；维持零专属JS。 |
| `hero` | 5248 → 5268 B | 50 | 保留原生所有设置并标注现有定制；首屏图片与视频封面仅一个high候选；视频复用现有组件实现可暂停、离屏暂停、无JS原生controls；反射仅启用时计算并抽出移动端选择。 |

### 专属/共享脚本体积

| 脚本 | 未gzip源码 | 实现 |
| --- | --- | --- |
| `scroll-reveal.js` | 2933 → 2802 B | Web Component + ES Module；已检查清理 |
| `business-challenge.js` | 2283 → 2396 B | Web Component + ES Module；已检查清理 |
| `delivery-process.js` | 1380 → 1684 B | Web Component + ES Module；已检查清理 |
| `footer-diagnosis.js` | 1856 → 2114 B | Web Component + ES Module；已检查清理 |
| `services-globe.js` | 4932 → 4939 B | Web Component + ES Module；已检查清理 |
| `growth-hero.js` | 4201 → 4411 B | Web Component + ES Module；已检查清理 |

共享入场模块现在由custom element连接/移除来管理观察器与监听；取消原有document级扫描和section load/unload监听。可重复连接与updatedCallback；一次收集布局再写入状态；初始可见内容直接显示；编辑器及减少动态效果时保持静态可读。自定义属性及CSS只使用现有配置值，不引入外部请求。

## 2. 文件清单与完整代码

以下链接均指向完整源文件。另提供完整源码快照，含每个修改/新增源文件的完整内容，没有省略代码；快照不作为浏览器资源加载。

- [全部完整代码](18-sections-complete-code.md)
- [源码压缩包](18-sections-source.zip)
- [机器可读审查结果](18-sections-audit.json)

### sections

- [sections/aidea-model.liquid](../../sections/aidea-model.liquid)
- [sections/blog-grid.liquid](../../sections/blog-grid.liquid)
- [sections/business-challenge.liquid](../../sections/business-challenge.liquid)
- [sections/cta-banner.liquid](../../sections/cta-banner.liquid)
- [sections/delivery-process.liquid](../../sections/delivery-process.liquid)
- [sections/faq.liquid](../../sections/faq.liquid)
- [sections/featured-client-story.liquid](../../sections/featured-client-story.liquid)
- [sections/footer-diagnosis.liquid](../../sections/footer-diagnosis.liquid)
- [sections/hero.liquid](../../sections/hero.liquid)
- [sections/insights.liquid](../../sections/insights.liquid)
- [sections/our-approach.liquid](../../sections/our-approach.liquid)
- [sections/our-work.liquid](../../sections/our-work.liquid)
- [sections/page-background.liquid](../../sections/page-background.liquid)
- [sections/partner-brands.liquid](../../sections/partner-brands.liquid)
- [sections/product-hero.liquid](../../sections/product-hero.liquid)
- [sections/service-scope.liquid](../../sections/service-scope.liquid)
- [sections/services-globe.liquid](../../sections/services-globe.liquid)
- [sections/why-choose-us.liquid](../../sections/why-choose-us.liquid)

### blocks

- [blocks/_brand-logo.liquid](../../blocks/_brand-logo.liquid)
- [blocks/_faq-row.liquid](../../blocks/_faq-row.liquid)
- [blocks/_result-card.liquid](../../blocks/_result-card.liquid)
- [blocks/_value-prop.liquid](../../blocks/_value-prop.liquid)

### snippets

- [snippets/custom-client-story-placeholder.liquid](../../snippets/custom-client-story-placeholder.liquid)
- [snippets/custom-footer-diagnosis-form.liquid](../../snippets/custom-footer-diagnosis-form.liquid)
- [snippets/custom-hero-mobile-reflection.liquid](../../snippets/custom-hero-mobile-reflection.liquid)
- [snippets/custom-hero-video-controls.liquid](../../snippets/custom-hero-video-controls.liquid)
- [snippets/custom-section-fonts.liquid](../../snippets/custom-section-fonts.liquid)
- [snippets/growth-hero.liquid](../../snippets/growth-hero.liquid)
- [snippets/scroll-reveal-styles.liquid](../../snippets/scroll-reveal-styles.liquid)

### assets

- [assets/business-challenge.js](../../assets/business-challenge.js)
- [assets/delivery-process.js](../../assets/delivery-process.js)
- [assets/footer-diagnosis.js](../../assets/footer-diagnosis.js)
- [assets/growth-hero.js](../../assets/growth-hero.js)
- [assets/scroll-reveal.js](../../assets/scroll-reveal.js)
- [assets/services-globe.js](../../assets/services-globe.js)

### locales

- [locales/ar.schema.json](../../locales/ar.schema.json)
- [locales/cs.schema.json](../../locales/cs.schema.json)
- [locales/da.schema.json](../../locales/da.schema.json)
- [locales/de.schema.json](../../locales/de.schema.json)
- [locales/en.default.schema.json](../../locales/en.default.schema.json)
- [locales/es.schema.json](../../locales/es.schema.json)
- [locales/fi.schema.json](../../locales/fi.schema.json)
- [locales/fr.schema.json](../../locales/fr.schema.json)
- [locales/he.schema.json](../../locales/he.schema.json)
- [locales/it.schema.json](../../locales/it.schema.json)
- [locales/ja.schema.json](../../locales/ja.schema.json)
- [locales/ko.schema.json](../../locales/ko.schema.json)
- [locales/nb.schema.json](../../locales/nb.schema.json)
- [locales/nl.schema.json](../../locales/nl.schema.json)
- [locales/pl.schema.json](../../locales/pl.schema.json)
- [locales/pt-BR.schema.json](../../locales/pt-BR.schema.json)
- [locales/pt-PT.schema.json](../../locales/pt-PT.schema.json)
- [locales/sv.schema.json](../../locales/sv.schema.json)
- [locales/th.schema.json](../../locales/th.schema.json)
- [locales/tr.schema.json](../../locales/tr.schema.json)
- [locales/ur.schema.json](../../locales/ur.schema.json)
- [locales/zh-CN.schema.json](../../locales/zh-CN.schema.json)
- [locales/zh-TW.schema.json](../../locales/zh-TW.schema.json)

### tests

- [tests/custom-section-lifecycle.test.cjs](../../tests/custom-section-lifecycle.test.cjs)

## 3. Schema说明

新增/明确的数量上限：Growth Potential 12、Delivery Process 12、FAQ 20、Featured Client Story 6、Footer Diagnosis 11、Our Work 12、Partner Brands 6行、Service Scope 24、Why Choose Us 12、Hero 50。Product Hero原上限2保持。实际写入上限不会低于模板中已保存的顶层块数量；没有截断保存数据或更换块身份。

Theme Block文件自身不接受max_blocks或引用级limit（已由Theme Check验证），因此没有留下这类无效字段。Partner Brands在section入口限制行数；行内仍受平台原有Theme Block容量约束，未伪造12个Logo的独立限制。若以后需要更严格的嵌套品牌结构，需要专门规划兼容迁移。

Delivery Process原有英文schema标签改为delivery_process命名空间；所有schema语言补齐同名键，简体中文提供中文，其他非英文语言暂采用英文fallback。商家正文仍由settings/blocks控制，没有把已保存文案替换成固定locale文本。

## 4. 性能自检表

| 检查项 | 结果与证据 |
| --- | --- |
| 新增第三方库 | 0；沿用原有COBE，未新增依赖 |
| JS源码≤5KB目标 | 6个增强模块均<5000 B；地球的既有COBE依赖另计14182 B，仅在可见且允许动态时import |
| CSS源码≤6KB目标 | 17/18个分区自身stylesheet满足；Footer Diagnosis仍6951 B，未宣称全部达标 |
| 可选占位CSS | Client Story自身7348→5355 B；无图占位CSS移入其实际渲染的snippet，有真实图片时不需要该样式owner；无图时仍有额外样式成本 |
| 字体 | 3个分区移除默认重复声明，复用theme-styles-variables已加载族/字重；实际服务页仅一个全局font-face style。不同于全局字体的已保存选择保留兼容owner，见已知限制 |
| 图片加载 | 商家图片沿用image_url/image_tag、srcset/sizes及固有尺寸；首屏Hero封面实际eager+high，且首页只有一个high img；装饰SVG/本地静态PNG保留asset_url与尺寸并异步解码 |
| 视频 | preload=none；进入视口再播放、离屏/隐藏暂停；暂停/恢复按钮实测；减少动态效果下保留封面；无JS保留原生controls |
| Liquid | 固定列表显式limit；已有商品/文章循环保留上限；反射不开启时不再计算其markup；摘要60词上限；图像alt过滤在image_tag外完成 |
| CLS目标0 | 媒体槽/原始尺寸保留；未做Performance录制，不能把代码检查等同于实测CLS=0 |
| LCP不恶化 | 修复首屏封面优先级与背景分区占序号问题；无前后同条件跑分，不能给出改善百分比 |
| INP/任务<50ms | 批量布局读写及rAF合并；不在本轮声称真实移动设备任务全部<50ms |
| 375px/平板/桌面 | 首页375/1440无横向溢出；实际服务页1440、834、375无溢出，Service Scope分别3/2/1列 |
| 多实例与清理 | 5项Node生命周期测试覆盖实例隔离、重载/移除、减少动态效果、表单恢复、地球异步竞态；仍需完整Theme Editor手工矩阵 |
| 无JS与减少动态效果 | 静态内容默认可见，reveal仅增强；组件监听偏好变化，CSS有可见性兜底；测试证明禁用/编辑器不创建观察器 |
| Theme Check | 与基线结果一致，0新增问题；全主题仍2个既有error及6个既有warning，见第6节 |
| 控制台 | 正常预览未见本轮组件新增报错；观察到既有Shopify Account菜单缺失提示，未处理无关账号配置 |
| 编辑器 | 连接/断开/重载由组件生命周期处理；编辑器保持动画内容可见，不向线上挂额外编辑器监听；实际保存/复制/排序未全部操作 |
| 同页面多个LCP候选 | 当前首页确认1个high img；任意商家重新排序组合后的真实LCP候选仍需按页面复核 |

## 5. 使用与测试说明

已有页面无需重新添加或重新配置section；设置ID及块身份不变。新加实例沿用原preset。不要为了应用本优化重建线上模板。

已执行：

- `shopify theme check --output json`：与优化前逐项比较，发现集合一致。
- `node --test tests/custom-section-lifecycle.test.cjs`：5项通过。
- 对6个修改的JS模块运行`node --check`，均通过。
- 对18个schema做保存契约比较，均通过；`git diff --check`通过。
- 通过浏览器逐个请求本地Shopify `/?section_id=<实际文件名>`：18个均有对应wrapper且无Liquid error；拆分后再检查Hero、Footer、Client Story，仍通过。单独请求没有保存的blocks，不作为preset/样式完整验收。
- 在本地完整首页与服务页检查真实CSS和模块升级；服务页六卡片1440px为402px三列、834px为373px两列、375px为335px单列；均未产生页面横向滚动。
- 本地首页视频封面为eager/high；只有1个high img；视频标签autoplay=false、preload=none，实际由组件进入视口后播放；点击Pause/Play后分别确认paused=true/false及按钮标签正确。

待手动验证：编辑器新增/删除/复制/排序和block选中完整矩阵；不同图片比例/长文案/所有卡片空态；非当前页面的首屏排序；键盘和屏幕阅读器完整路径；禁用JS/真实设备减少动态效果；同网络下Lighthouse、Theme Inspector、Performance录制与CLS/INP。

本轮未提交Git、未推送、未发布主题。

## 6. 已知限制与可选后续优化

1. 全主题Theme Check既有错误：`blocks/disclosures.liquid`、`snippets/cart-disclosure-tooltip.liquid`的`applicable_disclosures`过滤器不被当前Theme Check识别。本轮没有改动这些结账相关原生文件，也没有禁用检查。原有warning为header的42项设置及divider的5个未使用doc参数。
2. Footer Diagnosis自身CSS仍6951 B，超6KB目标；保留表单、导航和位置区布局，未靠删除功能或把源码转移到全局来伪装达标。下一步若需达成更低预算，可单独规划表单与底部导航的结构拆分，但不能用文件拆分虚报整分区总量减少。
3. 地球增强脚本4939 B，但其COBE依赖14182 B，所以完整功能JS仍超5KB目标。按用户要求保留现有效果，减少动态效果或不可见时不会初始化WebGL；彻底零JS需要改成静态地球，属于可见功能取舍。
4. 为保留商家已选的非全局字体，`custom-section-fonts`只在确实不属于全局已加载族/字重时提供兼容声明。当前默认Montserrat路径无重复声明；严格禁止任何额外字体时，需要商家迁移这些font-picker选择，不能默默让现有选择失效。没有新增font-picker设置。
5. 保留既有文件名及局部内置blocks，避免破坏保存配置；没有把18个存量section机械改名为custom-*或重建block树。所有本轮新增组件snippet使用custom-前缀。
6. 仍有几个分区沿用原有desktop-first断点；本轮优先保持已验证的布局，不将全部响应式CSS重写为新的布局算法。已完成代表页面3个尺寸检查，不等于18个分区所有状态完整视觉验收。
7. 真实LCP、CLS、INP和移动GPU成本未进行可重复的前后录制；不得把此报告的静态预算与单元测试换算成跑分提升。
