# Server Security Artifacts

本目录只保存历史安全专项说明，不是 ERP 的部署入口。

当前 ERP 生产发布权威链路是：

- GHCR 发布不可变 `sha-*` 镜像；
- Hostinger Docker Manager 管理 `tanzanite-edge` 与 `erp` Compose Project；
- 生产 Compose 和环境变量以 Hostinger Project 为准；
- 不在 VPS 上拉取源码、构建源码或使用宿主机 Nginx 发布 ERP。

## 当前约束

- 不要把历史 CVE 文档当成发布流程。
- 不要为了执行安全脚本而强制覆盖服务器源码目录。
- 不要把生产密钥、Hostinger 环境变量、JWT、数据库密码写入仓库、日志或聊天记录。
- 旧安全脚本已从仓库移除；如需重新启用，必须先按当前 Hostinger Docker Manager 架构重新编写、复核路径、权限、内核版本和回滚方案。

## 相关权威文档

- `docs/ops/hostinger-vps-docker-runbook.md`
- `docs/ops/single-vps-deployment-roadmap.md`

## 历史 CVE 资料

`CVE-2026-31431-QUICK-GUIDE.md` 已降级为历史安全记录。里面不再承载可直接复制执行的生产部署命令；如未来需要处理同类内核 CVE，应重新生成当前环境专用 runbook。
