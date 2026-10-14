# Our Approach — section 开发文档

状态：已授权并实现组件；原图依赖和实际浏览器视觉验收待完成。
依据：[需求文档](requirements.md)。

## 1. 项目与复用

目标：`/Users/Admin/Desktop/meetdtc`，按该仓库 `AGENTS.md` 实现 Liquid + 原生CSS；交互优先复用主题机制，不添加依赖。

已检查：`sections/media-with-content.liquid`、`sections/faq.liquid`、`sections/cta-banner.liquid`、`sections/page-background.liquid`、`assets/scroll-reveal.js`、`snippets/scroll-reveal-styles.liquid`、`config/settings_data.json`。

通用 media-with-content 现有静态子块和列宽契约不直接匹配本设计的729px文字占位、较窄正文列和超出右侧的图片；建议新增专属section，复用 spacing-style、主题字体与入场能力。当前主题标题字体为Montserrat、正文字体为Inter；该组件设计要求全文Montserrat，因此正文不能直接继承全局body字体。复用Montserrat字体族，并核对500/600字重加载；若缺500，只补该组件必要的字体资源。

## 2. 计划文件

| 文件 | 计划 |
| --- | --- |
| sections/our-approach.liquid | 新增section、实例变量、样式、schema及preset |
| locales/en.default.schema.json | 增补本组件专用后台翻译；已有通用key优先复用 |
| assets/our-approach-reference.png | 保存Figma原始PNG，作为设计默认图（下载成功后才引用） |
| assets/scroll-reveal.js | 原则上复用；不为本组件改变其他section的触发行为 |
| snippets/scroll-reveal-styles.liquid | 复用；减少动态效果的可见性不足以局部覆盖补充 |

如入场方案需要专属行为，再在确认范围内增加`assets/our-approach.js`；本建议方案不需要新增专属JS。模板JSON和线上主题不自动改动。

## 3. 结构及配置契约

section根使用主题section/spacing约定；内部为文字列和媒体列。文字列包括可选上标、h2、两段富文本；图像用img和语义正确的alt。不是交互卡片，无按钮role或tabindex。section ID仅用于唯一标识和实例变量，CSS使用静态BEM `our-approach__*`。

| 设置ID | 类型 | 默认值/用途 |
| --- | --- | --- |
| eyebrow | text | OUR APPROACH |
| heading | textarea | 设计标题，保留换行；拼写以确认结果为准 |
| body_primary | richtext | 需求文档正文一 |
| body_secondary | richtext | 需求文档正文二 |
| image | image_picker | 可空；未选时使用已下载的原图 |
| image_mobile | image_picker | 可空；选中时仅在手机使用 |
| image_alt | text | 使用商家文本；空时采用选图alt，纯装饰默认空alt |
| text_color | color | #000000 |
| heading_gradient | color_background | 122.1396deg、#0B22B8至#9621C4，保持设计色标位置 |
| background | color_background | 可空；有值使用该设置，无值保持透明并显示页面背景（已确认） |
| padding-block-start / padding-block-end | range | 60px/60px，遵循spacing-style缩放 |
| padding_mobile_top / padding_mobile_bottom | range | 建议40px/40px，待确认 |
| enable_reveal | checkbox | 建议true，需用户确认动画方案 |

后台label/preset使用schema翻译key；纯文本转义，富文本保留允许的HTML。固定两段正文使用settings，不增加不必要的blocks。开关动画时仅为启用的实例添加reveal属性。

## 4. 布局实现

1440px基准以尺寸比例控制内部框架：起点62px，文字占位729px，图片起点791px。图片展示710×865px，允许越过父画布61px并在本section局部裁切。最大设计容器宽1440px；更宽屏幕居中，不无限拉宽。使用Grid布局和受限媒体容器，不把所有文字绝对定位。

文字区：上标后15px到标题；标题58px/60px、600；标题后60px到正文；正文24px/38px、500；两段20px。正文一最大566.974px，正文二最大551.801px。标题手动换行只保留PC设计意图，窄屏允许自然换行。

≥990px双栏；750–989px单列、32px侧边距；≤749px单列、20px侧边距。断点沿用主题750/990系列约定。通过clamp和组件容器尺寸缩放PC字号，窄屏解除PC图像固定高度与越界定位；图片宽度100%、高度auto。长文案使用min-width:0与换行保护，组件高度随内容变化。

背景按用户已确认规则实现：有设置值则渲染组件自身的背景层，无值则保持透明并显示页面背景。`page-background.liquid`有针对section-background的透明背景覆盖，本组件有背景设置时，使用组件专属背景层及局部选择器保证其优先于该透明覆盖规则；无设置时不输出固定背景色。开发时核对实际层叠，确保后台选色生效、清空后恢复页面背景；不要修改全局页面背景规则。颜色等实例变量通过根元素内联属性或限定的Liquid style传入；静态CSS放section的单一stylesheet标签内。

## 5. 素材

节点122:5610提供一张PNG。开发时按Figma get_design_context返回的下载方式保存原图，核对非空文件、图像尺寸、有效比例与设计槽位；运行时不引用7天有效的临时URL。不拆图内邮件卡片、不改绘图内人物或品牌内容。

商家图片使用image_url/image_tag，显式给出widths/sizes、alt和加载策略；手机替代图使用picture或主题既有响应式媒体方式。默认PNG也需给出真实width/height以保留空间，视觉呈现按710/865展示槽和约-0.83%的顶部偏移复核。

默认按非首屏lazy；若用户明确置于首屏，调整为eager并仅对关键图使用高优先级。无任何可用图片时不输出破图，单列文字布局；缺原始素材不得报告完整还原。

## 6. 入场方案与生命周期

用户确认建议后复用`scroll-reveal.js`、`scroll-reveal-styles`及data-reveal-scope/data-reveal。两组目标为文字区和图片区；局部调整上移24px、600ms、90ms错峰，不修改全局共享参数。滚动首次进入播放，离开不复位；首屏已可见元素默认不播放，采用现有脚本行为。

现有脚本支持section load/unload与实例观察器清理。开发时验证多实例及后台重载。现有共享减少动态效果样式仅移除transition，可能无法覆盖已隐藏且尚未进入的元素；本section局部增加reduced-motion可见性覆盖（opacity:1、transform:none、transition:none），兼容页面加载后切换系统设置。

无JS根节点不含reveal-ready，静态内容保持可见；不依赖动画才能显示图片或正文。不添加滚动进度、吸顶、视差或悬停缩放。

## 7. 验证与交付

- 开发前记录git工作区，保留已有改动；遵循确认版本文档。
- 运行项目兼容的`shopify theme check`；新增JS时执行对应语法检查。对新增schema字段、翻译key及settings引用一并核验。
- 浏览器按1440、1280、1024、834、768、390、375px检查；1440对照设计，其他宽度检查布局、文案和裁切。
- 验证长标题/两段长文、正文为空、替换图片、不同比例图、手机替代图、图片为空；测试背景由空改为自定义颜色再清空，确认与页面背景正确切换；后台修改和重新加载、多实例及动画关闭。
- 验证首次进入与重复进入、初始首屏位置、减少动态效果（含运行时切换）、禁用JS及图像加载失败；如共享行为存在问题，优先本组件内修复。
- 检查图片槽位、图片真实内容及实际渲染比例，不以下载成功替代视觉验收。
- 交付文件、后台添加方式、检查结果和未完成验证；不自动提交、推送或部署。

当前限制：没有独立平板/手机稿，按用户授权推导适配；原图下载失败，未完成图片及浏览器视觉验收。代码已实现并运行Theme Check。

## 实际实施与验证记录

- 新增 `sections/our-approach.liquid`；复用共享入场脚本，未改动其全局行为。
- 新增各schema语言文件的`our_approach`字段；简体中文已翻译，其余非英语语言暂提供英文后台文案以保持键一致。
- 字体使用独立font_picker，默认Montserrat Medium，明确加载500/600字重，避免全局Inter影响正文还原。
- 背景使用独立组件背景图层，有值覆盖、空值透明。
- 原始图片curl下载因DNS/网络不可达失败；未添加缺失文件引用、临时URL或替代图片。桌面选图空值时回退手机图片，两者均空时只显示文字。待原图可获取后补充默认图与视觉验收。
- 实际移动端：≤749px标题32–36px、正文18px/约29px、侧距20px；750–989px标题40–48px、正文20px/32px、侧距32px；移动端可选独立图片。

## 图片尺寸修正

PC媒体容器保持710:865比例，picture与img改为容器内绝对定位，使图片本身不参与容器高度计算；设计顶部-0.83%与高度100.87%由明确的容器边界计算。平板/手机将picture和img恢复普通文档流及自然高度。该组件Theme Check无报告；浏览器因Computer Use权限未授予，尚未核对实际商店预览及上传素材。

## 最新图片规则（覆盖此前裁切方案）

用户要求图片保持原尺寸。使用width:auto、height:auto、max-width:100%，小图不放大，空间不足时按原比例缩小。取消固定710:865展示槽、100.87%放大及顶部偏移；PC图片列收纳在组件左右边距内，完整显示，不在画布边缘裁切。平板/手机同样完整展示。
