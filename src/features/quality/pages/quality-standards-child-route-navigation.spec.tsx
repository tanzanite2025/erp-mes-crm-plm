// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type NavigateOptions,
} from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/quality/standards'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./standards-index-page', () => ({
  StandardsIndexPage: ({
    search,
    navigate,
  }: {
    search: { keyword?: string }
    navigate: (options: NavigateOptions) => void
  }) => (
    <div>
      <h1>Quality standards list</h1>
      <p>{search.keyword}</p>
      <button
        onClick={() =>
          navigate({
            to: '/quality/standards/$standardId/edit',
            params: { standardId: 'controlled-protocol' },
          })
        }
      >
        Edit controlled protocol
      </button>
      <button
        onClick={() =>
          navigate({
            to: '/quality/standards/$standardId/preview',
            params: { standardId: 'controlled-protocol' },
          })
        }
      >
        Preview controlled protocol
      </button>
    </div>
  ),
}))

async function renderQualityStandardsRouteAtUrl(initialUrl: string) {
  const rootRoute = createRootRoute()
  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_authenticated',
  })
  const standardsRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: 'quality/standards',
    validateSearch: Route.options.validateSearch,
    component: Route.options.component,
  })
  const childRoutes = [
    createRoute({
      getParentRoute: () => standardsRoute,
      path: '$standardId/edit',
      component: () => <h1>Edit quality standard</h1>,
    }),
    createRoute({
      getParentRoute: () => standardsRoute,
      path: '$standardId/preview',
      component: () => <h1>Preview quality standard</h1>,
    }),
    createRoute({
      getParentRoute: () => standardsRoute,
      path: 'new',
      component: () => <h1>Create quality standard</h1>,
    }),
  ]
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      authenticatedRoute.addChildren([standardsRoute.addChildren(childRoutes)]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
    defaultPendingMinMs: 0,
    defaultHashScrollIntoView: false,
  })

  await router.load()
  render(<RouterProvider router={router} />)
  return router
}

describe('quality standards child route navigation', () => {
  afterEach(cleanup)

  it.each([
    ['controlled-protocol/edit', 'Edit quality standard'],
    ['controlled-protocol/preview', 'Preview quality standard'],
    ['new', 'Create quality standard'],
  ])('renders the child page when opening %s directly', async (path, title) => {
    await renderQualityStandardsRouteAtUrl(`/quality/standards/${path}`)

    expect(await screen.findByRole('heading', { name: title })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Quality standards list' })
    ).not.toBeInTheDocument()
  })

  it.each([
    ['Edit controlled protocol', 'Edit quality standard'],
    ['Preview controlled protocol', 'Preview quality standard'],
  ])(
    'opens the child page after clicking %s and can return to the filtered list',
    async (button, title) => {
      const router = await renderQualityStandardsRouteAtUrl(
        '/quality/standards?keyword=R50&type=IQC&page=2'
      )

      expect(await screen.findByText('R50')).toBeVisible()
      fireEvent.click(screen.getByRole('button', { name: button }))

      expect(await screen.findByRole('heading', { name: title })).toBeVisible()
      expect(
        screen.queryByRole('heading', { name: 'Quality standards list' })
      ).not.toBeInTheDocument()

      await act(async () => {
        await router.navigate({
          to: '/quality/standards',
          search: { keyword: 'R50', type: 'IQC', page: 2 },
        })
      })

      expect(
        await screen.findByRole('heading', { name: 'Quality standards list' })
      ).toBeVisible()
      expect(screen.getByText('R50')).toBeVisible()
      expect(router.state.location.search).toMatchObject({
        keyword: 'R50',
        type: 'IQC',
        page: 2,
      })
      expect(
        screen.queryByRole('heading', { name: title })
      ).not.toBeInTheDocument()
    }
  )
})
