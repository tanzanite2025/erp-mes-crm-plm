# ISUP Gateway 配置

现场安装时：

1. 复制 `config.example.json` 为 `config.json`。
2. 替换 ERP 地址、网关令牌和设备参数。
3. 将 `config.json` 放到网关容器的 `/etc/xdfc-isup-gateway/config.json`。
4. 将海康官方 SDK Bridge 发布目录放到 `sdk-bridge` 根目录，并填写 `sdkBridgeCommand`。
5. 使用 `docker compose up -d --build` 启动。

Windows 可运行 `.\install.ps1 -Build`，Linux 可运行 `./install.sh --build`。
第一次运行会先生成配置文件并停止，填写密钥后再次运行即可。

## 参数说明

| 参数 | 说明 |
| --- | --- |
| `erpBaseUrl` | ERP 可访问地址，例如 `https://erp.example.com` |
| `bridgeToken` | 保护 SDK Bridge 与 Gateway 之间接口的令牌 |
| `maxQueueItems` | ERP 暂时不可用时的本地队列上限 |
| `maxRetryAttempts` | 单条队列消息的最大重试次数，超过后进入死信目录 |
| `sdkBridgeCommand` | 海康官方 SDK Bridge 可执行文件 |
| `sdkBridgePublicAddress` | 设备可访问的网关 IP、域名或专网地址，Bridge 会把它下发给设备作为报警服务器地址 |
| `sdkBridgeAlarmProtocol` | 报警上报协议，当前支持 `tcp` 或 `udp` |
| `sdkBridgeTimezoneOffset` | 设备事件时间没有时区时使用的偏移，例如 `+08:00` |
| `sdkBridgeRuntimeDir` | 海康官方 SDK 动态库、OpenSSL 和 `HCAapSDKCom` 所在目录；Linux 容器通常是 `/opt/xdfc-isup-sdk-bridge/vendor/lib64`，Windows 是 Bridge 可执行文件所在目录 |
| `sdkBridgeLogDir` | 海康 SDK 日志目录 |
| `deviceCode` | 必须与 ERP 设备管理页的设备编码一致 |
| `registrationId` | 必须与设备侧 ISUP 注册 ID 一致 |
| `isupKey` | 必须与设备侧 ISUP Key 一致 |
| `erpIngressToken` | ERP 设备绑定后生成的入站令牌 |

`isupKey` 和 `erpIngressToken` 不是同一个密钥。配置文件包含敏感信息，
必须限制文件权限，不要提交到 Git。

使用原生官方 SDK Bridge 时，同一个 Gateway 内所有启用设备必须共享
`registrationPort`、`alarmTcpPort` 和 `alarmUdpPort`。海康 SDK 的 CMS 和 Alarm
监听器是进程级的；不同端口组请拆成不同 Gateway 实例。

ERP 的考勤设备管理页和 `attendance-gateway/config/config.json` 是两个职责边界：

- ERP 页面保存设备主数据、员工映射、健康状态和 ERP 侧入站令牌哈希。
- Gateway 配置保存设备注册 ID、ISUP Key、监听端口、Bridge 运行库路径和 ERP
  调用时使用的明文入站令牌。

页面保存不会自动改写 Gateway 配置。现场修改设备编码、注册 ID、ISUP Key 或入站
令牌后，必须同步 Gateway 配置并重启 Gateway；否则设备注册或 ERP 入站认证仍会
使用旧值。

## 交付前硬性检查

- **真实设备联调**：编译成功、SDK 初始化成功、`7660/7332/7334` 能监听，只能
  证明软件运行链路成立，不能证明实际设备已经注册。必须现场验证注册认证、
  SessionKey、刷脸/刷卡、断线重连和重复事件。
- **ERP 凭据存储**：`server/models.AttendanceDevice.SecretValue` 在 ERP 数据库中以
  `att-secret:v1:<base64url(nonce+ciphertext)>` 加密存储，ERP 进程读取后才恢复为
  适配器使用的明文，接口响应只返回 `hasSecret`。生产环境必须配置独立且稳定的
  `ATTENDANCE_SECRET_ENCRYPTION_KEY`，不能与 `JWT_SECRET` 或
  `AI_SECRET_ENCRYPTION_KEY` 混用；更换该密钥必须执行专门迁移。
  `IngressTokenHash` 是单向哈希，不能拿来替代设备 Secret。
- **双边同步**：ERP 页面改动不会写回 `config/config.json`。设备编码、注册 ID、
  ISUP Key 或入站令牌变更后，必须人工同步 Gateway 配置并重启服务。
