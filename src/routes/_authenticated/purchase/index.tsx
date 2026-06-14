import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/purchase/')({
  component: PurchaseIndexRedirect,
})

function PurchaseIndexRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate({
      to: '/purchase/suppliers',
      search: { search: '', detailId: '' },
      replace: true,
    })
  }, [navigate])
  return null
}
