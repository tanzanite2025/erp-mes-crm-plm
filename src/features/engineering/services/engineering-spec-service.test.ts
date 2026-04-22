import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { engineeringSpecService } from './engineering-spec-service'

const engineeringSpec = {
  id: 'spec-1',
  name: 'Drilling plan 1',
  code: 'DRILL-001',
  type: 'DRILLING_PLAN',
  active: true,
  drillingData: {
    name: 'Drilling plan 1',
  },
  _v: 1,
}

const weavingModeSpecWithNullBuckets = {
  id: 'spec-2',
  name: '2x2 Weaving',
  code: 'WEAVE-2X2',
  type: 'WEAVING_MODE',
  active: true,
  specData: {
    code: 'WEAVE-2X2',
    label: '2x2 Weaving',
  },
  drillingData: null,
  labelingData: null,
  spokeLengthData: null,
  hubData: null,
  nippleData: null,
  _v: 1,
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('engineeringSpecService.getSpecs', () => {
  it('loads complete option data for a typed engineering spec source', async () => {
    apiFetchMock.mockResolvedValue([engineeringSpec])

    const result = await engineeringSpecService.getSpecs('DRILLING_PLAN')

    expect(apiFetchMock).toHaveBeenCalledWith('/engineering/specs?options=true&type=DRILLING_PLAN')
    expect(result).toEqual([engineeringSpec])
  })

  it('accepts the paginated list response returned by the management endpoint', async () => {
    apiFetchMock.mockResolvedValue({
      items: [engineeringSpec],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const result = await engineeringSpecService.getSpecs()

    expect(apiFetchMock).toHaveBeenCalledWith('/engineering/specs?options=true')
    expect(result).toEqual([engineeringSpec])
  })

  it('normalizes null buckets returned by the list endpoint', async () => {
    apiFetchMock.mockResolvedValue([weavingModeSpecWithNullBuckets])

    const result = await engineeringSpecService.getSpecs('WEAVING_MODE')

    expect(result).toEqual([
      {
        id: 'spec-2',
        name: '2x2 Weaving',
        code: 'WEAVE-2X2',
        type: 'WEAVING_MODE',
        active: true,
        specData: {
          code: 'WEAVE-2X2',
          label: '2x2 Weaving',
        },
        _v: 1,
      },
    ])
  })
})

describe('engineeringSpecService.saveSpec', () => {
  it('accepts null buckets from the save response and normalizes them away', async () => {
    apiFetchMock.mockResolvedValue(weavingModeSpecWithNullBuckets)

    const result = await engineeringSpecService.saveSpec({
      name: '2x2 Weaving',
      code: 'WEAVE-2X2',
      type: 'WEAVING_MODE',
      active: true,
      specData: {
        code: 'WEAVE-2X2',
        label: '2x2 Weaving',
      },
      _v: 1,
    })

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = apiFetchMock.mock.calls[0]
    expect(url).toBe('/engineering/specs')
    expect(options).toMatchObject({
      method: 'POST',
    })
    expect(JSON.parse(options.body as string)).toMatchObject({
      name: '2x2 Weaving',
      code: 'WEAVE-2X2',
      type: 'WEAVING_MODE',
      active: true,
      specData: {
        code: 'WEAVE-2X2',
        label: '2x2 Weaving',
      },
      _v: 1,
    })

    expect(result).toEqual({
      id: 'spec-2',
      name: '2x2 Weaving',
      code: 'WEAVE-2X2',
      type: 'WEAVING_MODE',
      active: true,
      specData: {
        code: 'WEAVE-2X2',
        label: '2x2 Weaving',
      },
      _v: 1,
    })
  })
})
