import { Outlet, createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_authenticated/personal-workbench')({
  component: () => <Outlet />,
})
