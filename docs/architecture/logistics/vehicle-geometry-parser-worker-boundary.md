# 车型几何解析 Worker 边界

## 1. 文档目的

本文档只规定车型 GLB 解析从上传到模板版本快照的边界。

它不定义装箱搜索、不定义真实发货，也不把解析器实现塞进 Go 的车型模板 CRUD。

## 2. 长期数据链路

```text
车型模板上传
  -> Go 保存受控 GLB 文件
  -> Go 接收显式同步或异步解析请求
  -> 异步任务写入解析任务表
  -> Go 进程内 parser worker 领取任务
  -> Rust parser CLI 读取受控文件
  -> 输出 vehicle-geometry.v1 JSON
  -> Go 校验解析结果
  -> 写入模板版本快照
  -> 模板状态变为 normalized
  -> Rust 装箱核心 / WASM 读取归一几何
```

## 3. 各层职责

### 3.1 Go 应用

Go 是业务编排层，负责：

- 登录、权限和审计；
- 车型模板与种子车型绑定；
- 受控上传文件路径；
- 同步解析入口和异步解析任务入口；
- 解析任务状态、领取、重试和版本幂等；
- 调用 parser CLI；
- 校验 `vehicle-geometry.v1`；
- 将解析结果写入版本快照；
- 向前端返回任务状态和归一摘要。

Go 不负责：

- 读取三角网格；
- 推断节点语义；
- 计算世界变换；
- 重新实现 GLB 解析。

### 3.2 Rust parser core

Rust core 负责：

- GLB 2.0 结构解析；
- 节点层级与世界变换；
- `extras.xdfc` 语义读取；
- 顶点坐标、AABB 归一化和显式 OBB 推导；
- 输出 `vehicle-geometry.v1`。

Rust core 不负责：

- 访问数据库；
- 访问 Redis；
- 修改模板状态；
- 处理登录权限；
- 决定是否允许发货。

### 3.3 Go parser worker

当前 Go parser worker 运行在 API 进程内，负责：

- 从 `logistics_vehicle_model_template_parse_tasks` 领取 queued 任务；
- 校验任务保存的模板版本、源文件地址、文件名和格式仍然有效；
- 调用现有同步解析服务；
- 按最大尝试次数和退避时间重试；
- 将任务推进到 `succeeded` 或 `failed`。

它不复制 GLB 解析逻辑，也不直接解释三角网格。

### 3.4 Rust parser CLI

parser CLI 只是 Rust 解析运行边界：

- 接收受控文件路径或 stdin；
- 调用同一个 Rust core；
- 输出 JSON；
- 不保存业务状态；
- 不直接写数据库。

当前仓库采用“API 进程内任务 worker + Rust parser CLI”。后续如果解析耗时或任务量上升，可以把 Go 任务 worker 或 Rust parser CLI 拆成独立服务，不改变解析协议。

## 4. 当前解析入口

普通保存模板不会自动解析。系统同时保留同步解析入口和异步任务入口。

同步入口：

```text
POST /logistics-config/vehicle-model-templates/:id/parse
```

异步入口：

```text
POST /logistics-config/vehicle-model-templates/:id/parse/tasks
GET  /logistics-config/vehicle-model-templates/:id/parse/tasks/:taskId
POST /logistics-config/vehicle-model-templates/:id/parse/tasks/:taskId/retry
```

异步创建接口返回 `202 Accepted` 和任务快照。API 进程内 worker 默认每 5 秒领取任务，解析成功后才写入新的模板版本快照。

解析器二进制路径：

```text
VEHICLE_GEOMETRY_PARSER_BIN
```

未设置时，Go 会优先尝试仓库本地 Rust 构建产物，再回退到 PATH 中的 `xdfc-vehicle-geometry-parser`。

生产 API 镜像内置该 CLI：

```text
server/Dockerfile
  -> api-builder 构建 /app/xdfc-server
  -> vehicle-geometry-parser-builder 构建 /app/xdfc-vehicle-geometry-parser
  -> runtime 同时复制两个二进制
```

生产 compose 显式配置：

```text
VEHICLE_GEOMETRY_PARSER_BIN=/app/xdfc-vehicle-geometry-parser
```

当前选择“API 镜像内置 parser CLI + API 进程内任务 worker”，不先拆独立 worker 服务，原因是：

- 当前解析入口仍由管理员显式触发，任务量不大；
- 车型模板 GLB 单文件上限为 8MB，解析有服务端超时和输出上限；
- 任务表、领取、有限重试和版本校验已经在 API 进程内形成闭环；
- Rust core 与 CLI 已独立在 `vehicle-loading-engine/`，后续可以在不改解析协议的前提下拆服务。

## 5. 当前异步 worker 状态

模板状态与任务状态分开：

```text
模板 uploaded
  + 任务 queued/running
  -> 模板 normalized
```

失败时：

```text
模板 uploaded
  + 任务 failed
```

不能把失败的源文件标记成 `normalized`。

任务状态流转为：

```text
queued
  -> running
  -> succeeded
  -> failed
```

失败任务默认有限重试；模板版本、源文件地址、文件名或格式发生变化时，旧任务直接失败，不再解析旧快照。

## 6. 结果落库规则

解析结果必须先通过 Go 校验：

- `schemaVersion` 必须为 `vehicle-geometry.v1`；
- `sourceFormat` 必须为 `glb`；
- 必须存在 `usable-space`；
- 尺寸必须为正数且在车型限制内；
- 所有坐标必须有限；
- `parts` 数量不能超过服务端上限。

通过后，解析结果写入模板版本快照中的 `geometry` 字段。

源文件和解析结果都要绑定到同一个模板版本，不允许只更新当前模板而不保留历史几何。

## 7. 大文件和 Redis 边界

- GLB 文件只走受控上传目录或对象存储；
- parser worker 通过文件路径或受控流读取；
- 不把 GLB 二进制放进 Redis；
- 不把完整几何 JSON 放进 Redis；
- Redis 只允许保存短期任务锁、去重键或进度摘要；
- 解析结果的唯一真相源是模板版本快照。

## 8. 重试和幂等

同一个模板版本只能有一个运行中的解析任务。

任务去重键由以下字段组成：

```text
templateId + templateVersion + sourceAssetUrl + sourceAssetName + sourceFormat
```

当前实现使用源文件元数据作为快照键，尚未计算二进制 digest。重复提交同一模板版本的活动任务时返回现有任务，不重复解析。

解析失败可以重试，但每次重试都必须保留错误摘要和尝试次数。

当前同步入口的幂等边界：

- 解析开始前读取模板当前版本；
- 解析落库前再次读取模板；
- 如果源文件、格式、文件名或版本发生变化，返回冲突，不把旧文件解析结果写到新模板上。

## 9. 当前实现状态

已完成：

- Rust GLB parser core；
- `vehicle-geometry.v1`；
- WASM JSON 适配层；
- parser CLI；
- GLB-only 上传入口；
- Go 显式解析入口；
- 解析结果服务端校验；
- `vehicle-geometry.v1` 写入模板版本快照；
- 解析成功后推进模板状态为 `normalized`；
- `logistics_vehicle_model_template_parse_tasks` 解析任务表；
- API 进程内 parser worker 的领取、有限重试和模板版本校验；
- 异步创建、查询和 retry 入口；
- Worker 幂等、成功、失败重试、版本变更和人工 retry 测试；
- 本边界文档。

未完成：

- 前端解析进度和失败重试；
- 大 GLB 的异步进度与失败重试；
- 独立 parser worker 服务；
- 3D 预览引擎接入。
