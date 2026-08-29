# Native Hikvision ISUP/EHOME Bridge

这是 `attendance-gateway` 的真实海康官方 SDK 适配层。它直接调用官方 SDK 的
`HCISUPCMS` 和 `HCISUPAlarm` 动态库，负责：

- ISUP/EHOME 设备注册、认证和 SessionKey 协商；
- 设备上线、离线和认证异常状态；
- `EHOME_ALARM_ACS` 门禁/考勤 XML 事件；
- 将统一消息按 JSONL 写到标准输出，交给 Gateway 转发到 ERP。

仓库不提交海康官方头文件、动态库或授权二进制。现场必须从海康官方渠道取得与
设备型号、固件和 ISUP/EHOME 版本匹配的 SDK 包。

## SDK 目录

构建时把 `HIKVISION_SDK_ROOT` 指向官方 SDK 根目录，目录至少应包含：

```text
<sdk-root>/
  incCn/HCISUPCMS.h
  incCn/HCISUPAlarm.h
  incCn/HCISUPPublic.h
  lib64/HCISUPCMS.dll       # Windows 示例
  lib64/HCISUPAlarm.dll
  lib64/libeay32.dll
  lib64/ssleay32.dll
  lib64/HCAapSDKCom/
```

Windows 下官方 SDK DLL 必须在 Bridge 可执行文件旁边，或由启动服务提前加入
`PATH`。构建脚本会把 `lib64` 根目录的 DLL 和 `HCAapSDKCom` 复制到 Bridge
输出目录根目录，避免进程启动阶段找不到 `HCISUPCMS.dll`。默认输出目录就是
`attendance-gateway/sdk-bridge`，因此 Windows 下 EXE 与 DLL 同目录。

Linux SDK 的库名和目录以官方包为准，常见形式为 `libHCISUPCMS.so`、
`libHCISUPAlarm.so`、`libcrypto.so` 和 `libssl.so`。默认输出目录把 Bridge
可执行文件放在 `attendance-gateway/sdk-bridge` 根目录，把运行库放在
`attendance-gateway/sdk-bridge/vendor/lib64` 或 `vendor/lib`。

## 构建

Windows x64：

```powershell
.\build-windows.ps1 -SdkRoot C:\vendor\HikvisionISUPSDK
```

Linux x64：

```sh
./build-linux.sh /opt/vendor/HikvisionISUPSDK
```

脚本只从指定的官方 SDK 目录复制运行时文件，不会把这些文件写回 Git 工作区。

## 运行

Gateway 会自动注入：

- `ISUP_GATEWAY_CONFIG_FILE`
- `ISUP_GATEWAY_BRIDGE_TOKEN`
- `ISUP_GATEWAY_BRIDGE_API`
- `ISUP_GATEWAY_BRIDGE_CONTRACT=jsonl-v1`

也可以直接运行：

```powershell
$env:ISUP_GATEWAY_CONFIG_FILE = "C:\xdfc\config\config.json"
.\xdfc-isup-sdk-bridge.exe
```

配置中需要填写：

```json
{
  "sdkBridgeRuntimeDir": "C:/xdfc/sdk-bridge",
  "sdkBridgePublicAddress": "203.0.113.20",
  "sdkBridgeAlarmProtocol": "tcp",
  "sdkBridgeTimezoneOffset": "+08:00"
}
```

`sdkBridgePublicAddress` 是设备实际能够访问的网关地址，不能填写
`127.0.0.1`、容器内部地址或仅本机可达的地址。没有公网暴露时填写工厂内网
服务器 IP 或 DNS。

## 多设备端口限制

海康官方 SDK 的 CMS 注册监听器和 Alarm 监听器是进程级监听器。一个 native
Bridge 进程只启动一组注册端口、一组报警端口。因此同一个 Gateway 中所有启用
设备必须共享：

- `registrationPort`
- `alarmTcpPort`
- `alarmUdpPort`

Go Gateway 和 native Bridge 都会校验这一点。若现场必须使用不同端口，请为每组
端口启动独立 Gateway/Bridge 实例。

## 事件处理

Bridge 只把 `dwAlarmType == EHOME_ALARM_ACS` 转成考勤事件。工号优先读取：

- `employeeNo`
- `employeeNoString`
- `pin`
- `userId`

时间优先读取 `dateTime`、`time` 或 `eventTime`；没有时区的设备时间会按
`sdkBridgeTimezoneOffset` 补齐。验证方式会映射成人脸、指纹、卡或密码，无法识别
时保留 `hikvision-verify-<原值>`。

原始 XML 会完整放在 `rawPayload.xml`，因此设备固件增加字段时不会被 Bridge
静默丢弃。没有工号的 ACS 报警会记录日志并忽略，避免把无法匹配员工的事件写入
ERP。

## 最终联调边界

没有现场设备时可以验证编译、SDK 初始化调用和 JSONL 合约，但不能声称设备注册、
认证、SessionKey 和 XML 字段已经完成现场联调。正式交付前仍需用实际型号、固件和
SDK 版本做一次注册、刷脸/刷卡、断网重连和重复事件测试。

现场交付还必须确认：

- ERP 设备页面的设备编码、员工映射和入站令牌哈希，与 Gateway
  `config/config.json` 中的设备编码、注册 ID、ISUP Key 和明文入站令牌分别属于
  不同配置边界；页面修改不会自动改写 Gateway 文件。
- ERP 的 `AttendanceDevice.SecretValue` 在数据库中已使用
  `ATTENDANCE_SECRET_ENCRYPTION_KEY` 加密，API 不会返回明文；该密钥必须由 ERP
  部署独立保管，并在重启、副本、备份恢复之间保持不变。Gateway 的
  `config.json` 仍然保存自己的明文 `isupKey`，两者不是同一个存储边界。
- 修改设备编码、注册 ID、ISUP Key 或入站令牌后，要同步更新 Gateway 配置并重启，
  再重新执行真实设备联调。
