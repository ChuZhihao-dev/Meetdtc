# Featured Client Story — 开发记录

已实现独立 Shopify Section，设计节点 [122:5697](https://www.figma.com/design/6nJ1gnZxBIdCpnwKDjrqsD/Untitled?node-id=122-5697)。没有自动添加到模板。

## 文件与配置

- `sections/featured-client-story.liquid`：卡片、文案、背景、字体、响应式图片、案例详情链接、间距及可选入场动画。
- `blocks/_client-story-metric.liquid`：可添加、删除及排序的指标 blocks，预设四项。
- `assets/client-story-corner-left.svg`、`client-story-corner-right.svg`、`client-story-image.svg`：Figma 原始 SVG，作为未选图时的装饰与占位图标。没有引用临时素材 URL。
- `locales/*.schema.json` 与 `locales/*.json`：后台配置和图片占位文案。Section 在各语言后台统一使用英文名称 Featured Client Story。

在主题编辑器选择“添加区块 → Featured Client Story”。替换案例标题、简介与指标，上传案例图片，选择案例链接。链接为空时仅编辑器显示静态按钮预览，前台隐藏按钮。图中的图片占位区可用桌面图片和可选手机图片替换；显示为居中裁切的图片，没有额外点击区域。

Section 背景留空时透明，显示页面背景；设置背景时覆盖当前区块区域。卡片背景、渐变、强调色、文字、图片区域和按钮颜色均可配置。字体默认 Montserrat，使用 Shopify font_picker 和 font_face 加载 400/500/600 字重。

## 布局与行为

1440px：上下 padding 默认 60px，左右 50px；卡片 1340×704px，左栏 636px，右栏 702px。标题 44px/54px，正文 20px/30px；指标为两列，数值 34px/41px。采用正常文档流，704px 是最小高度，长内容自然撑高卡片。

990–1439px：双栏、侧边距32px，收敛字号和列内边距。
750–989px：上下排列、文字在前、图片在后，侧边距32px。
≤749px：侧边距20px，标题26–32px，正文16px/26px，指标仍为两列，图片区为正方形。

上下 padding 通过 spacing-style 设置，<990px 沿用主题0.7间距缩放，例如60px实际42px。

没有卡片悬浮、高亮、指标计数或轮播交互。唯一的导航控件是原生案例详情链接。入场动画默认关闭，可选启用主题共享 scroll-reveal：首次滚入淡入上移，已经在首屏的内容直接可见，减少动态效果时直接显示。

## 验证与限制

已用实际 Section/block CSS、共享 spacing-style 及预设内容生成本地静态预览；字体使用主题相同的 Montserrat 资源。1440、1280、1024、834、390、320px布局、长文案、空指标及RTL检查没有横向溢出。1440px卡片为1340×704px，图片区域为702×702px，所有原始SVG均非空、加载成功且保持原始尺寸。

Theme Check 对本组件与翻译没有发现问题。全主题仍有既有错误：`disclosures.liquid`、`cart-disclosure-tooltip.liquid` 的 `applicable_disclosures` 未知过滤器；另有 header 和 divider 的既有警告。未修改这些文件。

已通过本地开发服务器的 `/?section_id=featured-client-story` 验证真实 Liquid 默认配置渲染：标题、描述、字体和实例变量有效，五个SVG引用全部加载成功，未配置链接时前台没有按钮。首次同步的新block依赖顺序错误已解除。Section rendering裸响应未携带静态组件CSS；已核对正常页面加载的 `compiled_assets/styles.css`，其中包含新Section与指标block的静态规则，主题既有样式交付路径有效。案例详情链接已在本地预览验证键盘Enter导航。尚未完成后台更换图片、预设blocks、多实例或设置重载的完整预览验收；请在开发主题添加此Section后复核这些组合。

可复查命令：`shopify theme check --output json`。


## 右侧 SVG 比例修正

重新核对 Figma 后确认，主题 `base.css` 的 `img { width: 100%; height: auto; }` 会拉伸占位图标。原静态预览遗漏该全局样式，先前的比例验证不完整。现在占位图标和四角 SVG 使用 `inline-size: auto; block-size: auto` 保留导出素材尺寸；没有修改 SVG 文件或其原始 width/height。

同时修正主题 `:first-child:empty + :where(p, …)` 对图标后标题上间距的覆盖。桌面图标与标题间距25px，标题与说明间距10px；手机图标与标题间距16px。

新预览载入完整 `assets/base.css` 后验证：右侧区域702×702px；图标约80.0568×84.2463px；四角各40×35.5px，与Figma导出尺寸一致。1024、390、320px均没有SVG拉伸或横向溢出。桌面截图再次对照Figma，修正图片区图标和文本留白。
