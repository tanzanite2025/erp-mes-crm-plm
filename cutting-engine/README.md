# Cutting Engine

裁切计算引擎工作区，用于承载 `/raw-materials-engine/cutting-simulation` 的 Rust/WASM 求解能力，并逐步替代旧的前端本地预演逻辑。

## 目录

```text
cutting-engine/
  Cargo.toml
  core/              # 纯 Rust 裁切计算核心
  wasm/              # wasm-bindgen 包装层
  frontend-adapter/  # 隔离的 TypeScript 调用适配器
```

## 当前接入链路

前端正式求解链路：

```text
src/features/raw-materials/batch-engine/hooks/use-batch-engine-solve.ts
  -> services/build-batch-engine-cutting-input.ts
  -> services/batch-engine-cutting-wasm.ts
  -> src/features/raw-materials/batch-engine/wasm/pkg/*
  -> cutting-engine/wasm
  -> cutting-engine/core
  -> services/map-cutting-engine-output-to-batch-solution.ts
```

`cutting-engine/core` 是算法核心；`cutting-engine/wasm` 只负责 JSON 入参/出参适配；`src/features/raw-materials/batch-engine/wasm/pkg` 是前端实际加载的构建产物。修改 Rust 核心后必须重新生成 `wasm/pkg`，否则页面仍会运行旧二进制。

当前实现状态、文件职责、数据链路和未完成能力见 [`IMPLEMENTATION-STATUS.md`](./IMPLEMENTATION-STATUS.md)。

## 当前算法边界

当前内核提供“单卷/多卷矩形贪心候选模式”，并保留严格无混排时的单需求行候选回退。组合模式按规则排序需求行，在每卷材料的宽度方向依次分配矩形 strip；单个需求行数量超过当前卷容量时会跨卷拆分，所有 Material zone 会携带 `rollId`、`unitId` 和 `allocatedPieces`，前端据此将产量准确归属到需求行和卷材。

当前已实际消费的能力：

- 材料利用率
- 排布稳定性
- 分切惩罚
- 刀缝
- 修边
- 最小支持长度
- 最大支持长度
- 固定决策长度
- mustFulfill 严格/软惩罚
- 角度混排与方向切换惩罚
- 候选方案按综合评分优先排序，再按 priority、利用率和 plan_id 做稳定兜底排序
- `allowMixedPlan=false`、`sameGroupOnly`、`sameDirectionRequired`、`strict-same-angle` 在组合时作为硬约束处理；不兼容需求行会保留在结果摘要中并生成 warning
- 单卷/多卷分配、跨卷拆分和每卷产量/利用率/损耗摘要
- `strictNoMix` 明确走逐需求行候选回退，不伪装成组合求解

当前明确尚未支持：

- 旋转排样、非矩形嵌套、全局最优搜索
- 跨工单混排、交期/订单顺序硬约束优化
- 完整的 `priority` 权重搜索、process tag 兼容矩阵和跨卷全局优化

`priority`、`orderSequence`、`rollGroupKey`、`processTags` 等字段会进入排序、硬约束或诊断链路，但不能被解释为已经完成了上述未支持的全局优化。

## 验证

```powershell
cargo test --manifest-path cutting-engine/Cargo.toml
```

重新生成前端 WASM 产物：

```powershell
Push-Location cutting-engine/wasm
wasm-pack build . --release --target web --out-dir ../../src/features/raw-materials/batch-engine/wasm/pkg --out-name xdfc_cutting_engine_wasm
Pop-Location
```

## 后续升级方向

后续算法升级应按阶段推进：

1. 继续补充多需求行、多卷拆分的测试样本，覆盖容量不足、约束跳过、各需求行/卷材 zone 归属和产量守恒。
2. 引入旋转/嵌套排样与可控的全局搜索预算，并明确输出算法边界。
3. 再完善跨工单混排、订单顺序硬约束和跨卷全局优化。
4. 最后将同一核心能力暴露给后端 Go handler，用于服务端批量求解和审计留痕。
