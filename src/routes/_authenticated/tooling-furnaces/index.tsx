import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/tooling-furnaces/')({
  beforeLoad: () => {
    throw redirect({
      to: '/tooling-furnaces/center',
      replace: true,
    })
  },
})
