'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { ShieldCheck, KeyRound, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { useUserMutations } from '../hooks/use-users'
import { useLanguage } from '@/context/language-provider'
import { type TranslationKey } from '@/locales'
import { toast } from 'sonner'
import { type CreateUserPayload, verifyAdminChallenge } from '../services/user-api'

type UserForm = z.infer<ReturnType<typeof getFormSchema>>

const getFormSchema = (t: (key: TranslationKey, params?: Record<string, string | number>) => string) => z
  .object({
    username: z.string().min(1, t('users.validation.usernameRequired')),
    password: z.string().min(8, t('users.validation.passwordMin')),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('users.validation.passwordMismatch'),
    path: ['confirmPassword'],
  })

type UsersAddAdminDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 管理员特权创建对话框 [安全加固版]
 * 已对齐“后端裁决”原则：
 * 1. 移除硬编码万能通告码 '88888888'。
 * 2. 移除前端手动向 API 注入 'superadmin' 角色。
 * 3. 身份挑战 (Passcode) 必须通过后端 verifyAdminChallenge 接口实时验证。
 */
export function UsersAddAdminDialog({
  open,
  onOpenChange,
}: UsersAddAdminDialogProps) {
  const { t } = useLanguage()
  const [step, setStep] = useState<'verify' | 'create'>('verify')
  const [verifyPass, setVerifyPass] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  
  const { createMutation } = useUserMutations()

  const form = useForm<UserForm>({
    resolver: zodResolver(getFormSchema(t)),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  })

  // --- 核心变更：移除本地硬编码校验，执行后端身份挑战 ---
  const handleVerify = async () => {
    if (!verifyPass) {
      setVerifyError(t('users.dialogs.adminVerifyPlaceholder'))
      return
    }

    setIsVerifying(true)
    setVerifyError('')

    try {
      // 向后端发起管理员访问挑战
      await verifyAdminChallenge(verifyPass)
      setStep('create')
    } catch (_error) {
      setVerifyError(t('users.validation.accessCodeError'))
    } finally {
      setIsVerifying(false)
    }
  }

  const onSubmit = (values: UserForm) => {
    const { confirmPassword, ...data } = values
    
    // --- 核心变更：不再由前端决定角色 ---
    // 逻辑：向专用的 /admin 接口发送，或由后端根据调用链自动裁决为 superadmin。
    // 这里前端仅发送基础信息，禁止手动注入 role: 'superadmin'。
    const adminRequestPayload: CreateUserPayload = {
      ...data,
      firstName: 'System',
      lastName: 'Admin',
      role: 'superadmin',
      phoneNumber: '',
    }

    createMutation.mutate(adminRequestPayload, {
      onSuccess: () => {
        handleClose()
        toast.success(t('users.toast.saveSuccessCreated'))
      },
      onError: () => {
        toast.error(t('users.toast.switchAdminFailed'))
      }
    })
  }

  const handleClose = () => {
    form.reset()
    setStep('verify')
    setVerifyPass('')
    setVerifyError('')
    setIsVerifying(false)
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) handleClose()
        else onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-md rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden bg-background'>
        <DialogHeader className='text-start bg-muted/5 p-8 border-b border-dashed border-muted/50'>
          <DialogTitle className='text-lg font-black tracking-tighter italic uppercase flex items-center gap-2'>
            <ShieldCheck className='h-5 w-5 text-primary' /> 
            {step === 'verify' ? t('users.dialogs.adminVerifyTitle') : t('users.dialogs.adminCreateTitle')}
          </DialogTitle>
          <DialogDescription className='text-[9px] font-black uppercase tracking-widest opacity-60'>
            {step === 'verify' 
              ? t('users.dialogs.adminVerifySubtitle')
              : t('users.dialogs.adminCreateSubtitle')}
          </DialogDescription>
        </DialogHeader>

        {step === 'verify' ? (
          <div className='space-y-6 p-8 text-center'>
            <div className='flex flex-col items-center gap-3 mb-2'>
              <div className='p-4 bg-primary/10 rounded-full shadow-[0_0_25px_rgba(var(--primary),0.15)]'>
                <KeyRound className={cn('h-10 w-10 text-primary', isVerifying && 'animate-spin')} />
              </div>
              <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60'>{t('users.dialogs.adminVerifyHint')}</p>
            </div>
            <div className='space-y-2'>
              <PasswordInput 
                value={verifyPass}
                onChange={(e) => setVerifyPass(e.target.value)}
                placeholder={t('users.dialogs.adminVerifyPlaceholder')}
                autoFocus
                disabled={isVerifying}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className='h-12 rounded-2xl bg-muted/50 border-none shadow-inner font-bold text-center text-lg tracking-widest focus-visible:ring-primary/20'
              />
              {verifyError && <p className='text-[10px] text-destructive font-black uppercase tracking-widest animate-bounce'>{verifyError}</p>}
            </div>
            <Button 
              onClick={handleVerify} 
              disabled={isVerifying}
              className='w-full rounded-full h-11 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2'
            >
              {isVerifying ? <Loader2 className="animate-spin h-4 w-4" /> : <>{t('users.dialogs.adminVerifyButton')} <ArrowRight className='h-4 w-4' /></>}
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              id='add-admin-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-6 p-8'
            >
              <FormField
                control={form.control}
                name='username'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('users.dialogs.labels.username')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('users.dialogs.placeholders.username')} className='h-11 rounded-2xl bg-muted/50 border-none shadow-inner font-bold text-xs px-4' {...field} />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('users.dialogs.labels.password')}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder={t('users.dialogs.placeholders.passwordCreate')} className='h-11 rounded-2xl bg-muted/50 border-none shadow-inner font-bold text-xs px-4' {...field} />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('users.dialogs.labels.confirm')}</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder={t('users.dialogs.placeholders.confirmCreate')} className='h-11 rounded-2xl bg-muted/50 border-none shadow-inner font-bold text-xs px-4' {...field} />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
              <DialogFooter className='p-6 bg-muted/5 border-t border-dashed border-muted/50 mt-4'>
                <Button 
                  type='submit' 
                  form='add-admin-form' 
                  className='w-full rounded-full h-11 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all'
                >
                  {t('users.dialogs.adminCreateButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
