# 每期发布信息与邮件预览

每期内容仍从 `sunling/inspire-planet` 读取，网站不维护第二份会议纪要。详情页上的「预览本期邮件」只向已登录的组织者显示；预览处理公开内容，不涉及收件人名单，也没有发送接口。

## 配置发布信息

在内容仓库当期目录按需添加 `episode-publication.json`。字段约定见内容仓库 `events/data-contract.md`：

- `podcast`：真实小宇宙单集的 `url`、`title`，可选实际 `durationSeconds`、`publishedAt`。
- `newsletter`：可选 `intro`、从 0 开始的 `featuredQuoteIndex`；未配置时复用纪要导语与第一张金句。
- 不创建假链接或空播客占位对象。未发布时省略 `podcast`，旧期不要求补文件。

网站读取器扫描元数据文件并按文件 SHA 缓存，目录缓存约 5 分钟。年份和期数共同决定内容身份。错误或缺失的可选元数据不会阻止纪要和卡片显示。

## 预览

组织者打开 `/episodes/{year}/{episode}`，点击「预览本期邮件」，检查导语、精选金句和播客入口。可切换邮件样式／纯文字，复制纯文字；对话框内编辑只影响本次预览，关闭不保存。需要长期保存的设置在内容仓库调整。

图片被屏蔽时，邮件里的金句仍是可读文字。预览会列出缺少的纪要、金句或播客；这不代表生成后可以直接发送。

本阶段只提供预览。订阅确认、退订、组织者试发、持久化发送记录、失败重试与额度控制由后续 PR 接入。正式发送模板必须替换预览页脚，提供收件人对应的退订链接及标准退订头；不能把当前预览 HTML 直接作为群发模板。

## 验证

```bash
yarn test src/tests/episodeNewsletter.test.ts src/tests/episodePublicationReader.test.ts
yarn build
```

内容仓库运行 `python3 scripts/check-content.py` 和发布元数据校验测试。首期预览可用现有 EP42 总结和金句；只有取得真实单集链接后才添加播客配置。
