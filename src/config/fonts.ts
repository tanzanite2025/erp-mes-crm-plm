/**
 * 全局 UI 字体入口。
 *
 * 项目字体只保留一个可选项，避免不同页面各自切字体造成字号、字重和中英文字形割裂。
 * 本地字体加载及统一样式在 `src/styles/local-maple-ui-font.css` 里维护，
 * Tailwind 字体类在 `src/styles/theme.css` 里映射，不设置其他字体或回退列表。
 */
export const fonts = ['maple-ui'] as const
