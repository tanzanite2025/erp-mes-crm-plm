import { useRef, useState } from 'react'
import {
  type ApplicationDialogRequest,
  resolveApplicationDialogRequest,
  useApplicationDialogRequestQueue,
} from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { useLanguage } from '@/context/language-provider'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function ApplicationConfirmPromptOrAlertDialog({
  request,
}: {
  request: ApplicationDialogRequest
}) {
  const { t } = useLanguage()
  const [inputValue, setInputValue] = useState(
    request.kind === 'prompt' ? request.defaultValue : ''
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const title = t(
    request.kind === 'alert'
      ? 'common.dialogs.alertTitle'
      : request.kind === 'prompt'
        ? 'common.dialogs.promptTitle'
        : 'common.dialogs.confirmTitle'
  )

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) resolveApplicationDialogRequest(request.id, null)
      }}
    >
      <AlertDialogContent
        className='z-[2000] rounded-[28px] sm:max-w-lg'
        overlayClassName='z-[1999]'
        onOpenAutoFocus={(event) => {
          if (request.kind !== 'prompt') return
          event.preventDefault()
          inputRef.current?.focus()
          inputRef.current?.select()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (request.returnFocusTo?.isConnected) request.returnFocusTo.focus()
        }}
      >
        <form
          className='min-w-0 space-y-6'
          onSubmit={(event) => {
            event.preventDefault()
            resolveApplicationDialogRequest(
              request.id,
              request.kind === 'prompt' ? inputValue : true
            )
          }}
        >
          <AlertDialogHeader className='text-start'>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className='[overflow-wrap:anywhere] whitespace-pre-wrap'>
              {request.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {request.kind === 'prompt' ? (
            <Input
              ref={inputRef}
              aria-label={request.message}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className='w-full min-w-0'
            />
          ) : null}
          <AlertDialogFooter>
            {request.kind !== 'alert' ? (
              <AlertDialogCancel type='button'>
                {t('common.actions.cancel')}
              </AlertDialogCancel>
            ) : null}
            <Button type='submit'>{t('common.actions.confirm')}</Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ApplicationConfirmPromptAndAlertDialogHost() {
  const request = useApplicationDialogRequestQueue((state) => state.requests[0])
  return request ? (
    <ApplicationConfirmPromptOrAlertDialog key={request.id} request={request} />
  ) : null
}
