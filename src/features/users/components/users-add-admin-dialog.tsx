'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type TranslationKey } from '@/locales'
import { ShieldCheck, KeyRound, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
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
import {
  type CreateUserPayload,
  verifyAdminChallenge,
} from '../services/user-api'

type UserForm = z.infer<ReturnType<typeof getFormSchema>>

const getFormSchema = (
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) =>
  z
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
 * Protected account creation dialog.
 * The frontend sends only account fields; backend challenge verification owns access decisions.
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

  // --- 鏍稿績鍙樻洿锛氱Щ闄ゆ湰鍦扮‖缂栫爜鏍￠獙锛屾墽琛屽悗绔韩浠芥寫鎴?---
  const handleVerify = async () => {
    if (!verifyPass) {
      setVerifyError(t('users.dialogs.accessVerifyPlaceholder'))
      return
    }

    setIsVerifying(true)
    setVerifyError('')

    try {
      // 鍚戝悗绔彂璧风鐞嗗憳璁块棶鎸戞垬
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

    // The frontend does not inject any legacy identity marker into this request.
    const adminRequestPayload: CreateUserPayload = {
      ...data,
      firstName: 'System',
      lastName: 'Admin',
      phoneNumber: '',
      status: 'active',
      role: 'admin',
      adminChallenge: verifyPass,
    }

    createMutation.mutate(adminRequestPayload, {
      onSuccess: () => {
        handleClose()
        toast.success(t('users.toast.saveSuccessCreated'))
      },
      onError: () => {
        toast.error(t('users.toast.protectedAccountActionFailed'))
      },
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
      <DialogContent className='gap-0 overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-md'>
        <DialogHeader className='border-b border-dashed border-muted/50 bg-muted/5 p-8 text-start'>
          <DialogTitle className='flex items-center gap-2 text-lg font-black tracking-tighter uppercase italic'>
            <ShieldCheck className='h-5 w-5 text-primary' />
            {step === 'verify'
              ? t('users.dialogs.accessVerifyTitle')
              : t('users.dialogs.protectedAccountCreateTitle')}
          </DialogTitle>
          <DialogDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {step === 'verify'
              ? t('users.dialogs.accessVerifySubtitle')
              : t('users.dialogs.protectedAccountCreateSubtitle')}
          </DialogDescription>
        </DialogHeader>

        {step === 'verify' ? (
          <div className='space-y-6 p-8 text-center'>
            <div className='mb-2 flex flex-col items-center gap-3'>
              <div className='rounded-full bg-primary/10 p-4 shadow-[0_0_25px_rgba(var(--primary),0.15)]'>
                <KeyRound
                  className={cn(
                    'h-10 w-10 text-primary',
                    isVerifying && 'animate-spin'
                  )}
                />
              </div>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
                {t('users.dialogs.accessVerifyHint')}
              </p>
            </div>
            <div className='space-y-2'>
              <PasswordInput
                value={verifyPass}
                onChange={(e) => setVerifyPass(e.target.value)}
                placeholder={t('users.dialogs.accessVerifyPlaceholder')}
                autoFocus
                disabled={isVerifying}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className='h-12 rounded-2xl border-none bg-muted/50 text-center text-lg font-bold tracking-widest shadow-inner focus-visible:ring-primary/20'
              />
              {verifyError && (
                <p className='animate-bounce text-[10px] font-black tracking-widest text-destructive uppercase'>
                  {verifyError}
                </p>
              )}
            </div>
            <Button
              onClick={handleVerify}
              disabled={isVerifying}
              className='flex h-11 w-full items-center justify-center gap-2 rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95'
            >
              {isVerifying ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <>
                  {t('users.dialogs.accessVerifyButton')}{' '}
                  <ArrowRight className='h-4 w-4' />
                </>
              )}
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
                    <FormLabel className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {t('users.dialogs.labels.username')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('users.dialogs.placeholders.username')}
                        className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner'
                        {...field}
                      />
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
                    <FormLabel className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {t('users.dialogs.labels.password')}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t(
                          'users.dialogs.placeholders.passwordCreate'
                        )}
                        className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner'
                        {...field}
                      />
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
                    <FormLabel className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {t('users.dialogs.labels.confirm')}
                    </FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t(
                          'users.dialogs.placeholders.confirmCreate'
                        )}
                        className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-[10px] font-bold' />
                  </FormItem>
                )}
              />
              <DialogFooter className='mt-4 border-t border-dashed border-muted/50 bg-muted/5 p-6'>
                <Button
                  type='submit'
                  form='add-admin-form'
                  className='h-11 w-full rounded-full text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95'
                >
                  {t('users.dialogs.protectedAccountCreateButton')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
