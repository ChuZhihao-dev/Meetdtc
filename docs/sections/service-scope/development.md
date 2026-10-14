# Service Scope — section 开发文档

状态：用户已授权开发，已新增组件及后台翻译。
依据：[需求文档](requirements.md)。目标：`/Users/Admin/Desktop/meetdtc`。

## 项目约定与复用

遵循仓库AGENTS.md的Liquid、静态样式归属、配置、翻译及验证规范。

已检查：`sections/why-choose-us.liquid`、`blocks/_value-prop.liquid`、`sections/our-approach.liquid`、`sections/featured-client-story.liquid`、`assets/scroll-reveal.js`、`snippets/scroll-reveal-styles.liquid`。

_value-prop包含必需的图标区和不同的布局/字体契约，不直接符合纯文字卡片；不修改它以免影响已有section。本组件复用主题section/full-width及spacing-style、字体资源和scroll-reveal机制。无需新增依赖或静态图片素材。

## 文件计划与结构

| 文件 | 计划 |
| --- | --- |
| sections/service-scope.liquid | 新增section、介绍区、卡片循环、CSS、schema及preset |
| locales/*.schema.json | 增补专用schema翻译key并保持各语言键匹配；复用现有通用key，中文后台提供中文，其余语言遵循项目fallback约定 |
| assets/scroll-reveal.js | 复用既有机制，不改变其他组件的动画行为 |
| snippets/scroll-reveal-styles.liquid | 复用；本组件内覆盖上移距离、错峰及减少动态效果可见性 |

section的内置card blocks只由本组件使用，标题和说明不拆出无必要的通用snippet。使用列表语义包裹卡片，每卡h3，介绍标题h2；纯文本转义、富文本按其允许格式输出；block wrapper附带block.shopify_attributes。无链接设置、按钮role或tabindex。

不编辑首页/产品模板及已有组件，不自动提交或部署。当前工作区模板已有修改，开发时保留。

## 主要设置契约

| ID | 类型 | 默认值与含义 |
| --- | --- | --- |
| eyebrow | text | SERVICE SCOPE |
| heading | text | What Is Included |
| description | richtext | 需求文档中的两行介绍；是否修正拼写由用户决定 |
| font | font_picker | montserrat_n4；显式获取400/500/600字重 |
| text_color | color | #000000 |
| heading_gradient | color_background | 152.2700deg渐变，设计色标位置 |
| background | color_background | 不设默认值；空则透明 |
| card_background | color | #FFFFFF |
| card_opacity | range | 58%，在Liquid中转为0.58后color_modify:alpha |
| card_border | color | #FFFFFF |
| card_radius | range | 13px |
| column_gap | range | 33px |
| row_gap | range | 建议29px，以实际图层间距28.5px近似 |
| padding-block-start / padding-block-end | range | 60px / 60px |
| padding_mobile_top / padding_mobile_bottom | range | 40px / 40px |
| enable_reveal | checkbox | 建议true，确认后启用 |
| card.heading | text | Emall Strategy（是否改Email由用户确认） |
| card.description | richtext | 需求文档中的重复卡片说明 |

preset提供六个独立card blocks。允许少于/多于六张，按保存顺序自然排列。空标题/说明不输出空标签；两者都空的卡片前台不留空壳，编辑器保留可选取的空态，确保商家可以继续编辑。零卡片时只显示介绍。

## PC与窄屏布局

使用Grid和正常文档流，避免照搬Figma生成的绝对定位、重复margin-left/margin-top及固定总高度。

1440px设计容器居中；介绍起点62px、顶部60px；标题与上标10px间距，标题视觉高度约71px；介绍与标题10px间距；网格与介绍40px。介绍最大宽1098.617px，标题最大宽1306px。

网格宽度在1440px基准为1272px，左起62px，右留106px；3列minmax(0,1fr)，列距33px，每卡402px。按容器比例收敛PC列宽与留白；大屏最大1440px居中。卡片min-height:176px，但可由内容撑高，不设置固定height。

卡片标题顶部32px、正文相对卡片顶部82px；标题30px行高与正文之间约20px。正文设计宽372px意味着左21px、右约9px的非对称内距：PC按设计保留，窄屏统一24px内距，避免文本贴边。边框使用border-box并在视觉对照时核对1px误差。正文以16px/20px接近设计正常行高。

750–989px改两列，≤749px改一列，字体/留白见需求文档。卡片内部不使用min-content或nowrap造成溢出；min-width:0、长词换行和内容自然增高。固定设计分行只作为PC排版目标，窄屏采用自然换行。

## 样式、背景与可访问性

静态BEM `service-scope__*`；section ID只用于唯一标识或实例变量作用域。静态CSS归属section的单一stylesheet标签；实例配色、间距等通过内联CSS变量传递。

背景使用组件专属图层，独立于页面section-background透明覆盖。配置有值时覆盖页面背景；空值透明显示页面背景。卡片白色透明度独立控制，不降低整卡opacity，以免文字也变淡。不因设计是半透明卡片而擅自添加backdrop-filter。

复用主题Montserrat字体加载方式，显式使用400/500/600，避免正文继承全局Inter。渐变设置被清空时需要可读的纯色兜底；高对比/强制颜色模式避免透明文字不可见。用户自定义颜色时以真实渲染检查对比度。

## 入场与编辑器

确认动画方案后复用data-reveal-scope和data-reveal，逐卡首次进入才显示动画，不做整网格循环播放。组件局部设置约24px上移、600ms、60ms错峰；大量卡片时限制最大延迟，不让末尾内容等待过久。已在首屏的内容立即可见。

共享脚本处理section load/unload。后台block选中时要确保对应卡片可见；若现有脚本不覆盖该情况，可添加最小的本组件专属监听模块，按主题Component约定管理资源及清理，不能修改全局动画逻辑影响其他section。

无JS时内容默认可见。prefers-reduced-motion下局部强制opacity:1、transform:none、transition:none，同时兼容页面打开后切换该偏好，不只停用过渡。重复实例互不影响。

## 验证计划

开发后运行兼容版本的`shopify theme check`；新增专属JS时运行语法及实际行为检查。按1440/1280/1024/834/768/390/375px核对布局。1440px对照Figma的文字、卡片尺寸、圆角、透明度、间距；窄屏验证自然增高及换行。

覆盖0、1、5、6、7张卡片，长标题、长正文、空内容、修改排序、动画开关、重复section、后台重载和选中卡片。测试背景由空改为设置色再清空、卡片透明度、减少动态效果和禁用JS。

明确区分本组件错误与现有主题错误；无法使用浏览器或商店预览时说明限制，不以Theme Check替代视觉验收。本节点不依赖远程图片下载，但实际预览权限需在开发时重新检查。

实现文件及翻译已新增；未修改模板文件或其他section。Theme Check已运行，完整视觉验收尚未完成。

## 实际开发记录

- 新增`sections/service-scope.liquid`，18项section设置、card内置区块和六张卡片preset。
- 卡片完全空白时前台省略；主题编辑器保留可选取的卡片区域，且全部内容直接可见，不需额外编辑器JS。
- 复用共享scroll-reveal；组件内限制错峰最大240ms、减少动态效果和强制颜色模式支持。
- 各schema语言文件补充service_scope字段；简体中文提供中文，其他语言暂用英文fallback。
- 本组件Theme Check无报告，schema与range检查通过，git diff --check通过。全主题仍有既有header/divider警告及两处applicable_disclosures过滤器错误，未修改。
- 本地Shopify接口`http://127.0.0.1:9292/?section_id=service-scope`成功输出上标、标题、介绍及字体/变量，证明Liquid可实际渲染。该独立静态请求没有已保存区块，因此不能用于验证六卡片preset的视觉。
- 尝试使用抽取实际CSS及默认文案的临时文件检查六卡片布局，但浏览器URL策略拒绝file://本地文件访问；停止此预览路径。本轮不声称PC/手机视觉验收或后台增删排序已通过。
- 下一步在主题编辑器添加“Service scope / 服务范围”，生成六卡片preset，再检查1440px三列、平板两列、手机单列及商家设置。
