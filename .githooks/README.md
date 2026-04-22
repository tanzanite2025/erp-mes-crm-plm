# Git Hooks

这个目录存放仓库本地 git hook，以及它们复用的 helper。

## 当前文件

- `pre-commit`
  - 提交前执行的入口脚本
  - 只负责声明“要跑什么校验”
- `hook-helpers.sh`
  - hook 里复用的公共函数
  - 负责 `pnpm` 调用和 staged-only 条件触发

## 设计原则

- `pre-commit` 尽量保持薄，避免把复杂 shell 逻辑都堆在入口文件里
- 全量校验优先放 CI
- 本地 hook 优先做 staged-only 的轻量前置拦截
- 只有在 staged 文件真正命中相关范围时，才运行对应校验，避免普通提交被整仓扫描拖慢

## 复用方式

当前推荐通过 `hook-helpers.sh` 里的 `run_pnpm_script_if_staged_matches` 来新增 staged-only 校验。

参数顺序：

1. 日志文案
2. `package.json` 里的 script 名
3. staged 文件命中规则（grep regex）
4. 跳过时的提示文案

示例：

```sh
run_pnpm_script_if_staged_matches \
  "verify i18n parity" \
  "verify:i18n" \
  '^src/locales/|^scripts/verify-i18n-parity\.mjs$|^scripts/i18n-parity-baseline\.json$' \
  "i18n parity (no staged locale changes)"
```

## 什么时候适合接入 staged-only

适合：

- 只对某一类文件生效的校验
- 全量跑比较慢，但按改动范围缩小后很轻的校验
- 对开发体验影响明显、但又需要高频保护的规则

不适合：

- 必须看全仓上下文才能得出可靠结论的校验
- 很难通过路径规则准确缩小范围的校验
- 本地误跳过风险高于节省时间收益的校验

## 当前已接入

- `verify:i18n`
- `verify:zh-cn-encoding`

CI 仍会运行更完整的校验链路，所以本地 hook 的目标是尽早提醒，而不是替代远端兜底。
