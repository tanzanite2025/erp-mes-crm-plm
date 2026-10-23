import { create } from 'zustand'

type ApplicationDialogRequestBase = {
  id: number
  message: string
  returnFocusTo: HTMLElement | null
}

export type ApplicationDialogRequest = ApplicationDialogRequestBase &
  (
    | { kind: 'confirm'; resolve: (confirmed: boolean) => void }
    | {
        kind: 'prompt'
        defaultValue: string
        resolve: (value: string | null) => void
      }
    | { kind: 'alert'; resolve: () => void }
  )

export const useApplicationDialogRequestQueue = create<{
  requests: ApplicationDialogRequest[]
}>(() => ({ requests: [] }))

let nextApplicationDialogRequestId = 0

function createApplicationDialogRequestBase(message: string) {
  return {
    id: ++nextApplicationDialogRequestId,
    message,
    returnFocusTo:
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
  }
}

function enqueueApplicationDialogRequest(request: ApplicationDialogRequest) {
  useApplicationDialogRequestQueue.setState((state) => ({
    requests: [...state.requests, request],
  }))
}

export function requestApplicationConfirmation(
  message: string
): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    enqueueApplicationDialogRequest({
      ...createApplicationDialogRequestBase(message),
      kind: 'confirm',
      resolve,
    })
  })
}

export function requestApplicationTextInput(
  message: string,
  defaultValue = ''
): Promise<string | null> {
  if (typeof document === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    enqueueApplicationDialogRequest({
      ...createApplicationDialogRequestBase(message),
      kind: 'prompt',
      defaultValue,
      resolve,
    })
  })
}

export function showApplicationAlert(message: string): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    enqueueApplicationDialogRequest({
      ...createApplicationDialogRequestBase(message),
      kind: 'alert',
      resolve,
    })
  })
}

export function resolveApplicationDialogRequest(
  requestId: number,
  result: boolean | string | null
) {
  const { requests } = useApplicationDialogRequestQueue.getState()
  const request = requests[0]
  if (!request || request.id !== requestId) return

  useApplicationDialogRequestQueue.setState({ requests: requests.slice(1) })
  if (request.kind === 'confirm') request.resolve(result === true)
  else if (request.kind === 'prompt') {
    request.resolve(typeof result === 'string' ? result : null)
  } else request.resolve()
}
