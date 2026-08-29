# XDFC ISUP/EHOME Gateway

这是面向工厂现场的独立海康 ISUP/EHOME 接入网关。它把海康设备的主动注册、
心跳和考勤事件交给“海康官方 SDK Bridge”，再把统一事件推送给 XDFC ERP。

```text
海康考勤机
  -> 海康官方 ISUP/EHOME SDK Bridge
  -> XDFC ISUP Gateway
  -> ERP /api/v1/attendance-events/*
```

## 当前交付内容

- 多设备配置
- 每台设备独立的注册 ID、ISUP Key、ERP 入站令牌
- SDK Bridge 标准输出 JSONL 或 HTTP 接口
- 基于海康官方 SDK 的独立 native ISUP/EHOME Bridge 源码和构建脚本
- ERP 不可用时的本地离线队列
- 自动重试和死信目录
- `/healthz`、`/readyz`、`/metrics`
- Docker Compose 部署模板

## 必须说明

仓库不包含海康官方 SDK 的动态库、头文件或授权代码。SDK 需要由交付人员从
海康官方渠道按设备型号和 ISUP/EHOME 版本获取，并封装到
`sdk-bridge/`。网关核心已经完成与 Bridge 的接口隔离，避免让工厂人员处理
协议细节。

详细说明：

- [配置说明](C:/Users/P16V/Desktop/Github/erp-mes-crm-plm/attendance-gateway/config/README.md)
- [SDK Bridge 合约](C:/Users/P16V/Desktop/Github/erp-mes-crm-plm/attendance-gateway/sdk-bridge/README.md)
- [ERP 接入说明](C:/Users/P16V/Desktop/Github/erp-mes-crm-plm/docs/architecture/attendance-isup-ehome-integration.md)

## 端口

- `7660/tcp`：设备 ISUP 注册端口，最终以 SDK 和现场配置为准
- `7332/tcp`：可选报警 TCP 端口
- `7334/udp`：可选报警 UDP 端口
- `9090/tcp`：网关管理、健康检查和 SDK Bridge 接口

## 现场操作

1. 运行安装脚本生成配置文件。
2. 在 ERP 的“考勤设备管理”绑定设备并设置入站令牌。
3. 把 ERP 设备编码、注册 ID、ISUP Key 和入站令牌填入 Gateway 配置。
4. 放入海康官方 SDK Bridge，启动 Gateway。
5. 将考勤机的 ISUP/EHOME 注册地址指向 Gateway 所在电脑的 IP，注册端口填写配置中的端口。
6. 打开 `http://网关IP:9090/healthz`，确认网关正常，再在 ERP 页面点击“设备预检”。

现场人员只需要完成设备网络、注册 ID、ISUP Key 和启动脚本；SDK 解析代码由交付人员维护。

## 部署前必须确认

以下三项是交付前的硬性检查，不能因为编译通过或 ERP 页面保存成功就跳过：

1. **真实设备联调尚未被本地构建替代。** 没有现场设备时，最多只能证明
   Bridge 能编译、SDK 能初始化、端口能监听、JSONL 合约能工作。必须使用实际设备
   型号、固件和 SDK 版本验证注册认证、SessionKey、刷脸/刷卡事件、断线重连和重复
   事件。
2. **ERP `SecretValue` 已加密存储，但运行时仍需明文。** ERP
   `AttendanceDevice.SecretValue` 在数据库中保存为
   `att-secret:v1:<base64url(nonce+ciphertext)>`，由独立环境变量
   `ATTENDANCE_SECRET_ENCRYPTION_KEY` 解密后仅在 ERP 进程内供适配器使用；API
   仍只返回 `HasSecret`。该环境变量必须在重启、副本、备份恢复之间保持不变，不能
   与 `JWT_SECRET` 或 `AI_SECRET_ENCRYPTION_KEY` 混用。`IngressTokenHash` 仍是
   单向哈希字段，不能替代设备 Secret。
3. **ERP 页面和 Gateway 配置不会自动同步。** ERP 页面保存设备编码、设备主数据、
   员工映射、健康状态和入站令牌哈希；`config/config.json` 保存注册 ID、ISUP Key、
   监听端口、Bridge 运行库路径和 Gateway 调用 ERP 的明文入站令牌。修改任一边后，
   必须同步另一边并重启 Gateway。
