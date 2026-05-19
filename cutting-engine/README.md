# Cutting Engine

独立的新裁切计算引擎工作区，用于替代旧 `raw_material_batch_optimizer` 初代引擎。

## 目录

```text
cutting-engine/
  Cargo.toml
  core/              # 纯 Rust 裁切计算核心
  wasm/              # wasm-bindgen 包装层
  frontend-adapter/  # 隔离的 TypeScript 调用适配器
```

## 第一版领域边界

新内核只处理裁切几何规则：

- 材料利用率
- 排布稳定性
- 分切惩罚
- 刀缝
- 修边
- 最小支持长度
- 最大支持长度
- 固定决策长度

第一版不引入交期、订单满足、mustFulfill、orderSequence、跨工单混排等订单/排程语义。

## 验证

```powershell
cargo test --manifest-path cutting-engine/Cargo.toml
```

## 替换策略

当前工作区独立存在，不直接接入现有 `src` 或 `server`。后续验证通过后，再让 `/raw-materials/batch-engine` 或后端 Go handler 通过明确 adapter 调用新内核。
