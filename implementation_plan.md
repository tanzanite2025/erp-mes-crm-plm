# implementation plan

## 本轮 `pnpm build` 多点报错的共享根因分析（2026-04-07，待确认）

### 一、当前判断
本轮 `pnpm build` 新暴露的报错，并非完全随机的单点故障，而是两类因素叠加后的结果：

1. **历史欠账集中显形**
   - 根目录日常检查与 `tsc -b` / `pnpm build` 口径不一致；
   - 多轮迭代中未被完全覆盖的边界问题，在真实 build 模式下被统一展开。

2. **共享架构边界缺口持续外溢**
   - 当前错误虽然分布在 `basic-settings`、`engineering`、表单组件与样例常量中，但可归并为少数几类共享根因，而不是彼此无关的巧合。

### 二、三类主根因

#### 根因 A：schema 演进后，消费层缺少单一事实来源
表现为：
- schema 已新增/正式化 `version`；
- 默认值工厂、页面初始化对象、样例常量、局部 normalize 逻辑仍各自手写；
- 最终出现：
  - `version` 缺失
  - `_v` 残留
  - 推断过窄/`never`

这说明当前问题并不只是字段没补，而是**schema -> default builder -> sample data -> page state** 没有形成单向 authoritative 链路。

#### 根因 B：`react-hook-form + zodResolver + 子组件 form props` 缺少统一 contract 策略
表现为：
- 父组件使用完整领域模型创建 `form`；
- 子组件自行声明更窄的 `UseFormReturn<X>`；
- 局部还存在 `zodResolver(...) as any` 之类历史写法；
- 一旦切到 `tsc -b`，就集中暴露为：
  - `UseFormReturn` 不兼容
  - `watch/control/handleSubmit` 泛型错位

这说明当前真正问题不是单个表单字段，而是**表单体系没有统一的泛型收口规则**。

#### 根因 C：第三方库边界未封装，业务层直接写 vendor options
表现为：
- 业务组件直接面向第三方 `RenderOptions` 写配置；
- 实际使用的是经验字段，而不是当前正式类型支持字段；
- 最终在严格 build 下暴露为 vendor type mismatch。

这说明项目对第三方库缺少本地 adapter / wrapper，导致“运行经验写法”与“正式类型 contract”脱节。

### 三、哪些是症状，不是根因
以下现象应视为表层症状，而非最终根因：

- `version` 缺失
- `_v` 残留
- `never` 推断
- `UseFormReturn<大对象>` 不能传给 `UseFormReturn<小对象>`
- 第三方 options 上个别字段不存在

这些错误会不断换文件出现，但如果不先收口上游模式，修一处还会在别处继续冒出。

### 四、后续修复顺序建议

#### Phase A：schema consumer 收口
目标：
- 默认值工厂
- 样例常量
- 页面初始化对象

原则：
- 尽量从统一 builder / draft factory 出发；
- 不再让核心字段在多个页面裸写。

#### Phase B：form contract 收口
目标：
- 为 `useForm`、`zodResolver`、子组件 `form` props 建立统一泛型策略；
- 子组件尽量依赖字段级 contract，而不是自行声明更窄 `UseFormReturn<X>`。

#### Phase C：vendor adapter 收口
目标：
- 第三方 options 不直接散落在业务组件中；
- 通过本地 wrapper 或正式配置帮助函数固化合法字段。

### 五、明确不做事项
- 不把当前所有 build 报错当作随机孤立 bug 逐条补丁式修复；
- 不在未归类根因前继续扩散到全仓库重构；
- 不以 `as any`、`as unknown as` 继续压制表单或第三方类型边界；
- 不把本轮分析误扩成全项目架构重写。

## `engineering` 域 `version/_v` 契约漂移修复方案（2026-04-07，已确认）

### 一、当前结论
`pnpm build` 已确认不再停在 `mold-loan-action-dialog.tsx`，新的真实阻塞已经转移到 `src/features/engineering` 域。


1. `engineering` 相关 schema 已将 `version` 作为正式字段；
2. 页面初始化对象、样例数据与编辑默认值仍存在：
   - 缺失 `version`
   - 残留旧 `_v`

这说明当前问题不是单个页面拼写错误，而是 `engineering` 域在 `version` 契约统一后仍未完成消费层同步收口。

### 二、本轮目标
本轮只处理 `engineering` 域当前 `pnpm build` 暴露的真实阻塞：

1. 为缺失 `version` 的初始化对象与样例数据补齐正式字段；
2. 清退 `change-orders.tsx` 中残留的 `_v` 旧字段；
3. 保持 `engineering` 当前业务语义不变；
4. 以 `pnpm build` 作为最终验收标准。

### 三、实施顺序

#### Phase A：补齐缺失 `version` 的初始化对象/样例数据
涉及重点：
- `src/features/engineering/components/product/product-routing-view.tsx`
- `src/features/engineering/tabs/template-mgmt.tsx`

处理原则：
- 不新增兼容壳；
- 直接对齐正式 schema 要求；
- 保持默认对象现有业务语义不变，仅补齐正式字段。

#### Phase B：清退 `_v` 旧字段
涉及重点：
- `src/features/engineering/tabs/change-orders.tsx`

处理原则：
- 统一改回 `version`；
- 不保留 `_v` / `version` 双轨长期兼容；
- 保持原有创建/编辑流程不变。

### 四、关键风险
1. 若默认对象 `version` 补值位置不一致，可能导致局部编辑/新建初始值语义漂移。
2. 若 `_v` 直接替换为 `version` 时遗漏旧读取点，可能继续触发构建错误。
3. 本轮只处理 build 当前真实阻塞，不扩散为 `engineering` 全域重构。

### 五、验证要求
本轮至少执行：

```bash
pnpm build
```

必要时补充：

```bash
pnpm exec eslint src/features/engineering/components/product/product-routing-view.tsx src/features/engineering/tabs/template-mgmt.tsx src/features/engineering/tabs/change-orders.tsx
```

### 六、明确不做事项
- 不将本轮扩展成 `engineering` 域全量重构；
- 不重新引入 `_v` 兼容字段；
- 不因为 schema 要求而改动页面业务流程与默认交互语义。
