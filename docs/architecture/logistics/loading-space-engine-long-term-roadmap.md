# 通用装载空间引擎长期升级路线

## 1. 目标

装箱计算最终不能只是估算容量，而必须成为可校验、可复现、可解释的几何计算引擎。

长期目标是同一个引擎同时支持：

- 货柜装箱；
- 厢车 / 卡车装车；
- 轮包、凸起、门洞、禁放区等复杂装载空间；
- 页面内 3D 编辑和人工微调；
- 从 UG / NX 等 CAD 工具导入参考摆放；
- 将页面内方案导出为可复核的 3D / JSON 结果；
- 用人工最优方案反哺算法升级和回归测试。

核心原则：货柜和车型本质上都是 `loadingSpace + package + constraints`。车型只是比货柜多了几何投影和障碍区。

## 2. 长期分层

```text
业务主数据
  -> 包装规则、箱型、货柜规格、车型规格、车型模型模板

几何适配层
  -> 货柜规格 -> loadingSpace
  -> 车型 GLB -> vehicle-geometry.v1 -> usableSpace + blockedSpaces
  -> UG / NX 参考方案 -> layoutSnapshot / golden fixture

Rust 装箱核心
  -> loading-space-plan-request.v1
  -> 整数毫米 AABB
  -> 直角旋转
  -> 碰撞检测
  -> 支撑平面判断
  -> 搜索与评分

WASM / 页面交互
  -> 即时计算
  -> 3D 预览
  -> 手动拖拽 / 吸附 / 碰撞提示
  -> 保存人工方案

导入导出
  -> JSON 快照
  -> GLB 预览资产
  -> CAD 参考摆放
  -> 回归测试 fixture
```

## 3. 当前必须坚持的几何边界

当前引擎使用整数毫米、轴对齐箱体 AABB 和受控障碍区 AABB / OBB 作为第一阶段精确边界。

必须坚持：

- 所有尺寸、坐标、障碍区、摆放位置使用整数毫米；
- 箱体只允许轴对齐摆放；
- 旋转只允许 0 / 90 / 180 / 270 这类直角旋转；
- 180 度和 270 度在 AABB 容量上可以归一，但必须在结果中说明等价角度；
- 不允许 20 度、斜靠、斜插、曲面贴合等非平面姿态；
- AABB / OBB 贴边不算碰撞；
- AABB / OBB 重叠 1mm 就算碰撞。

当前支撑规则采用“水平支撑平面”抽象：

- `z = 0` 是地板平面；
- 已摆放箱体的顶面可以形成水平支撑平面；
- supportable 障碍物顶面可以形成水平支撑平面，例如 `wheelWell` / `obstacle`；
- `keepOut` 不提供支撑平面；
- 相邻 supportable 障碍物顶面可以联合覆盖箱体底面；
- 某高度存在支撑平面时，箱体底下可以悬空，但箱体本身仍然必须保持水平。

这不是有限元受力分析，也不是曲面接触求解。它是业务上可解释的“水平平面装载”规则。

## 4. 为什么不能只依赖 UG / NX

UG / NX 很适合做复杂几何验证和人工最优摆放，但不能成为日常装箱计算的唯一入口。

原因：

- ERP 页面需要即时试算，不能每次导入导出；
- 业务人员不一定会使用 CAD；
- CAD 文件通常缺少包装规则、箱数、载重、订单等业务约束；
- 手工最优方案很有价值，但不能替代可批量运行的算法；
- 导入方案必须经过引擎校验，不能无条件信任外部文件。

正确关系是：

```text
UG / NX 人工最优方案
  -> 作为参考方案、训练样本、回归 fixture
  -> 反哺算法评分和搜索策略
  -> 不能绕过引擎碰撞 / 支撑 / 载重校验
```

长期最好是在页面内完成主流程：

```text
选择货柜/车型
  -> 选择包装规则和箱数
  -> 引擎生成方案
  -> 页面 3D 预览
  -> 人工拖拽微调
  -> 实时碰撞与支撑提示
  -> 保存方案
  -> 必要时导出给 CAD 复核
```

UG / NX 应该是高级复核工具，不是日常必经工具。

## 5. 页面内操作的长期形态

页面最终应该具备一个 3D 装载编辑器，而不是只显示静态结果。

核心能力：

- 读取 `loading-space-plan.v1` placements；
- 显示可用装载空间、障碍区、支撑平面、箱体；
- 箱体拖拽时自动吸附到整数毫米网格和候选锚点；
- 旋转只允许 90 度步进；
- 拖拽过程中实时显示碰撞；
- 拖拽过程中实时显示是否存在水平支撑平面；
- 修改后重新计算利用率、剩余箱数、载重；
- 可以将人工编辑方案保存为 `layoutSnapshot`；
- 可以把人工方案重新提交给 Rust 引擎验证。

保存人工方案时不能只保存截图，必须保存完整几何数据：

```text
layoutSnapshot
  -> schemaVersion
  -> source: algorithm | manual | cad-reference
  -> engineVersion
  -> loadingSpaceId
  -> packageId / packageSetId
  -> usableSpace
  -> blockedSpaces
  -> supportPlanes
  -> placements
  -> orientation / yawDegrees / equivalentYawDegrees
  -> validationResult
  -> createdBy / createdAt
```

## 6. 导出能力

导出分两类：

### 6.1 给业务复核的导出

用于查看和传递方案：

- PDF / 图片装载示意；
- Excel 明细；
- JSON 方案快照；
- GLB / 3D 预览文件。

这类导出以易读为主，但不能作为算法真相源。

### 6.2 给算法和 CAD 的导出

用于长期校验：

- `loading-space-plan.v1`；
- `layoutSnapshot.v1`；
- 可选 GLB 场景；
- 输入请求 hash；
- 引擎版本；
- 坐标系说明；
- 单位说明；
- 碰撞 / 支撑 / 载重校验结果。

这类导出必须可被重新导入并复算，保证方案可追溯。

## 7. UG / NX 导入边界

从 UG / NX 导入时，不应该导入任意自由几何然后直接信任。

建议要求导入文件满足：

- 单位为 mm；
- 坐标轴与引擎约定一致；
- 装载空间、障碍区、箱体必须有稳定 ID；
- 箱体必须是轴对齐长方体或能归一成 AABB；
- 每个箱体必须能映射到包装规则中的 package；
- 每个摆放必须有离散 orientation；
- 导入后必须跑碰撞校验；
- 导入后必须跑水平支撑平面校验；
- 导入后必须跑载重和数量校验。

导入结果不能直接变成“正确方案”。它只能进入：

```text
CAD reference layout
  -> 引擎校验
  -> 页面显示差异
  -> 人工确认
  -> 保存为 golden fixture 或 manual layout
```

## 8. 算法升级路线

### 阶段 1：当前 AABB 确定性引擎

已经具备：

- 通用 `loading-space-plan-request.v1`；
- 车型兼容 `vehicle-loading-request.v1`；
- AABB 障碍区；
- 候选锚点；
- 同层多扫描顺序；
- plan 输出搜索摘要，包括评估朝向数、扫描策略数、可行候选摘要和选中策略；
- 前端已有 `vehicle-loading-layout-snapshot.v1` 类型和 vehicle/generic plan 快照 builder；
- 前端已有 layout snapshot JSON 序列化和协议校验入口；
- 整数毫米碰撞；
- 90 度旋转归一；
- 180 / 270 等价角度说明；
- 水平支撑平面；
- 半开区间 AABB 碰撞：面、边、角接触不碰撞，1mm 重叠即碰撞；
- 几何结果二次验收：边界、障碍碰撞、箱体互撞、支撑面和索引连续性；
- 整数区间溢出时按碰撞处理，避免溢出导致漏检；
- `keepOut` / `keep-out` / `keep_out` 统一按禁放区处理，不提供支撑；
- 可选 `collisionClearanceMm` 水平安全间隙；安全间隙只作用于 x/y 碰撞，不破坏 z 方向堆叠接触；
- 可选 `boundaryClearanceMm` 车厢水平边界安全间隙；默认允许贴墙，启用后要求箱体远离前后左右边界；
- 相邻 obstacle / wheelWell 顶面可以组成复合水平支撑面，keepOut 仍不能提供支撑；
- blockedSpace 可选携带 OBB，候选验算使用 SAT 做旋转障碍碰撞；没有 OBB 时继续使用 AABB；
- WASM 浏览器计算。

验收资产：

- `vehicle-loading-engine/fixtures/real-semantic-van.glb`：包含 `usable-space`、AABB `obstacle`、AABB `keep-out` 和旋转 OBB `keep-out` 语义；
- `vehicle-loading-engine/fixtures/golden/*.json`：覆盖规则车厢、轮包障碍区、禁放区、堆叠支撑、超载、放不下和多车需求；
- `vehicle-loading-wasm-geometry-acceptance.spec.ts`：执行真实 GLB 的 parser -> projection -> WASM packing 链路，并回归 golden 摆放坐标与告警码。

运行方式：

```bash
pnpm run generate:vehicle-loading-acceptance-fixtures
pnpm exec vitest run src/features/logistics-config/vehicle-loading/services/vehicle-loading-wasm-geometry-acceptance.spec.ts
```

当前执行策略：车型几何解析已完成任务表、Worker 调度、有限重试和版本幂等；搜索评分、有限局部搜索、AABB 几何可信度加固、水平安全间隙、车厢边界安全间隙、复合支撑面、碰撞 witness、no-fit 结构化诊断、request-level OBB blockedSpace 碰撞和 GLB `collision=obb` 投影已落地，并继续使用现有语义 GLB、golden fixture 与白盒回归做技术验证。完整回溯、多箱型组合搜索、三角网格级碰撞、无语义网格自动识别和人工方案逼近仍等待业务现场或 CAD 确认方案后再推进。

### 阶段 2：更强搜索

第一轮已落地：

- 多扫描顺序继续保留；
- 同容量候选增加布局评分；
- 评分考虑占用包络、重心高度、车厢边界贴合和障碍区边缘贴合；
- 候选摘要输出评分指标，便于页面解释和回归比较。

第二轮有限局部搜索已落地：

- 对每个扫描策略尝试替换最多 2 个冲突箱体；
- 以候选锚点作为种子重新贪心补位；
- 仅在候选锚点数量不超过 512 时启用，保持 WASM 计算复杂度可控；
- 以箱数优先、布局评分次优的规则保留更优方案；
- 已加入“1 箱局部替换为 2 箱”的单元回归，防止局部搜索退化。

第三轮几何可信度诊断已落地：

- 每个朝向和扫描策略记录候选锚点的接受数；
- 区分车厢边界、blockedSpace、箱体互撞和水平支撑失败；
- 对首个障碍或箱体碰撞保留可复现的 witness，包括锚点、碰撞对象和安全间隙；
- WASM plan 与前端预览显示该诊断，便于验收“为什么这个候选被过滤”；
- 诊断解释当前 AABB 和 OBB blockedSpace 结果，不等同于三角网格碰撞。

当前还提供 `diagnose_vehicle_loading_plan_json` / `diagnose_loading_plan_json`：

- 正常可装时返回各朝向的可行性摘要；
- 放不下时区分尺寸超限、载重不足和没有通过碰撞/支撑验收的候选锚点；
- 诊断接口不改变原有计算接口的失败语义，适合作为失败态的二次解释调用。

第四轮 OBB blockedSpace 已落地：

- `blockedSpaces[].obb` 可携带中心点、半长轴和 3 个正交单位轴；
- 箱体仍是轴对齐长方体，障碍区可为旋转长方体；
- 碰撞验算使用 SAT，能减少 AABB 包围盒误杀；
- OBB 障碍碰撞 witness 使用 `blockedSpaceObb` 标识；
- OBB 障碍暂不提供水平支撑面，避免把旋转面误认为可支撑平面。

第五轮 GLB OBB 投影已落地：

- GLB 节点可在 `extras.xdfc.collision` 声明 `obb`；
- parser 从 mesh 本地 AABB 和节点世界矩阵推导 OBB 中心、半长轴和 3 个单位轴；
- parser 拒绝剪切、非正交、零长度轴和零厚度 OBB，避免把不可表达的几何伪装成正交盒；
- projection 会把 OBB 中心从 GLB 世界坐标转成 usable-space 相对坐标，再写入 `blockedSpaces[].obb`；
- 合成语义 GLB 和前端验收测试已经覆盖 parser -> projection -> WASM packing 链路；
- 当前仍不做无语义任意网格自动拟合 OBB，也不做三角网格级碰撞。

后续可以继续升级：

- 回溯上限；
- 分层评分；
- 优先贴边、优先贴障碍、优先重心稳定；
- 对同一输入保留多个候选方案，而不是只返回一个。

输出可以扩展为：

```text
candidatePlans[]
  -> score
  -> placements
  -> reason
  -> warnings
```

### 阶段 3：多箱型混装

当前单箱型只是第一阶段。长期必须支持：

- 多 package；
- 不同尺寸；
- 不同重量；
- 不同可旋转 / 可翻转规则；
- 优先级；
- 分单 / 分客户 / 分批次约束。

这会从简单 grid packing 升级为真正的组合搜索。

### 阶段 4：页面内人工编辑反哺算法

人工编辑不是算法失败的补丁，而是重要数据来源。

应该记录：

- 用户移动了哪些箱子；
- 为什么算法方案被调整；
- 调整后利用率是否更高；
- 调整后是否仍然满足碰撞和支撑；
- 这个方案是否被标记为“现场可用”。

这些记录可以转成回归 fixture，让后续算法不能退步。

### 阶段 5：CAD reference 反哺

UG / NX 中人工摆出的最优方案应作为高质量 reference：

- 导入为 `cad-reference`；
- 引擎校验通过后保存；
- 与算法方案做差异分析；
- 抽取成 regression fixture；
- 用于评估新搜索策略是否接近人工最优。

## 9. 必须保留的失败边界

为了避免“算不准还以为算准”，这些失败必须显式暴露：

- 输入尺寸不是整数毫米；
- 箱体无法匹配包装规则；
- CAD 坐标系不一致；
- 箱体存在非 90 度旋转；
- 箱体 AABB 碰撞；
- 箱体没有水平支撑平面；
- blockedSpace 超出 usableSpace；
- 支撑面来自 keepOut；
- 载重超限；
- placements 数量与请求箱数不一致；
- 引擎版本与快照版本不兼容。

页面不能静默降级成旧示意图。失败就必须显示失败原因。

## 10. 结论

长期方向不是“把 UG / NX 当作主流程”，而是：

1. 页面内先拥有可信的 3D 装载编辑能力；
2. Rust/WASM 引擎持续承担碰撞、支撑、旋转、载重和评分；
3. UG / NX 作为高级参考方案来源；
4. 人工最优方案和 CAD 方案都要变成可回归的 fixture；
5. 算法每次升级都必须用这些 fixture 验证，没有验证就不能宣称更准。

最终目标是让业务人员在页面内完成 90% 的装载方案生成和调整；CAD 只用于复杂方案复核、标杆方案沉淀和算法升级验证。
