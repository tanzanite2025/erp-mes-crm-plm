import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authenticated/purchase/')({
  component: () => {
    const navigate = useNavigate()
    useEffect(() => {
      navigate({ 
        to: '/purchase/suppliers', 
        search: { search: '', detailId: '' },
        replace: true 
      })
    }, [navigate])
    return null
  },
})
