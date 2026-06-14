import type { ElementType } from 'react'

type SidebarBrandProps = {
  team: {
    name: string
    logo: ElementType
    plan: string
  }
}

export function SidebarBrand({ team }: SidebarBrandProps) {
  return (
    // 根容器，保留足够的 Y 轴外边距 (my-2) 以确保空间感
    <div className='group/brand relative mx-1 my-2 flex min-h-[64px] items-center justify-center p-2 transition-all duration-300 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:w-14 group-data-[collapsible=icon]:p-0'>
      {/* === 纯正 3D 水滴流体渲染层 (保留用户认可的神级背景) === */}

      {/* 1. 上方包裹的巨型水滴：高度大幅压扁，向内收缩，留出顶部呼吸空间 */}
      <div
        className='pointer-events-none absolute top-1 left-[15%] z-0 h-9 w-14 bg-sky-400/20 backdrop-blur-md transition-all duration-[800ms] ease-out group-hover/brand:-translate-y-1 group-hover/brand:scale-110'
        style={{
          borderRadius: '45% 55% 40% 60% / 55% 45% 60% 40%',
          boxShadow:
            'inset 4px 4px 12px rgba(255,255,255,0.8), inset -4px -4px 12px rgba(2,132,199,0.3), 0 4px 12px rgba(2,132,199,0.1)',
        }}
      />

      {/* 2. 下方托底的宽扁水流：高度压扁，紧贴底部边缘，绝不向下挤占下方菜单 */}
      <div
        className='pointer-events-none absolute right-[8%] bottom-0 z-0 h-10 w-24 bg-blue-500/15 backdrop-blur-md transition-all duration-[800ms] ease-out group-hover/brand:-translate-x-1 group-hover/brand:translate-y-0.5 group-hover/brand:scale-110'
        style={{
          borderRadius: '60% 40% 70% 30% / 40% 60% 30% 70%',
          boxShadow:
            'inset 5px 5px 15px rgba(255,255,255,0.7), inset -5px -5px 15px rgba(37,99,235,0.35), 0 8px 24px rgba(37,99,235,0.15)',
        }}
      />

      {/* 3. 散落的独立晶莹水珠：全面向内收缩，确保不碰到上下边缘 */}
      <div className='pointer-events-none absolute top-1.5 right-[4%] z-0 size-2.5 rounded-full bg-sky-300/30 shadow-[inset_1px_1px_4px_rgba(255,255,255,0.9),inset_-1px_-1px_4px_rgba(2,132,199,0.4)] backdrop-blur-sm transition-transform duration-700 group-hover/brand:-translate-y-1' />
      <div className='pointer-events-none absolute bottom-1 left-[10%] z-0 size-3.5 rounded-full bg-blue-400/25 shadow-[inset_2px_2px_5px_rgba(255,255,255,0.8),inset_-2px_-2px_5px_rgba(37,99,235,0.4)] backdrop-blur-sm transition-transform duration-700 group-hover/brand:translate-y-0.5' />
      <div className='pointer-events-none absolute top-3.5 left-0.5 z-0 size-2 rounded-full bg-cyan-300/40 shadow-[inset_1px_1px_2px_rgba(255,255,255,0.9),inset_-1px_-1px_2px_rgba(6,182,212,0.4)] backdrop-blur-sm' />

      {/* === 主体文字容器：废除死白底色，采用纯透明无边框排版 === */}
      <div className='relative z-10 flex h-[46px] w-full items-center bg-transparent px-1 transition-all duration-300 group-data-[collapsible=icon]:justify-center'>
        {/* 折叠状态 */}
        <div className='hidden items-center justify-center text-[22px] font-black text-sidebar-foreground italic group-data-[collapsible=icon]:flex'>
          {team.name ? team.name.charAt(0).toUpperCase() : 'X'}
        </div>

        {/* 展开状态：恢复纯粹的上下两行排版 */}
        <div className='flex min-w-0 flex-1 flex-col justify-center group-data-[collapsible=icon]:hidden'>
          {/* 主标题：恢复至高无上的 font-black italic 粗斜体 */}
          <div className='truncate text-[18px] leading-none font-black tracking-tighter text-sidebar-foreground italic drop-shadow-sm'>
            {team.name}
          </div>
          {/* 副标题：恢复紧密相连的宽间距小字，摒弃搜索框式左右排版 */}
          <div className='mt-1.5 truncate text-[12px] leading-none font-semibold tracking-widest text-sidebar-foreground/60 uppercase'>
            {team.plan}
          </div>
        </div>
      </div>
    </div>
  )
}
