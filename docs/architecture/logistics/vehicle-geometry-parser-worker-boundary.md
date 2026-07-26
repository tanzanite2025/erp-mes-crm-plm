# 车型几何解析 Worker 边界

## 1. 文档目的

本文档只规定车型 GLB 解析从上传到模板版本快照的边界。

它不定义装箱搜索、不定义真实发货，也不把解析器实现塞进 Go 的车型模板 CRUD。

## 2. 长期数据链路

```text
车型模板上传
  -> Go 保存受控 GLB 文件
  -> Go 接收显式解析请求
  -> Rust parser CLI / 后续 worker 读取受控文件
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
- 显式解析入口；
- 调用 parser CLI / 后续 parser worker；
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
- 顶点坐标和 AABB 归一化；
- 输出 `vehicle-geometry.v1`。

Rust core 不负责：

- 访问数据库；
- 访问 Redis；
- 修改模板状态；
- 处理登录权限；
- 决定是否允许发货。

### 3.3 parser worker / CLI

worker 或 CLI 只是运行边界：

- 接收受控文件路径或 stdin；
- 调用同一个 Rust core；
- 输出 JSON；
- 不保存业务状态；
- 不直接写数据库。

当前仓库先提供 CLI，后续可以把同一 core 包装成独立 worker 服务，不改变解析协议。

## 4. 当前显式解析入口

当前实现不创建后台任务表，也不会在普通保存模板时自动解析。

管理员显式调用：

```text
POST /logistics-config/vehicle-model-templates/:id/parse
```

该入口同步调用 `xdfc-vehicle-geometry-parser`，解析成功后才写入新的模板版本快照。

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

当前选择“API 镜像内置 parser CLI”，不先拆独立 worker，原因是：

- 解析入口是管理员显式触发，不是高频后台任务；
- 车型模板 GLB 单文件上限为 8MB，解析有服务端超时和输出上限；
- 现在先保证线上 API 能真正执行解析，避免出现只有任务状态、没有执行进程的死链路；
- Rust core 与 CLI 已独立在 `vehicle-loading-engine/`，后续如果解析耗时或任务量上升，可以在不改解析协议的前提下拆成 worker；
- 如果现在提前拆 worker，会同时引入任务表、队列、状态轮询、失败重试 UI 和部署服务，复杂度大于当前收益。

## 5. 后续异步 worker 状态

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

如果后续文件更大、解析耗时更长，再引入任务状态：

```text
queued
  -> running
  -> succeeded
  -> failed
```

但在 worker 真正接入前，不建立空任务表，避免出现“有状态但没有执行链路”的死数据。

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
templateId + sourceAssetUrl + sourceAssetDigest
```

重复提交同一文件时返回现有任务，不重复解析。

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
- 本边界文档。

未完成：

- Go 解析任务表；
- worker 调度；
- 前端解析进度和失败重试；
- 碰撞核心接入。
