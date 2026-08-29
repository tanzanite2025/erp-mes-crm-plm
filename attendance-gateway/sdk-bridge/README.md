# 海康官方 SDK Bridge

`attendance-gateway` 不包含海康 SDK 的动态库、头文件或私有协议实现。现场部署时，
由项目交付人员把从海康官方渠道获取的 ISUP/EHOME SDK 放入独立 native Bridge
运行目录，再在网关配置中填写 `sdkBridgeCommand`。仓库已经提供
`sdk-bridge/native` 的 C++ 封装源码、CMake 和 Windows/Linux 构建脚本。

这样做有三个目的：

1. 不把受授权限制的海康二进制提交到 ERP 仓库。
2. 海康 SDK 升级时只替换 Bridge，不需要重新编译 ERP 或网关核心。
3. 工厂现场只需要维护 ERP 设备主数据和 Gateway 运行配置，不需要理解 SDK
   回调代码。

## Bridge 运行约定

网关会向 Bridge 注入以下环境变量：

- `ISUP_GATEWAY_BRIDGE_TOKEN`：Bridge 调用网关 HTTP 接口时使用的令牌。
- `ISUP_GATEWAY_BRIDGE_API`：网关地址，默认 `http://127.0.0.1:9090`。
- `ISUP_GATEWAY_BRIDGE_CONTRACT`：当前值为 `jsonl-v1`。
- `ISUP_GATEWAY_CONFIG_FILE`：网关配置文件路径。

原生 Bridge 负责：

- 初始化海康官方 ISUP/EHOME SDK。
- 按配置打开设备注册和报警监听端口，默认现场通常是 `7660`、`7332`、`7334`，
  但必须以 SDK/设备版本要求为准。
- 把设备注册、心跳、注销和异常转换为网关状态消息。
- 解析考勤/门禁事件，转换为统一事件消息。
- 对设备的 `registrationId`、`isupKey` 做校验。

真实 SDK Bridge 的构建、SDK 目录、端口限制和最终联调边界见：

- [native Bridge 说明](native/README.md)

## 推荐输出格式

Bridge 可以将消息写入自己的标准输出，每行一个 JSON 对象。网关会自动读取并转发。

设备状态：

```json
{"type":"status","status":{"deviceCode":"ATT-HIK-01","status":"registered","message":"ISUP device registered"}}
```

心跳：

```json
{"type":"heartbeat","deviceCode":"ATT-HIK-01","message":"heartbeat received"}
```

单条考勤事件：

```json
{
  "type": "event",
  "event": {
    "deviceCode": "ATT-HIK-01",
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
}
```

批量考勤事件：

```json
{
  "type": "events",
  "deviceCode": "ATT-HIK-01",
  "events": [
    {
      "deviceEmployeeKey": "1001",
      "occurredAt": "2026-08-13T08:30:00+08:00",
      "direction": "in"
    }
  ]
}
```

## HTTP 调用方式

如果 SDK Bridge 使用 HTTP 服务而不是标准输出，也可以调用：

```text
GET  /v1/bridge/devices
POST /v1/bridge/events
POST /v1/bridge/status
```

请求必须携带：

```text
X-ISUP-Gateway-Token: <bridgeToken>
```

标准输出 JSONL 和 HTTP 只能选一种作为 Bridge 的输出方式，现场不需要同时启用。
