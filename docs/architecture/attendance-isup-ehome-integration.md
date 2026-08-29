# 海康 ISUP/EHome 考勤接入

## 接入边界

ISUP/EHome 使用设备主动注册模式。考勤设备不直接向 ERP HTTP API 发送原始
ISUP 报文，而是先连接海康 ISUP/EHome 网关。网关负责处理设备注册、心跳、
报警和考勤事件，再调用 ERP 的统一 HTTP 入站接口。

```text
海康考勤机
  -> ISUP/EHome 注册和事件
  -> attendance-gateway + 海康官方 SDK Bridge
  -> ERP 统一考勤入站接口
  -> 员工匹配、去重、考勤流水
```

仓库现在提供独立 `attendance-gateway` Gateway 核心，负责多设备配置、ERP
事件转发、离线队列、重试和健康检查。海康 ISUP/EHome SDK 的动态库和头文件仍
不随 ERP 仓库分发，现场需要从海康官方渠道获取后，使用仓库内
`attendance-gateway/sdk-bridge/native` 编译原生 SDK Bridge；Gateway 核心不直接
伪造或解析海康私有报文。

设备管理页负责保存 ERP 侧的设备绑定、员工映射、健康状态和入站令牌哈希，独立
Gateway 配置负责注册端口、注册 ID、ISUP Key、SDK Bridge 运行库路径、对外报警
地址和调用 ERP 时使用的明文入站令牌。

两套配置不会自动同步。现场修改设备编码、注册 ID、ISUP Key 或入站令牌后，必须
同步修改 `attendance-gateway/config/config.json` 并重启 Gateway；ERP 页面只会
更新 ERP 数据库，不会直接改写网关主机上的文件。

## 部署前必须确认

这三项必须在现场联调单中逐项勾选：

1. **本地编译不等于真实设备联调**：没有实际海康设备时，只能验证编译、SDK 初始化、
   监听端口和 JSONL 合约；注册认证、SessionKey、ACS XML 字段、刷脸/刷卡、断线
   重连及重复事件必须用现场实际型号、固件和 SDK 版本验证。
2. **`SecretValue` 的数据库存储与运行时使用是两个边界**：
   `AttendanceDevice.SecretValue` 在数据库中保存为
   `att-secret:v1:<base64url(nonce+ciphertext)>`，GORM 查询后才由 ERP 进程恢复为
   适配器使用的明文，API 响应通过 `json:"-"` 和 `HasSecret` 脱敏。解密密钥是
   独立环境变量 `ATTENDANCE_SECRET_ENCRYPTION_KEY`，必须在重启、副本、备份恢复
   之间保持不变；旧明文会在 ERP 启动时迁移，密文损坏或密钥错误必须阻止启动/使用。
3. **ERP 页面与 Gateway 配置是两个边界**：ERP 页面不会自动修改
   `attendance-gateway/config/config.json`。设备编码、注册 ID、ISUP Key 或入站令牌
   变更后，必须同步修改 Gateway 配置并重启，否则会出现设备注册失败或 ERP 入站
   认证失败。

## 原生 Bridge 运行限制

海康官方 SDK 的 CMS 注册监听器和 Alarm 监听器是进程级监听器。一个 native
Bridge 进程只启动一组注册端口和一组报警端口，所以同一个 Gateway 中所有启用
设备必须共享 `registrationPort`、`alarmTcpPort`、`alarmUdpPort`。不同端口组
需要拆分 Gateway 实例。

## 设备管理页配置

在 `/attendance-management/devices` 选择
`Hikvision ISUP/EHome / iVMS-4200` 模板：

- `ERP / ISUP 网关地址`：设备能够访问的公网 IP、域名或专网地址。
- `设备注册端口`：默认 `7660`，最终以网关实际监听端口为准。
- `设备注册 ID`：必须与设备侧 ISUP 配置完全一致。
- `ISUP Key`：设备注册认证密钥。
- `入站令牌`：网关调用 ERP HTTP 接口时使用，至少 16 位。
- `设备工号字段`：默认 `employeeNo`。
- `系统员工字段`：默认 `staffId`。

`ISUP Key` 和 `入站令牌` 是两个不同的凭据，不能混用。

## 状态回报

网关收到设备注册、心跳、离线或异常时调用：

```http
POST /api/v1/attendance-events/device-status
X-Attendance-Ingress-Token: <设备入站令牌>
Content-Type: application/json
```

```json
{
  "deviceCode": "ATT-HIK-01",
  "status": "heartbeat",
  "message": "ISUP heartbeat received"
}
```

支持的状态值：

- 在线：`registered`、`register`、`online`、`heartbeat`、`connected`
- 离线：`offline`、`disconnected`、`unregistered`
- 异常：`error`、`fault`

## 考勤事件入站

网关把海康事件转换为统一 JSON 后调用：

```http
POST /api/v1/attendance-events/ingest
X-Attendance-Ingress-Token: <设备入站令牌>
Content-Type: application/json
```

```json
{
  "deviceCode": "ATT-HIK-01",
  "events": [
    {
      "deviceEmployeeKey": "1001",
      "externalEventId": "evt-20260813-0001",
      "occurredAt": "2026-08-13T08:30:00+08:00",
      "direction": "in",
      "eventType": "attendance",
      "verificationMethod": "face",
      "source": "hikvision-isup-ehome",
      "rawPayload": {
        "employeeNo": "1001"
      }
    }
  ]
}
```

事件接收成功后，ERP 会自动把设备健康状态更新为在线。

## 文件职责

- `attendance-gateway/internal/config`：读取并校验 Gateway 配置，展开环境变量；
  `isupKey` 和入站令牌均在 Gateway 进程内展开为明文；不读取 ERP 数据库，也不解析
  海康私有协议。
- `attendance-gateway/internal/bridge`：管理 native Bridge 子进程，读取 JSONL；
  不读取 ISUP Key，也不解析 SDK 内存结构。
- `attendance-gateway/internal/gateway`：按设备校验事件和状态，负责 ERP 出站、
  离线队列、重试和 Bridge HTTP 鉴权。
- `attendance-gateway/internal/queue`：只保存待发送或死信 JSON 文件，不承担 ERP
  业务匹配。
- `attendance-gateway/sdk-bridge/native`：唯一直接调用海康 SDK 的模块，负责回调
  ABI、注册认证、SessionKey、报警 XML 到统一 JSONL 的转换。
- ERP `server/services/attendance_event_service.go`：校验设备入站令牌、事件去重、
  员工匹配并写入 `attendance_events`。
- ERP `server/security/secretbox.go`：只负责设备凭据的 AES-256-GCM 加密格式、密钥
  校验和解密，不负责设备连接或 Gateway 配置。
- ERP `server/models/attendance_device.go`：定义设备表字段；GORM 查询后把数据库密文
  恢复为进程内明文，不通过 JSON 输出。
- ERP `server/services/attendance_device_secret_service.go`：显式加密副本写库，并在
  启动阶段把旧明文迁移为密文；健康状态等局部 `Updates` 不写凭据字段。
- ERP `server/services/attendance_device_service.go`：设备主数据、凭据存在状态、
  健康状态和页面预检，不负责启动或重写 Gateway；ISUP 预检只能说明配置已登记，
  不能替代真实设备联调。
