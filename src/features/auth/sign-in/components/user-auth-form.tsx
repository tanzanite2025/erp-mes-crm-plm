import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { useLanguage } from '@/context/language-provider'
import {
  processAndNotifyPermissions,
  syncIdentitySnapshotFromProfile,
} from '@/features/authz/services/effective-permission-service'

const authDiagLogger = createLogger('UserAuthForm')

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

type LoginSuccessPayload = {
  accessToken: string
  user: {
    id: string
    employeeId?: string
    email?: string
    username: string
    permissions?: string[]
  }
}

type LoginErrorPayload = {
  error?: string
  code?: string
  retryAfterSeconds?: number
}

function safeJsonParse<T>(raw: string): T | null {
  if (!raw.trim()) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function getApiHost(apiBaseUrl: string): string {
  try {
    if (!apiBaseUrl) return window.location.hostname
    return new URL(apiBaseUrl).hostname
  } catch {
    return apiBaseUrl || 'unknown'
  }
}

function getNetworkSnapshot() {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string
      rtt?: number
      downlink?: number
      saveData?: boolean
    }
  }

  return {
    online: navigator.onLine,
    effectiveType: nav.connection?.effectiveType || 'unknown',
    rtt: nav.connection?.rtt ?? null,
    downlink: nav.connection?.downlink ?? null,
    saveData: nav.connection?.saveData ?? false,
    userAgent: navigator.userAgent,
  }
}

function logLoginDiagnostic(stage: string, detail: Record<string, unknown>) {
  const logMethod =
    stage.includes('FAILED') || stage.includes('ERROR')
      ? authDiagLogger.error.bind(authDiagLogger)
      : stage.includes('WARN') || stage.includes('LIMIT')
        ? authDiagLogger.warn.bind(authDiagLogger)
        : authDiagLogger.info.bind(authDiagLogger)

  logMethod(`[AUTH_DIAG] ${stage}`, detail)
}

async function notifyPermissionsFromLoginFallback(permissionIds?: string[]) {
  await processAndNotifyPermissions(permissionIds || [])
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const formSchema = useMemo(
    () =>
      z.object({
        email: z.string().min(1, t('common.auth.signInForm.validationAccountRequired')),
        password: z
          .string()
          .min(1, t('common.auth.signInForm.validationPasswordRequired'))
          .min(7, t('common.auth.signInForm.validationPasswordMin')),
      }),
    [t]
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
      const currentOrigin = window.location.origin
      const currentHost = window.location.hostname
      const apiHost = getApiHost(apiBaseUrl)
      const requestUrl = `${apiBaseUrl}/api/v1/auth/login`
      const startedAt = Date.now()
      const controller = new AbortController()
      const timeoutLimit = import.meta.env.DEV ? 120000 : 30000
      const timeoutId = setTimeout(() => controller.abort(), timeoutLimit)

      logLoginDiagnostic('LOGIN_ATTEMPT', {
        account: data.email,
        currentOrigin,
        currentHost,
        apiBaseUrl: apiBaseUrl || '(same-origin)',
        apiHost,
        timeoutMs: timeoutLimit,
        ...getNetworkSnapshot(),
      })

      try {
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: data.email, password: data.password }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const elapsedMs = Date.now() - startedAt
        const requestId = response.headers.get('X-Request-ID') || ''
        const retryAfterHeader = response.headers.get('Retry-After')
        const rawBody = await response.text()
        const parsedBody =
          safeJsonParse<LoginSuccessPayload & LoginErrorPayload>(rawBody) || ({} as LoginErrorPayload)

        if (response.status === 200) {
          const result = parsedBody as LoginSuccessPayload
          const { setUser, setAccessToken, setIsIdentitySynced } = useAuthStore.getState()

          setUser({
            id: result.user.id,
            accountNo: result.user.employeeId || result.user.id,
            employeeId: result.user.employeeId?.trim() || undefined,
            email: result.user.email || data.email,
            username: result.user.username,
            permissions: result.user.permissions || [],
            exp: Date.now() + 24 * 60 * 60 * 1000,
          }, 'login_success')
          setAccessToken(result.accessToken)
          setIsIdentitySynced(false)
          try {
            await syncIdentitySnapshotFromProfile()
          } catch (syncError) {
            authDiagLogger.warn('[AUTH_DIAG] PROFILE_SYNC_FALLBACK', syncError)
            await notifyPermissionsFromLoginFallback(result.user.permissions)
          }
          setIsLoading(false)

          logLoginDiagnostic('LOGIN_SUCCESS', {
            account: data.email,
            requestId,
            elapsedMs,
            currentOrigin,
            apiBaseUrl: apiBaseUrl || '(same-origin)',
          })

          import('@/features/system-mgmt/services/persistence-service').then(
            ({ PersistenceService }) => {
              void PersistenceService.initCloudSync().catch(() => undefined)
            }
          )

          navigate({ to: sanitizeRedirectTarget(redirectTo), replace: true })
          toast.success(t('common.auth.signInForm.success', { name: result.user.username }))
          return
        }

        setIsLoading(false)

        logLoginDiagnostic('LOGIN_RESPONSE_FAILED', {
          account: data.email,
          requestId,
          status: response.status,
          elapsedMs,
          retryAfterHeader,
          responseCode: parsedBody.code,
          responseError: parsedBody.error,
          currentOrigin,
          apiBaseUrl: apiBaseUrl || '(same-origin)',
          apiHost,
        })

        if (response.status === 401) {
          toast.error(t('common.auth.signInForm.invalidCredentials'))
        } else if (response.status === 404) {
          toast.error(t('common.auth.signInForm.apiNotReady'))
        } else if (response.status === 429) {
          const retryAfterSeconds =
            parsedBody.retryAfterSeconds ||
            (retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : 0) ||
            60

          toast.error(t('common.auth.signInForm.rateLimited'), {
            description: t('common.auth.signInForm.rateLimitedDescription', {
              seconds: retryAfterSeconds,
            }),
            duration: 8000,
          })
        } else {
          toast.error(t('common.auth.signInForm.serverError', { status: response.status }), {
            description: requestId
              ? t('common.auth.signInForm.serverErrorDescription', { requestId })
              : parsedBody.error,
            duration: 10000,
          })
        }
      } catch (apiErr) {
        clearTimeout(timeoutId)
        setIsLoading(false)

        const isUrlMismatch =
          (apiHost === 'localhost' || apiHost === '127.0.0.1') &&
          currentHost !== 'localhost' &&
          currentHost !== '127.0.0.1'

        logLoginDiagnostic('LOGIN_NETWORK_ERROR', {
          account: data.email,
          error: apiErr instanceof Error ? apiErr.message : String(apiErr),
          errorName: apiErr instanceof Error ? apiErr.name : typeof apiErr,
          currentOrigin,
          currentHost,
          apiBaseUrl: apiBaseUrl || '(same-origin)',
          apiHost,
          elapsedMs: Date.now() - startedAt,
          ...getNetworkSnapshot(),
        })

        if (!navigator.onLine) {
          toast.error(t('common.auth.signInForm.networkError', { error: 'offline' }), {
            description: t('common.auth.signInForm.offlineHint'),
            duration: 10000,
          })
        } else if (apiErr instanceof Error && apiErr.name === 'AbortError') {
          toast.error(t('common.auth.signInForm.timeout'), {
            description: t('common.auth.signInForm.timeoutHint'),
            duration: 10000,
          })
        } else if (isUrlMismatch) {
          toast.error(
            t('common.auth.signInForm.deployMismatch', {
              currentHost,
              apiHost,
            }),
            {
              description: t('common.auth.signInForm.deployMismatchHint'),
              duration: 10000,
            }
          )
        } else {
          toast.error(
            t('common.auth.signInForm.networkError', {
              error: apiErr instanceof Error ? apiErr.message : String(apiErr),
            }),
            {
              description: t('common.auth.signInForm.networkHint'),
              duration: 10000,
            }
          )
        }
      }
    } catch (error) {
      setIsLoading(false)

      logLoginDiagnostic('LOGIN_CRITICAL_ERROR', {
        error: error instanceof Error ? error.message : String(error),
      })

      toast.error(
        t('common.auth.signInForm.criticalError', {
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[10px] font-black uppercase tracking-widest text-slate-500'>
                {t('common.auth.signInForm.account')}
              </FormLabel>
              <FormControl>
                <Input
                  className='h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] transition-colors placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-slate-900/10'
                  placeholder={t('common.auth.signInForm.accountPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center justify-between gap-3'>
                <FormLabel className='text-[10px] font-black uppercase tracking-widest text-slate-500'>
                  {t('common.auth.signInForm.password')}
                </FormLabel>
                <Link
                  to='/forgot-password'
                  className='shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900'
                >
                  {t('common.auth.signInForm.forgotPassword')}
                </Link>
              </div>
              <FormControl>
                <PasswordInput
                  className='h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] transition-colors placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-slate-900/10'
                  placeholder={t('common.auth.signInForm.passwordPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className='mt-6 h-12 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 gap-2'
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className='animate-spin size-4' /> : <LogIn className='size-4' />}
          {t('common.auth.signInForm.submit')}
        </Button>
      </form>
    </Form>
  )
}

function sanitizeRedirectTarget(redirectTo?: string): string {
  const fallback = '/'
  const trimmed = redirectTo?.trim()
  if (!trimmed) return fallback

  try {
    const url = new URL(trimmed, window.location.origin)
    if (url.origin !== window.location.origin) return fallback
    if (url.pathname === '/403') return fallback

    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return trimmed === '/403' ? fallback : trimmed
  }
}
