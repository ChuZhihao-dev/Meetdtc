# Shopify 主题优化与验收记录

- 日期：2026-10-23
- 项目：MeetDTC，Horizon 4.3.0，Shopify CLI 4.9.4。
- 依据：`shopify-development-standards` 技能的 2026-10-22 规范快照及项目 `AGENTS.md`。本次未重新读取飞书原文。
- 范围：共享 SEO 输出、FAQ、图片交付及 Alt、分页降级、折叠组件生命周期、多语言键完整性。沿用现有 Section/Block 架构及运营设置。
- 环境：开发主题 `189036298394`，本机 `http://127.0.0.1:9292`；未发布正式主题。
- 预览：https://meetdtc-40icat5f.myshopify.com/?preview_theme_id=189036298394
- 原工作区已有修改；本次没有覆盖运营 JSON 或提交 Git。修改前的相关工作文件保存在 `.backups/standards-optimization-20261023/`。

## 已实施

1. 移除首页 Header 中额外的隐藏品牌 H1，保留首页 Banner 的可见 H1。
2. 把主商品的 Shopify 原生 `structured_data` 输出统一放在 `layout/theme.liquid`，服务商品模板也能获得真实商品信息；移除 `product-information` 的重复输出。精选商品 Section 的独立数据保留。
3. 修正 Organization 的 URL，使其指向站点根地址，并为首页增加关联同一组织的 WebSite 数据。
4. FAQ 使用可见内容上的 FAQPage / Question / Answer microdata；没有完整问答的行不向访客输出，编辑器中仍可选择和填写。空 FAQ 不输出 FAQPage 类型。原生 details、键盘操作及样式所有者保留。
5. 为商品媒体、博客图片、集合卡片及服务页内容图片补充标题 Alt 兜底，保留已有人工 Alt。无文章图片时不生成无效图片链接。Meta 中的商店名、标题及标签文本增加 HTML 转义。
6. 无限滚动模式保留真实分页链接，供键盘访问、脚本未就绪及不可用场景使用。
7. 折叠组件在重新连接时重建 AbortController，避免旧 signal 导致监听器失效；重复连接不会累积监听器，并校验点击事件目标类型。
8. 三张内置 PNG 转为无损 WebP 并替换引用，原 PNG 保留。原有尺寸、延迟加载和首屏优先级保留。
9. 为 55 个语言文件补入 3,273 个缺失键的英文兜底；逐项验证原有 44,520 个值均未改变。英文兜底不代表这些语言已经完成本地化，交接键清单见 [locale-fallbacks-2026-10-23.json](locale-fallbacks-2026-10-23.json)。

## 媒体证据

| 资源 | PNG 字节 | WebP 字节 | 减少 |
|---|---:|---:|---:|
| aidea-center | 3,255,165 | 1,292,544 | 60.3% |
| growth-hero-background | 508,947 | 374,806 | 26.4% |
| services-globe-fallback | 504,576 | 285,938 | 43.3% |
| 合计 | 4,268,688 | 1,953,288 | 54.2% |

共减少 2,315,400 字节（约 2.32 MB）。这是被替换资源的文件大小差异；当前首页配置使用视频海报，因此不能将三张图片的总差异宣称为每次首页首屏下载节省。

使用 `cwebp -lossless -exact -m 6` 转换；用 `dwebp` 解码后，对原 PNG 与解码 PNG 的 RGBA 像素计算 SHA-256，三个结果均完全一致。尺寸分别为 1960×1960、1440×735、4000×4000。

## 检查结果

| 检查 | 结果 | 证据 |
|---|---|---|
| Theme Check 翻译覆盖 | 通过 | `MatchingTranslations` 从 3,240 条错误降至 0。补齐键计数包含检查器未单独报告的缺失子键，因此为 3,273。 |
| Theme Check 完整命令 | 待验证 | `shopify theme check --output json` 退出码仍为 1，剩余 2 条过滤器兼容性诊断及 5 条原有文档参数警告，见下文。没有新增诊断。 |
| 多语言键及原值保护 | 通过 | `python3 scripts/sync-locale-fallbacks.py`：Missing 0 keys；与修改前工作文件逐值比对，44,520 个值保留。 |
| JavaScript 语法 | 通过 | `node --check assets/accordion-custom.js`。 |
| 折叠生命周期 | 通过 | Node 隔离验证：Escape 关闭、断开再连接、重复连接和单次焦点处理均通过。 |
| FAQ 真实交互 | 通过 | Chrome，390×844：首页第二条问答点击展开、Escape 关闭且焦点停留在 summary。 |
| 首页最终 HTML | 通过 | 本机 GET 200：1 个 H1；Organization、WebSite JSON 均可解析；5 条完整 FAQ；无 Liquid error。 |
| 服务商品最终 HTML | 通过 | `/products/website-design-development`：1 个 H1；1 份主商品数据；7 条 FAQ；最终 HTML 中全部 34 张 img 均有 Alt；无 Liquid error。 |
| 集合最终 HTML | 通过 | `/collections/all`：1 个 H1，无 Liquid error。当前商品数量未触发分页，真实多页翻页仍待验证。 |
| 响应式抽查 | 通过 | 首页与服务商品页在窄屏及 1440px 桌面 DOM 检查中未发现横向溢出；桌面商品首屏已视觉检查。 |
| Git 空白检查 | 通过 | `git diff --check`。 |

检查原始 JSON、渲染 HTML 审计摘要、媒体大小及原语言文件位于上述 `.backups` 目录。该目录不跟踪到 Git。

### 检查器兼容性

- `blocks/disclosures.liquid` 和 `snippets/cart-disclosure-tooltip.liquid`：`UnknownFilter: applicable_disclosures`。已核对 [Shopify 官方过滤器文档](https://shopify.dev/docs/api/liquid/filters/applicable_disclosures)，该过滤器按买家司法辖区筛选披露内容；保留平台行为，没有为清除检查报错而移除过滤器或关闭全局检查规则。
- `snippets/divider.liquid`：5 条 `UnusedDocParam`，涉及 `settings.*` 文档条目；对应字段在文件中确有使用，属于现有文档参数解析问题，本次没有删除有用说明。
- 维护者下一步：在支持这些平台能力的检查器版本中再次运行 `shopify theme check --output json`，确认上述诊断消失；原报告保留，未宣称完整命令已通过。

## 条款验收

状态仅使用：通过 / 未通过 / 不适用 / 待验证。下列“通过”限于列出的本次修改及抽查范围，不能代替全部模板和运营内容验收。

| 编号 | 结果 | 证据 / 限制 |
|---|---|---|
| DEV-01 | 待验证 | 元数据标识官方 Horizon 4.3.0；未追溯最初下载渠道。 |
| DEV-02、DEV-03 | 通过 | 保留 Liquid、JSON 模板、Section/Block 架构及既有设置 ID。 |
| DEV-04、DEV-07 | 通过 | 本次没有另建全站样式体系；FAQ 修改保持原类名、变量及样式所有者。 |
| DEV-05 | 不适用 | 本次未新增可复用视觉组件或布局变体。 |
| DEV-06、DEV-08 | 通过 | 延用原生浏览器能力及现有 JS，未引入运行时依赖或 App。 |
| DEV-09 | 不适用 | 本次没有 App 选型或安装。 |
| DEV-10 | 通过 | 本次未加入第三方脚本；主商品结构化数据为服务端 Liquid 输出。未实测现有 App 卸载。 |
| DEV-11、DEV-12 | 通过 | 抽查首页实际海报为 eager / high；沿用既有 preload 和字体 swap 路径，没有盲目预加载全部资源。 |
| DEV-13 | 通过 | 替换的非首屏图片保留 lazy；未新增立即加载的音视频或社交资源。 |
| DEV-14 | 待验证 | 未新增构建链；现代模块能否被 CDN 自动压缩及实际 gzip/brotli 响应头尚未验收。 |
| DEV-15 | 待验证 | 未取得满足商品、变体、真实评价及合规追踪条件的两端 Lighthouse 报告，不能宣称移动端 ≥60 / 桌面端 ≥80。 |
| DEV-16、HOME-01 | 通过 | 首页重复 H1 已移除；首页、集合及服务商品抽查均为一个 H1。其他模板和运营富文本需逐页复核。 |
| DEV-17 | 待验证 | 本次修复的资源有人工 Alt 优先与标题兜底；最终服务商品页无缺失 Alt。首页 Shopify `video_tag` 生成的 video 内 fallback img 未带 Alt；需要结合浏览器辅助技术及完整素材审核确认全站状态。 |
| DEV-18、COL-09 | 待验证 | 代码已为无限滚动保留 a[href] 分页；当前集合未触发多页，需真实多页集合验证。 |
| DEV-19、PDP-04 | 待验证 | 原生 Product / ProductGroup 输出能力已覆盖所有主题布局下的商品模板。抽查商品价格为 0.00 CNY、库存 OutOfStock，均来自真实 Shopify 数据；商品未配图片，不能完成完整商品富媒体验收。 |
| DEV-20、COL-07、COL-08、PDP-09、PAGE-05 | 未通过 | 现有页面未实现统一可见面包屑与 BreadcrumbList，本次未调整导航布局。需要在各页面的首屏布局中补齐后验收。 |
| HOME-02、COL-03、PDP-03、PAGE-02 | 待验证 | 部分自定义模块的标题由运营富文本决定；当前存在用段落表达模块标题的情况，尚未完成全站 H2–H6 语义审核。 |
| HOME-03、HOME-06、PAGE-03 | 通过 | 首页和服务商品的核心标题与说明均为可抓取 HTML 文本；本次没有把文案做进图片。 |
| HOME-04 | 通过 | 首页实际输出 Organization 和 WebSite；组织 URL 修正为站点根地址。 |
| HOME-05 | 待验证 | 当前是服务型网站，首页服务入口指向真实商品 URL；是否另设核心集合入口需按业务信息架构确认。 |
| COL-01、COL-02、COL-04 | 通过 | 当前集合模板提供动态标题 H1 与集合说明的可编辑文本块；抽查一个 H1。实际各集合的独立 SEO 文案完整性待运营审核。 |
| COL-05、COL-06、PDP-07、PDP-08、PAGE-06 | 通过 | 可复用 FAQ Section 保留，完整可见问答输出对应 microdata；首页 5 条、服务商品 7 条已验证。不代表 Google FAQ 富媒体展示资格。 |
| COL-10 | 不适用 | 相关分类/文章模块为可选，本次未新增。 |
| COL-11、PAGE-08 | 待验证 | 本次未迁移 URL；未审查全部后台资源 handle。 |
| PDP-01 | 未通过 | 服务页使用运营配置的营销 H1；实际商品名称为上方段落，尚不满足“商品标题为 H1”的严格条款。本次保留现有文案及配置含义。 |
| PDP-02 | 通过 | 产品描述及服务页说明仍由商品资源或 Section 设置编辑，未改成图片文字。 |
| PDP-05、PDP-06 | 不适用 | 本次没有引入评价模块；没有伪造评分、评价或 Review 数据。现有 App 是否提供真实评价仍需发布前对照。 |
| PAGE-01、PAGE-04、PAGE-07 | 待验证 | 本次只抽查部分页面；普通 Page 的完整 H1、相关内链和页面类型结构化数据仍需逐页验收。 |

## 发布前剩余事项

1. 面包屑及 BreadcrumbList、服务商品 H1 与商品名称的语义对应、模块标题层级，需要在对应首屏与模块设计中完成后复验。
2. 为真实商品补齐后台图片、适用的价格和可售状态；复核原生结构化数据与前台可见信息，再用 Google Rich Results Test 验证商品数据，不应以 JSON 解析成功代替该测试。
3. 提供可触发多页的集合数据，验证分页、筛选后状态、键盘访问以及 JS 请求失败时的链接降级。
4. 在 Theme Editor 验证空 FAQ、重复 Section 和实时配置替换；完成 RTL、非默认语言、减少动态效果、缩放和网络延迟场景。上述场景未全部实测。
5. 完成英文兜底清单的目标语言翻译。重复执行 `python3 scripts/sync-locale-fallbacks.py` 可检查新增缺失键；仅明确需要补英文时使用 `--write --report <path>`。
6. 用含真实业务数据与追踪配置的预览 URL 出具移动端和桌面端 Lighthouse 报告，并记录 URL、时间及配置；核验线上 JS/CSS 压缩产物及 Content-Encoding。当前未具备正式性能验收证据。
7. 本仓库 `THEME-SYNC.md` 的正式推送流程会排除全部 JSON，包括 locales；此次新增英文兜底需要单独合并发布。WebP 资产和 Liquid 引用也应成套部署。

Google 已在 2026-05-07 停止展示 FAQ 富媒体结果，见 [Google 官方更新](https://developers.google.com/search/updates)。本次 FAQ 标记保留内容的结构化语义，不承诺搜索展示提升。关于原生商品数据类型，参见 [Shopify structured_data 文档](https://shopify.dev/docs/api/liquid/filters/structured_data)。

结论：本次代码优化与所列回归检查已完成；存在上述未通过及待验证条款，**未完成全站正式验收**。
