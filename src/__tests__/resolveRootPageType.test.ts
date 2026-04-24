import { beforeEach, describe, expect, test, vi } from 'vitest'

import { resolveRootPageType } from '../resolveRootPageType.js'

describe('resolveRootPageType', () => {
  // Mock req object for tests
  const mockReq = {
    payload: {
      findByID: vi.fn()
    }
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns pageType of root when page is root', async () => {
    mockReq.payload.findByID.mockResolvedValue({
      id: 'root-1',
      pageType: 'services',
      parent: null
    })

    const result = await resolveRootPageType({
      id: 'root-1',
      collectionSlug: 'pages',
      req: mockReq
    })

    expect(result).toBe('services')
  })

  test('traverses parent chain and returns root pageType', async () => {
    // Simulate: child → parent → root
    mockReq.payload.findByID
      .mockResolvedValueOnce({
        id: 'child-1',
        pageType: null, // Not set on child (should be ignored)
        parent: 'parent-1'
      })
      .mockResolvedValueOnce({
        id: 'parent-1',
        pageType: null,
        parent: 'root-1'
      })
      .mockResolvedValueOnce({
        id: 'root-1',
        pageType: 'services',
        parent: null
      })

    const result = await resolveRootPageType({
      id: 'child-1',
      collectionSlug: 'pages',
      req: mockReq
    })

    expect(result).toBe('services')
    expect(mockReq.payload.findByID).toHaveBeenCalledTimes(3)
  })

  test('detects circular parent reference', async () => {
    // Simulate: a → b → a (cycle)
    mockReq.payload.findByID
      .mockResolvedValueOnce({
        id: 'a',
        parent: 'b'
      })
      .mockResolvedValueOnce({
        id: 'b',
        parent: 'a'
      })

    await expect(
      resolveRootPageType({
        id: 'a',
        collectionSlug: 'pages',
        req: mockReq
      })
    ).rejects.toThrow(/Circular parent reference/)
  })

  test('throws when parent is missing/deleted', async () => {
    mockReq.payload.findByID
      .mockResolvedValueOnce({
        id: 'child-1',
        parent: 'deleted-parent'
      })
      .mockRejectedValueOnce(new Error('Not found'))

    await expect(
      resolveRootPageType({
        id: 'child-1',
        collectionSlug: 'pages',
        req: mockReq
      })
    ).rejects.toThrow(/not found or deleted/)
  })

  test('throws when root has no pageType', async () => {
    mockReq.payload.findByID.mockResolvedValue({
      id: 'root-1',
      pageType: null,
      parent: null
    })

    await expect(
      resolveRootPageType({
        id: 'root-1',
        collectionSlug: 'pages',
        req: mockReq
      })
    ).rejects.toThrow(/missing or empty pageType/)
  })

  test('rejects empty string pageType on root', async () => {
    mockReq.payload.findByID.mockResolvedValue({
      id: 'root-1',
      pageType: '   ',
      parent: null
    })

    await expect(
      resolveRootPageType({
        id: 'root-1',
        collectionSlug: 'pages',
        req: mockReq
      })
    ).rejects.toThrow(/missing or empty pageType/)
  })

  test('handles deep nesting (10+ levels)', async () => {
    // Create chain: page-10 → page-9 → ... → page-1 → root
    for (let i = 10; i > 0; i--) {
      mockReq.payload.findByID.mockResolvedValueOnce({
        id: `page-${i}`,
        pageType: null,
        parent: i === 1 ? 'root' : `page-${i - 1}`
      })
    }

    mockReq.payload.findByID.mockResolvedValueOnce({
      id: 'root',
      pageType: 'services',
      parent: null
    })

    const result = await resolveRootPageType({
      id: 'page-10',
      collectionSlug: 'pages',
      req: mockReq
    })

    expect(result).toBe('services')
  })
})
