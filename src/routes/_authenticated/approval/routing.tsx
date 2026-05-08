import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/approval/routing')({
  beforeLoad: () => {
    throw redirect({
      to: '/message-center/rules',
      replace: true,
    })
  },
})
