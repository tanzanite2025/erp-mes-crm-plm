import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/message-center/')({
  beforeLoad: () => {
    throw redirect({
      to: '/message-center/rules',
      replace: true,
    })
  },
})
