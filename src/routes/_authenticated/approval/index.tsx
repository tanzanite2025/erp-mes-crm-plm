import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

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
