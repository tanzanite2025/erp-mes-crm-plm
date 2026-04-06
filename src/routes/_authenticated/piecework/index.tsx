import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/piecework/')({
    beforeLoad: () => {
        throw redirect({ to: '/piecework/query' })
    },
})
