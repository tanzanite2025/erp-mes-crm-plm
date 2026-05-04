import { useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'
import { useLanguage } from '@/context/language-provider'

export function SignIn() {
  const { t } = useLanguage()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      {/* 🚀 主容器：40px 物理极限圆角 + 大面积磨砂玻璃 */}
      <div className='relative flex w-full flex-col lg:flex-row shadow-2xl rounded-[40px] overflow-hidden bg-card/70 backdrop-blur-2xl border border-border/40 min-h-[600px]'>
        
        {/* 🌗 左翼：纯净功能区 (45%) */}
        <div className='relative w-full lg:w-[45%] p-10 lg:p-12 flex flex-col justify-between items-center bg-card/30'>
          {/* 🔮 移动端专属装饰：流光顶栏 */}
          <div className='lg:hidden absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30' />
          
          <div className='w-full'>
            {/* 🏷️ 品牌与标题组 */}
            <div className='mb-10 flex flex-col'>
              <div className='inline-flex items-center gap-2 mb-4'>
                <div className='size-2 rounded-full bg-primary animate-pulse' />
                <span className='text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60'>
                   {t('common.auth.layout.connectivity')}
                </span>
              </div>
              <h1 className='text-3xl font-black italic tracking-tighter uppercase text-foreground'>
                {t('common.auth.layout.title')}
              </h1>
              <p className='mt-1 text-[11px] font-black uppercase leading-none tracking-[0.2em] text-muted-foreground/60'>
                {t('common.auth.layout.title', { locale: 'en-US' }) === '数字化管理系统' ? 'Digital Management System' : t('common.auth.layout.title')}
              </p>
            </div>

            <UserAuthForm redirectTo={redirect} className='w-full' />
          </div>

          {/* 🔗 底部页脚 */}
          <div className='mt-12 w-full'>
            <p className='text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('common.auth.layout.description')}
            </p>
          </div>
        </div>

        {/* 🌘 右翼：3D 沉浸视觉区 (55%) */}
        <div className='hidden lg:flex w-[55%] relative overflow-hidden bg-background'>
          {/* 🔮 底色渐变与网格纹理 (防止图片不显示时的突兀感) */}
          <div className='absolute inset-0 z-0 bg-gradient-to-br from-primary/40 via-background to-black' />
          <div className='absolute inset-0 z-0 opacity-20' 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          
          {/* 🔮 渐变遮罩层：增加景深 */}
          <div className='absolute inset-0 z-10 bg-gradient-to-br from-primary/20 via-transparent to-slate-950/60 mix-blend-multiply opacity-80' />
          
          {/* 🖼️ 英雄插画 (请手动将图片拷贝至 public/login-hero.png) */}
          <div className='absolute inset-0 z-0 bg-cover bg-center transition-transform hover:scale-110 duration-[20s]'
               style={{ backgroundImage: `url('/login-hero.png')` }}>
          </div>

          <div className='relative z-20 mt-auto p-12 text-white'>
            <div className='max-w-xs space-y-2 translate-y-4 animate-in slide-in-from-bottom duration-1000'>
              <h2 className='text-2xl font-black italic uppercase tracking-tighter'>{t('common.auth.layout.smartFactory')}</h2>
              <p className='text-[10px] font-medium leading-relaxed opacity-60 uppercase tracking-widest'>
                {t('common.auth.layout.factoryDesc')}
              </p>
            </div>
          </div>

          {/* 装饰物：浮动网格或光晕 */}
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50' />
        </div>

      </div>
    </AuthLayout>
  )
}
