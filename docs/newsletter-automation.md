# 每周邮件自动发送

## 调度
北京时间周日 08:00、20:00，周一至周五 08:00（共 7 次）。对应 UTC cron 0 0 * * 0-5 和 0 12 * * 0。GitHub Actions 的 schedule 仅运行默认分支，亦保留 workflow_dispatch。GitHub cron 不是实时 SLA。默认关闭，未配置时不得发送。

每次先检查最近 7 天的最新一期，要求真实 summary.json、quote-cards.json、完整总结和有效署名金句、非空导语；播客可选。仅创建不存在的期次，不导入历史邮件或覆盖已有人工草稿。然后处理已登记的自动任务。自动草稿沿用现有编辑器和 newsletter_campaigns/newsletter_deliveries；自动任务开始时重新获取当前确认名单。已有人工任务不纳入自动队列。

两位组织者（孙玲、李影）的预览邮件分别发送；必须两个请求均由邮件服务接受才记录提醒成功。发送时间必须比实际成功时间晚至少 24 小时，优先周一至周五 08:00。如果周日 08:00 的任务稍晚，下一次任务可在最多 10 分钟范围内等待到期；否则推迟至下一工作日。周日晚提醒通常周二发送。预览中的时间是预计，网站显示实际保存时间。GitHub 调度延迟可能导致推迟，不会缩短审核窗口。

组织者登录对应期次页面，打开「预览本期邮件」→发送给订阅者，可载入服务器草稿、保存修改、暂停、恢复、立即发送已保存版本。保存有 revision 比对；自动发送开始后正文锁定。未保存修改不参与发送；先载入草稿避免覆盖。暂停只针对未开始的发送；恢复后在下一次满足条件的调度中发送。立即发送是显式人工例外，不受 24 小时约束，仍要核对和确认。正式环境启用后，立即发送触发后台 worker；原浏览器分批处理仍可作为补救，租约保护重复领取。结果通知由后续 schedule 运行处理，自动任务完成后通知组织者。尚未人工保存过的生成稿可以在发送前补入新发布的播客；人工保存的稿件一律不自动改写。

自动发送沿用原有投递租约、退订检查、稳定幂等键和 23 小时重试安全窗口。提醒/结果邮件也有持久尝试时间与稳定幂等键；若结果不明且超过安全窗口，停止自动重试，须在 Resend 核实后人工处理。邮件服务接受不表示实际送达。

## 上线步骤（按顺序）
1. 合并功能分支前审查代码并运行 yarn test / yarn build。运行 SQL 集成测试（测试事务回滚，不发送邮件）。
2. 在正确的 Supabase 项目执行 scripts/newsletter-schedule-schema.sql。该 SQL 脚本包含幂等列/函数/trigger，事务执行；上线前登记到项目的 migration history。此分支未对生产数据库执行 SQL。
3. 在 Netlify 正式环境设置 NEWSLETTER_AUTOMATION_SECRET（随机至少 32 字符，建议 openssl rand -hex 32）和 NEWSLETTER_AUTOMATION_ENABLED=false。仅服务器 Functions scope，切勿使用 VITE_ 前缀。保留原 Resend / Supabase 服务端配置。
4. GitHub 仓库 Actions secrets 添加相同的 NEWSLETTER_AUTOMATION_SECRET；Actions variables 添加 NEWSLETTER_AUTOMATION_ENABLED=false。不要把 secret 写入文件、日志、PR 或客户端。
5. 合并 main、确认正式构建和数据库 schema，检查手动邮件流程。测试使用 mock provider 或独立测试数据，不能拿真实订阅者试群发。
6. 确认要开始正式调度时，将 Netlify 的 NEWSLETTER_AUTOMATION_ENABLED 与 GitHub 同名变量均设为 true；按 Netlify 环境变量生效要求重新部署。任一处关闭都能阻止下一次自动任务启动；已开始的请求可能完成。不要把真实群发作为首次测试。
7. 查看 Actions → Weekly newsletter schedule；Run workflow 可在主分支手动触发相同检查（不是强制跳过审核窗口）。失败查看 Actions/Netlify 日志以及邮件后台。人工暂停在期次编辑器中操作。

## 验证清单
- 周日早/晚、周五及跨年排程；调度延迟不会缩短 24 小时。
- 缺总结/金句跳过；缺播客不阻塞；后补播客仅更新未人工保存的版本。
- 两个提醒均接受后才进入发送窗口；失败、暂停、重跑均不应误发。
- 两名组织者并发修改时旧 revision 被拒绝；并发开始只允许一次。
- 发送前退订者跳过，发送后重复调度不重复投递。
- 手动发送与原功能兼容；预览环境禁发；非组织者和无专用密钥请求拒绝。
- 真实发送结果只记录 provider accepted；有失败/待核实的任务需人工检查。
