import { describe, expect, it } from 'vitest'

import { deserializeLedgerSearchResponseApiDTO } from './ledger-search-api-dto'

const payload = {
  items: [
    {
      id: 'ledger-1',
      documentNo: 'AR-001',
      partnerName: 'Acme Customer',
      outstandingAmount: 120,
      status: 'OPEN',
      currency: 'CNY',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
}

describe('ledger search api dto', () => {
  it('accepts the locked ledger search response shape', () => {
    expect(deserializeLedgerSearchResponseApiDTO(payload)).toEqual(payload)
  })

  it('rejects array payloads instead of treating them as ledger search pages', () => {
    expect(() => deserializeLedgerSearchResponseApiDTO(payload.items)).toThrow()
  })

  it('requires pagination metadata', () => {
    const { total: _total, ...withoutTotal } = payload

    expect(() => deserializeLedgerSearchResponseApiDTO(withoutTotal)).toThrow()
  })

  it('requires every search candidate field', () => {
    expect(() =>
      deserializeLedgerSearchResponseApiDTO({
        ...payload,
        items: [
          {
            id: 'ledger-1',
            documentNo: 'AR-001',
            partnerName: 'Acme Customer',
            outstandingAmount: 120,
            status: 'OPEN',
          },
        ],
      })
    ).toThrow()
  })

  it('rejects extra response and candidate fields so the protocol does not drift silently', () => {
    expect(() =>
      deserializeLedgerSearchResponseApiDTO({
        ...payload,
        debug: true,
      })
    ).toThrow()

    expect(() =>
      deserializeLedgerSearchResponseApiDTO({
        ...payload,
        items: [
          {
            ...payload.items[0],
            sourceType: 'SALES_ORDER',
          },
        ],
      })
    ).toThrow()
  })
})
