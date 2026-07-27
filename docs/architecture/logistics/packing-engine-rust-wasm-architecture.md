# 装箱引擎 Rust / WASM 长期架构方案

## 1. 目标

当前 `/logistics-config/vehicle-loading` 页面只适合做“包装规则 + 箱数 + 车型推荐”的轻量试算。

长期要解决的是更真实的装箱模拟：

- 鼠标旋转查看；
- 透明方块预览；
- 车厢、轮包、凸起、禁放区建模；
- 碰撞检测；
- 翻转 / 旋转 / 多朝向摆放；
- 3D 结果在浏览器里即时预览。

## 2. 总体分层

```text
Go 后端
  -> 业务 API、权限、包装规则、车型库、销售订单、日志

Rust 装箱核心
  -> 几何计算、碰撞检测、装箱搜索、障碍物约束、结果评分

WASM 运行时
  -> 浏览器侧实时试算、交互预览、拖拽旋转、碰撞提示

前端渲染层
  -> Canvas / WebGL / Three.js / 自研渲染层
```

## 3. 为什么要拆成 Rust + WASM

1. 装箱问题核心是几何和碰撞，不是普通业务 CRUD。
2. 需要同时支持服务端批量计算和浏览器实时预览。
3. 需要可复用、可测试、可版本化的计算核心。
4. 未来如果要做 3D 交互，浏览器直接跑 WASM 最自然。

## 4. 当前状态

当前页面里的计算引擎仍是 Go 服务端启发式算法，适合：

- 根据包装规则估算总体积 / 总重量；
- 根据车型规格做推荐排序；
- 给页面提供当前的简化试算结果。

但它不适合承担：

- 真实碰撞检测；
- 复杂摆放搜索；
- 3D 视角渲染；
- 透明方块预览；
- 车轮包 / 禁放区精确避让。

## 5. 长期职责边界

### 5.1 Go 继续负责

- 登录、权限、审计；
- 包装规则 CRUD；
- 车型规格库 CRUD；
- 销售订单读取；
- 试算请求编排；
- Rust/WASM 结果落库或缓存。

### 5.2 Rust 引擎负责

- 货物与空间几何模型；
- 装箱枚举与搜索；
- 碰撞检测；
- 旋转 / 翻转 / 朝向约束；
- 装车评分和方案选择。

### 5.3 WASM 负责

- 浏览器内实时预览；
- 鼠标拖拽旋转；
- 透明方块显示；
- 视图切换；
- 即时反馈碰撞与不可放置区域。

### 5.4 计算输入真相源

在 Rust/WASM 接入前，Go 推荐服务先固定业务输入边界：

```text
前端
  -> boxes
  -> packagingProfileId
  -> vehicleSpecIds

Go
  -> 读取包装规则主数据
  -> 读取车型规格主数据
  -> 生成规范化计算输入

Rust/WASM
  -> 只接收规范化几何与装载约束
```

前端不得把可编辑的尺寸、重量或车型对象作为计算真相源提交。朝向也必须保存完整的轴映射和旋转后的尺寸，不能只保存一个抽象轴标签。

这里的“车型规格主数据”只包含计算需要的几何、载重、安全余量和约束，不包含车型照片、展示图和页面说明。展示数据必须留在页面展示链路，不能进入装箱推荐输入解析。

## 6. 页面落点建议

`/logistics-config/vehicle-loading` 最终应该只保留三块核心信息：

1. 选包装规则；
2. 输入箱数；
3. 自动显示总体积 / 总重量；
4. 打开独立预览弹窗查看 3D 装箱。

推荐结果、车型筛选、计算说明可以保留为辅助信息，但不要盖过核心的“装箱预览”。

## 7. 迁移策略

不要直接重写整个 ERP 后端。

建议分三步：

1. 先把当前 Go 试算整理成清晰、稳定的业务输入输出；
2. 再把几何核心抽到 Rust，先做 native 库或命令行；
3. 最后编译成 WASM 接入浏览器预览。

这样可以保证：

- 当前系统不中断；
- 页面结构先稳定；
- 后续 3D 预览和碰撞检测有真正的长期底座。

## 8. 当前装箱预览弹窗状态

当前 `/logistics-config/vehicle-loading` 已经有独立的“装箱预览”弹窗。

前端结构已经按长期方向拆开：

```text
推荐结果
  -> VehicleLoadingPreviewScene
    -> VehicleLoadingPlanDialog
      -> VehicleLoadingPreviewWorkspace
        -> useVehicleLoadingPreviewControls
        -> VehicleLoadingPreviewRenderer
        -> VehicleLoadingLayer2DPreviewRenderer
        -> VehicleLoadingSpace3DPreviewPlaceholder
        -> VehicleLoadingPreviewDetailsPanel
```

当前仍然使用 `layer-2d` 渲染器展示按层示意图。

`space-3d` 只是预留入口，未接入真实 Rust / WASM / WebGL 引擎。

当前已经具备：

- 预览场景对象；
- 按推荐车型读取模型模板注册表中的最新模板摘要；无模板或模板读取失败时回退到种子车型；
- 模型模板注册表已经具备版本快照、显式恢复和显式 GLB 解析入口，解析出的真实几何摘要会写入模板版本快照；
- 按层数据 `layers`；
- 层浏览器；
- 缩放控制；
- 左侧预览和右侧说明联动；
- 2D 预览按车厢长宽与箱体脚印做比例示意；
- 2D 预览已经可以接收 `vehicle-loading-plan.v1` 的真实 placements，并按 x/y 坐标绘制当前层；
- 当前层利用率、槽位占用和真实比例状态可见；
- 独立说明面板；
- 未来 3D 渲染器入口。

注意：当前模板注册表已经可以把 GLB 解析成 `vehicle-geometry.v1` 并写入版本快照；2D 示意仍默认使用车型规格尺寸。只有当后续 WASM 执行器返回 `vehicle-loading-plan.v1` 时，预览层才会消费真实 placements；3D 预览还没有消费该几何。

当前还没有完成：

- WebGL / Three.js 真实 3D 渲染；
- 前端页面读取车型模板几何并生成车轮包、门洞、凸起、禁放区输入；
- 通用三角网格 / 曲面级碰撞检测；
- 鼠标拖拽旋转；
- 前端页面正式加载 WASM 执行器。
- 当前页面主流程自动从 Go 推荐切换到 Rust/WASM plan。

模板解析当前采用“用户显式点击解析 -> Go 调用 parser CLI -> 写入模板版本快照”的同步业务链路；不保留后台解析队列作为隐性待办。

当前已完成第一阶段的独立 Rust 解析核心：

- 只接受 GLB（glTF 2.0 Binary）；
- 校验 GLB 版本、内置 BIN、资源数量和文件大小；
- 校验节点 `extras.xdfc` 语义；
- 读取节点世界变换和 POSITION；
- 归一化为毫米制 AABB；
- 对声明 `collision=obb` 的语义节点，从 mesh 本地 AABB 和节点世界矩阵推导 OBB；
- 拒绝剪切、非正交、零长度轴和零厚度 OBB；
- 输出 `vehicle-geometry.v1`；
- 对缺少可用空间、外部资源、非法坐标和超限数据直接拒绝。

同时已增加独立 WASM 边界适配层：

- `vehicle-loading-engine/wasm` 只负责字节输入和 JSON 输出；
- 不复制解析逻辑；
- 已通过 `wasm32-unknown-unknown` 编译检查；
- 已提供 `parse_vehicle_geometry_glb`；
- 已提供 `calculate_vehicle_loading_plan`；
- 前端已有纯 TS 协议适配层，可以构造 `vehicle-loading-request.v1`，也可以把 `vehicle-loading-plan.v1` 转成预览场景；
- 前端已有 `vehicle-loading-wasm-engine.ts` 执行器，可以初始化 wasm-pack 产物并调用 `calculate_vehicle_loading_plan`；
- wasm-pack 产物位于 `src/features/logistics-config/vehicle-loading/wasm/pkg`；
- 可通过 `pnpm run build:vehicle-loading-wasm` 重新生成 WASM 产物；
- 主 `pnpm build` 暂未强制执行 WASM 构建，避免部署机缺少 wasm-pack 时影响已有业务构建；后续确认服务器构建链后再纳入主构建。

当前前端 WASM 文件职责：

```text
vehicle-loading-wasm-plan-request.ts
  -> 从包装主数据、车型主数据、箱数生成 vehicle-loading-request.v1

vehicle-loading-wasm-engine.ts
  -> 初始化 wasm-pack 产物，调用 Rust/WASM 函数，返回 vehicle-loading-plan.v1
  -> 失败时抛出“WASM 装箱计算失败：具体原因”，页面必须直接提示失败

vehicle-loading-wasm-plan-preview-scene.ts
  -> 把 vehicle-loading-plan.v1 转成预览弹窗场景
```

失败处理边界：

- WASM 装箱计算失败时，页面必须显示明确失败提示；
- 不允许静默切回旧示意图并让用户误以为计算成功；
- 旧 2D 示意只能用于“尚未启用 WASM / 未请求 WASM 计算”的状态，不能作为失败结果伪装展示。

当前已完成第一版 Rust 装箱核心：

- 输入协议为 `vehicle-loading-request.v1`；
- 输出协议为 `vehicle-loading-plan.v1`；
- 支持单车型、单箱型、单可用长方体空间；
- 支持车辆可用空间内的 AABB / OBB 障碍区 / 禁放区输入；
- 已从原点规则网格升级为“候选锚点 + AABB 碰撞过滤”；
- 候选锚点包含规则网格点、车厢边界和障碍物边缘；
- 能在非对齐障碍后方寻找可摆放位置；
- 支持允许旋转、允许翻转的朝向枚举；
- 按实际贪心摆放结果选择稳定朝向；
- 输出第一辆车内每个箱体的 3D 坐标、层、行、列；
- 同时输出 `maxBoxesPerVehicle`、`vehiclesNeeded`、空间利用率、重量利用率和警告；
- 有受控 `maxPlacementOutput`，避免浏览器一次生成过大的 placements。
- 有受控 `maxGridCellScan`，避免候选锚点扫描被极小箱体或恶意输入放大。
- 支持可选 `collisionClearanceMm` 水平安全间隙；该间隙作用于 x/y 方向，保留 z 方向堆叠接触；
- 支持可选 `boundaryClearanceMm` 车厢水平边界安全间隙；默认值为 0，不改变既有贴墙装载；
- 支持多个相邻 obstacle / wheelWell 顶面联合形成完整水平支撑面；
- 每个朝向和扫描策略输出候选锚点拒绝统计；
- 对首个 blockedSpace 或箱体互撞输出碰撞 witness，支持前端定位失败原因；
- 提供 `loading-plan-diagnostics.v1` 诊断接口，解释尺寸超限、载重不足和无可行支撑/碰撞候选；
- blockedSpace 可选携带 OBB；有 OBB 时用 SAT 做旋转障碍碰撞，没有 OBB 时继续使用 AABB；
- GLB 投影可把 `collision=obb` 语义节点转成 `blockedSpaces[].obb`；
- 输出前执行几何二次验收，拒绝越界、障碍碰撞、箱体互撞、支撑不足或索引不连续的方案。

当前 Rust 装箱核心暂不负责：

- 读取销售订单；
- 读取包装规则数据库；
- 多箱型混装；
- 三角网格级真实碰撞；
- 从无语义任意 GLB 网格自动识别业务障碍；
- 从无语义任意网格自动拟合 OBB；
- 非规则网格搜索；
- 多车辆完整 placements 展开；
- WebGL 渲染。

这些仍然属于后续阶段，不能把第一版分层算法误认为最终碰撞引擎。

## 9. 当前算法稳定性与准确性结论

当前 Rust/WASM 装箱核心可以作为“第一阶段稳定计算底座”，但不能定义为最终强 3D 装箱引擎。

已经稳定覆盖：

- 单车型；
- 单箱型；
- 单个长方体可用装载空间；
- 固定箱数；
- 允许旋转 / 允许翻转；
- AABB 障碍区 / 禁放区过滤；
- 障碍物边缘候选锚点；
- 非对齐障碍后的确定性摆放；
- 第一辆车 placements 输出；
- 受控 placements 输出上限；
- 受控障碍格位扫描上限；
- 浏览器 WASM 调用和失败显式提示。

当前准确性边界：

- 对“规则长方体车厢 + 规则箱体 + AABB / OBB 障碍区 + 候选锚点摆放”的计算是确定性的；
- 对有轮包、门洞、凸起等障碍的情况，只在这些障碍已经被语义解析并转换成 blockedSpaces 后才会参与避让；
- 当前不会从无语义 GLB 真实几何自动识别轮包 / 门洞 / 凸起；
- 当前不是三角网格级碰撞检测；
- 当前的 `collisionClearanceMm` 不是三轴扩张，也不替代网格级安全距离；
- 当前的 `boundaryClearanceMm` 只约束 x/y 车厢边界，不约束地板和顶部；
- 当前不是多箱型混装搜索；
- 当前不是最优全局 3D bin packing，仍是确定性候选锚点贪心装箱。

因此当前引擎评价：

- 稳定性：第一阶段增强版可用；
- 准确性：对 AABB / OBB 障碍区场景比规则网格更准确，对真实复杂车厢仍需要语义建模和更强碰撞；
- 强度：足够承接页面真实 placements 和非对齐障碍避让，但还不够作为最终智能装箱引擎。

后续要升级成强引擎，必须继续做：

- 更复杂语义和三角网格到 blockedSpaces 的受控转换；
- 更细的装载空间分区；
- 非规则格位搜索；
- 多箱型混装；
- 真实 3D / WebGL 预览；
- 通用碰撞检测与评分搜索。

另外提供了独立 parser CLI，当前供 Go 显式解析入口调用，后续也可以复用为 parser worker：

- 输入可以是受控 GLB 文件路径或 stdin；
- 输出只写 `vehicle-geometry.v1` JSON；
- CLI 不访问数据库、不读取业务配置、不修改模板状态。
- Go 负责校验 CLI 输出、推进模板状态并写入版本快照。

当前已经完成上传入口的第一层防护：车型模型源文件走独立入口，单文件限制为 8MB，并通过专用前缀和引用扫描清理超过 24 小时未绑定的临时文件。车型模板只接受符合项目导出规范的 GLB，不把通用 50MB 上传入口当作车型解析入口。未来如果确实需要 CAD 级源文件，必须另建服务端 CAD 转换边界，不能直接把 STEP 等格式塞进当前 Rust/WASM 装箱引擎。
