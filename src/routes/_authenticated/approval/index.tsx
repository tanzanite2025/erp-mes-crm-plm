import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/approval/')({
  component: RedirectToRequests,
})

function RedirectToRequests() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/approval/requests', replace: true })
  }, [navigate])

  return null
}
