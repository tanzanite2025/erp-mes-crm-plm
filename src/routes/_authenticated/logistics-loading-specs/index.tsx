import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/logistics-loading-specs/'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/logistics-loading-specs/vehicle-specs-library',
    })
  },
})
