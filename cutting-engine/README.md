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

## 当前算法边界

当前内核处理单需求行候选方案的几何容量和综合评分：

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
- 候选方案按综合评分优先排序，再按利用率和 plan_id 做稳定兜底排序

当前内核尚未真正执行多需求行组合排样、多卷分配、跨工单混排、交期/订单顺序硬约束。`priority` 目前只在综合评分相同时作为稳定排序依据；`orderSequence`、`rollGroupKey`、`processTags` 等字段会进入诊断和解释性链路，但完整组合求解需要在后续版本升级输出协议和测试样本后再接入。

## 验证

```powershell
cargo test --manifest-path cutting-engine/Cargo.toml
```

重新生成前端 WASM 产物：

```powershell
wasm-pack build cutting-engine/wasm --target web --out-dir ../../src/features/raw-materials/batch-engine/wasm/pkg
```

## 后续升级方向

后续算法升级应按阶段推进：

1. 先补测试样本和输出协议，区分“单个物料区域”“单片 piece”“聚合 strip”。
2. 再做同卷多需求行组合排样，明确 sameGroupOnly / strictNoMix 的硬约束。
3. 再做多卷分配、订单顺序、优先级权重、mustFulfill 全局满足率。
4. 最后考虑将同一核心能力暴露给后端 Go handler，用于服务端批量求解和审计留痕。
