import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { PluginConfig } from '../types.js'

import { createBeforeDeleteHook, createBeforeValidateHook } from '../hooks.js'

const mockConfig: PluginConfig = {
  collectionSlug: 'pages',
  enforceRootSlug: true,
  pageTypes: [
    { slug: 'services', label: 'Services', required: true },
    { slug: 'legal', label: 'Legal', required: false }
  ],
  restrictions: [
    { allowedPageTypes: ['services'], block: 'hero' }
  ],
}

describe('beforeValidate hook', () => {
  let hook: any
  let mockReq: any

  beforeEach(() => {
    hook = createBeforeValidateHook(mockConfig)
    mockReq = {
      payload: {
        find: vi.fn().mockResolvedValue({ totalDocs: 0 }),
        findByID: vi.fn()
      },
      user: { id: 'admin' }
    }
  })

  test('allows root without pageType (Simple Page)', async () => {
    const data = { pageType: '', parent: null }
    const result = await hook({
      data,
      req: mockReq
    })
    expect(result.pageType).toBe('')
  })

  test('throws if pageType not in config', async () => {
    await expect(
      hook({
        data: { pageType: 'invalid', parent: null },
        req: mockReq
      })
    ).rejects.toThrow(/Invalid pageType/)
  })

  test('allows child without pageType (computed from root)', async () => {
    mockReq.payload.findByID
      .mockResolvedValueOnce({
        id: 'root-1',
        pageType: 'services',
        parent: null,
      })

    const data = { layout: [], pageType: null, parent: 'root-1' }

    await hook({
      data,
      req: mockReq
    })

    expect(data.pageType).toBe('services')
  })

  test('validates blocks against pageType', async () => {
    await expect(
      hook({
        data: {
          slug: 'legal',
          layout: [{ blockType: 'hero' }],
          pageType: 'legal',
          parent: null,
        },
        req: mockReq
      })
    ).rejects.toThrow(/not allowed on/)
  })

  test('allows blocks not in restrictions', async () => {
    const data = {
      slug: 'services',
      layout: [
        { blockType: 'hero' },
        { blockType: 'custom-block' }, // Not restricted
      ],
      pageType: 'services',
      parent: null,
    }

    await hook({ data, req: mockReq })
    // Should not throw
  })
})

describe('beforeDelete hook', () => {
  let hook: any
  let mockReq: any

  beforeEach(() => {
    hook = createBeforeDeleteHook(mockConfig)
    mockReq = {
      payload: {
        find: vi.fn(),
        findByID: vi.fn()
      },
      user: { id: 'admin' }
    }
  })

  test('throws if deleting required root', async () => {
    mockReq.payload.findByID.mockResolvedValue({ id: 'root-1', pageType: 'services', parent: null })
    mockReq.payload.find.mockResolvedValue({ totalDocs: 0 })

    await expect(
      hook({
        id: 'root-1',
        req: mockReq
      })
    ).rejects.toThrow(/Cannot delete.*required/)
  })

  test('throws if root has children', async () => {
    mockReq.payload.findByID.mockResolvedValue({ id: 'root-1', pageType: 'legal', parent: null })
    mockReq.payload.find.mockResolvedValue({ totalDocs: 5 })

    await expect(
      hook({
        id: 'root-1',
        req: mockReq
      })
    ).rejects.toThrow(/has.*child/)
  })

  test('allows delete of non-required root with no children', async () => {
    mockReq.payload.findByID.mockResolvedValue({ id: 'root-1', pageType: 'legal', parent: null })
    mockReq.payload.find.mockResolvedValue({ totalDocs: 0 })

    await expect(
      hook({
        id: 'root-1',
        req: mockReq
      })
    ).resolves.not.toThrow()
  })
})
