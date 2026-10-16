# 日常同步

在项目根目录运行：

```bash
bash scripts/pull-live-content.sh
```

从店铺 `meetdtc-40icat5f.myshopify.com` 当前 live 主题读取内容。先下载到独立目录，下载完成后备份本地 JSON，再覆盖 `config/settings_data.json`、`templates/` 和 `sections/` 内的 JSON。本地 Liquid、CSS、JS、翻译、全局设置定义以及线上不存在的本地文件保留。本地同名内容 JSON 的修改会被线上版本覆盖。

完成本地开发和预览后，运行：

```bash
bash scripts/push-live-code.sh
```

自动查询并固定本次 live 主题 ID；保存推送前全部线上 JSON；推送时排除 `**/*.json` 并使用 `--nodelete`；再次读取线上 JSON 并逐文件核对。只有上传和核对都完成且 JSON 一致，才报告成功。

此命令直接更新已发布网站的代码。翻译、`config/settings_schema.json`、页面模板和分区组 JSON 均不会上传。新翻译、新全局设置或新模板需要单独合并发布；Liquid 内嵌的 section/block schema 随 Liquid 上传。

快照、原始 JSON ZIP 备份和报告保存在 `.backups/`，已排除 Git 跟踪。若运营同期修改 JSON，核对会报告差异，不会自动回滚。如果上传后下载核对失败，不代表上传未发生，请查看输出和快照。不要同时运行多个同步命令。

通用推送命令仍可使用，也已排除全部 JSON，但不执行前后核对：

```bash
bash scripts/push-code.sh your-store.myshopify.com 123456789
```

以上脚本不改变普通 `shopify theme push/pull/dev` 命令的行为。
