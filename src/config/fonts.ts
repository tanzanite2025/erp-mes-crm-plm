/**
 * 全局 UI 字体入口。
 *
 * 项目字体只保留一个可选项，避免不同页面各自切字体造成字号、字重和中英文字形割裂。
 * 真实字体文件与 Tailwind `font-*` 类的映射在 `src/styles/theme.css` 里维护。
 */
export const fonts = ['maple-ui'] as const
