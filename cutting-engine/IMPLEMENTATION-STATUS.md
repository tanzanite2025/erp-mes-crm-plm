# 裁切引擎实现状态

> 状态基准：2026-07-23  
> 算法代码基线：`0772d388 feat: support multi-roll cutting allocation`  
> 部署状态：本轮已完成代码提交和本地构建验证，尚未部署到服务器。

这份文档记录裁切引擎当前真实能力、文件职责、数据链路和明确未完成项。后续扩展算法或接入后端时，应先更新这里的状态，再修改实现，避免把“协议已接入”误认为“算法已经全完成”。

## 一、当前结论

当前正式接入的是：

**Rust/WASM 单卷/多卷矩形贪心候选模式。**

它已经可以在满足基本规则的前提下，把多个需求行分配到一卷或多卷材料中；当一条需求行超过当前卷容量时，会拆分到后续卷材。它是稳定、可解释的候选方案生成器，不是旋转排样、嵌套排样或全局最优求解器。

当前结果会真实输出：

- 每个卷材的 `rollId`。
- 每个卷材的产出件数、利用率和损耗面积。
- 每个 Material zone 所属卷材、需求行和产出件数。
- 前端按卷材拆分后的 assignments、需求摘要、卷材布局摘要和跨卷统计。
- 不满足规则或容量不足时的 warning 和未满足需求摘要。

## 二、独立模块边界：裁纱和卷材不能阻断生产

这是裁纱域必须长期遵守的业务边界：

**裁纱计算、卷材分配和卷材绑定是独立能力，不是产品进入后续下单/生产环节的前置条件。**

一维码代表的是可追溯的产品或产品单元。只要产品的一维码有效，即使当前没有绑定卷材，也必须允许它继续进入后续的下单、排产和生产流程。卷材信息属于额外的生产准备和追溯增强信息，不能反向决定产品是否可以流转。

| 状态 | 作用 | 是否阻断普通下单/生产 |
| --- | --- | --- |
| 一维码/产品身份有效 | 标识产品并承载基础追溯 | 否，按产品业务规则判断 |
| 裁纱方案已计算 | 提供裁切建议、数量和几何结果 | 否 |
| 已绑定卷材 | 提供卷材批次、位置和材料追溯 | 否 |
| 已接入自动切割 | 供自动切割设备执行 | 仅影响自动切割任务本身，不影响普通产品生产流转 |

实现上必须保持以下隔离：

- 普通订单、生产任务和一维码流转不能把 `rollId` 作为必填字段。
- 不允许因为没有卷材绑定而拒绝产品下单、排产、扫码入站或进入后续生产工序。
- 卷材绑定可以作为可选的追溯引用、裁纱执行引用或自动切割输入，但不能成为产品主身份的替代品。
- 如果未来自动切割设备确实要求卷材，校验只能放在“自动切割执行任务”这一局部能力内，不能上升为整个生产域的全局门槛。
- 裁纱计算失败、尚未计算或未绑定卷材时，应记录明确状态并允许业务继续；只有实际调用裁纱/自动切割能力的动作才需要处理对应错误。

当前代码中的 `rollId` 只属于裁纱引擎的结果、预览和追溯映射链路；后续接入生产域时，应使用可选关联或事件记录，避免建立“产品必须先绑定卷材”的强耦合外键。

## 三、已经完成

### 2.1 Rust 核心

- 矩形 strip 贪心排布。
- 单卷和多卷分配。
- 单个需求行跨卷拆分。
- `allowMixedPlan=false` 的混排限制。
- `sameGroupOnly` 的卷组限制。
- `sameDirectionRequired` 的方向限制。
- `strict-same-angle` 的角度限制。
- `mustFulfill` 的 strict、soft penalty、ignore 模式。
- 刀缝、修边、最小/最大支持长度和固定决策长度。
- 方向切换和角度混排诊断。
- 最多 4096 卷的安全上限。
- 当需求无法放入新卷时，不生成空卷结果。
- `strictNoMix` 保留逐需求行候选回退路径。

### 2.2 WASM 协议

- `CuttingLayoutZone` 已输出 `rollId`。
- `CuttingPlan` 已输出 `rolls`。
- 每个卷材 summary 输出：
  - `rollId`
  - `producedPieces`
  - `utilizationPercent`
  - `lossAreaM2`
- 前端适配层会校验上述字段，协议缺失时直接报结构异常，不静默降级。

### 2.3 前端结果映射

- 需求行产量按卷材拆分。
- 跨卷需求的 `rollCount`、`rollIds`、`isSplitAcrossRolls` 使用真实结果。
- assignments 使用真实卷材 ID。
- 布局 zone 和几何 zone 使用真实卷材 ID。
- 卷材摘要使用 Rust 返回的每卷产量、利用率和损耗。
- `usedRollCount`、`usedRollPercent`、`splitDemandCount` 使用真实结果计算。
- 选中具体预浸料时，前端会把卷材 ID 映射为稳定的业务 ID；多卷场景使用 `物料ID:rust-wasm-roll-N` 形式避免重复。

## 四、文件职责和数据链路

```text
/raw-materials-engine/cutting-simulation
  -> use-batch-engine-solve.ts
  -> build-batch-engine-cutting-input.ts
  -> batch-engine-cutting-wasm.ts
  -> wasm/pkg/xdfc_cutting_engine_wasm.js
  -> cutting-engine/wasm
  -> cutting-engine/core
  -> map-cutting-engine-output-to-batch-solution.ts
  -> 预览、卷材筛选、导出和需求审查组件
```

| 层级 | 位置 | 职责 |
| --- | --- | --- |
| 业务输入 | `src/features/raw-materials/batch-engine/services/build-batch-engine-cutting-input.ts` | 将切割计划、裁切尺寸和规则整理为引擎输入 |
| WASM 调用 | `src/features/raw-materials/batch-engine/services/batch-engine-cutting-wasm.ts` | 初始化 WASM、调用求解、校验返回协议 |
| 前端产物 | `src/features/raw-materials/batch-engine/wasm/pkg` | 页面实际加载的 WASM 构建产物 |
| JSON 适配 | `cutting-engine/wasm/src/output.rs` | Rust 类型转换为稳定的前端 JSON 协议 |
| 算法核心 | `cutting-engine/core/src/packing.rs` | 多卷矩形贪心和跨卷拆分 |
| 几何输出 | `cutting-engine/core/src/geometry.rs` | 单需求回退路径的矩形 zone |
| 结果映射 | `src/features/raw-materials/batch-engine/services/map-cutting-engine-output-to-batch-solution.ts` | 将核心结果映射成页面使用的方案模型 |
| 结果摘要 | `src/features/raw-materials/batch-engine/services/cutting-engine-output-mapper` | 需求、布局、统计、评分和解释摘要 |

修改 Rust 核心后，必须重新生成 `wasm/pkg`，否则页面会继续运行旧的二进制。

## 五、明确尚未完成

以下能力当前没有实现，不应在页面、接口或审计记录中宣称已经具备：

1. 旋转排样。
2. 非矩形嵌套、自由形状排样和真实几何碰撞优化。
3. 跨卷全局最优搜索。
4. 需求行之间的全局组合优化。
5. 完整的 `priority` 权重搜索。
6. `processTags` 兼容矩阵。
7. 交期、订单顺序等硬约束优化。
8. 跨工单混排的全局满足率优化。
9. 多卷场景下基于全局搜索的 mustFulfill 最优保障。
10. 后端 Go handler 的同核心复用、服务端批量求解和审计留痕。

当前 `priority`、`orderSequence`、`rollGroupKey` 和 `processTags` 已进入排序、硬约束或诊断链路，但这不等于已经完成完整的全局优化。

## 六、验证记录

本状态对应的验证结果：

- Rust 单元测试：21 项通过。
- `cargo fmt --check`：通过。
- WASM release 构建：通过。
- TypeScript 类型检查：通过。
- ESLint：通过。
- i18n parity 校验：通过。
- zh-CN 编码校验：通过。
- 前端生产构建：通过。
- WASM 运行时冒烟：已确认单条需求可跨两卷输出，zone 的 `rollId` 与每卷 summary 一致。

## 七、下一步建议

算法升级应按以下顺序推进：

1. 继续补充多卷、容量不足、规则隔离、跨卷拆分和产量守恒测试。
2. 在独立阶段引入旋转和嵌套排样，不要直接改写当前矩形贪心路径。
3. 增加受预算约束的候选搜索，再评估跨卷全局优化。
4. 完成后端 Go handler 复用，并补充服务端审计留痕。
5. 算法边界、协议字段或部署状态变化时，同步更新本文件。
