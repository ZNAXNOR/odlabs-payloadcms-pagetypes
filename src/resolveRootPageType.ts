import type { CollectionSlug, PayloadRequest } from 'payload'

export interface ResolveRootPageTypeArgs {
  collectionSlug: CollectionSlug
  id: number | string
  req: PayloadRequest
}

export async function resolveRootPageType({
  id,
  collectionSlug,
  req,
}: ResolveRootPageTypeArgs): Promise<string> {
  const visited = new Set<number | string>()
  let currentId = id

  // Safety: limit iterations to prevent infinite loops
  const MAX_ITERATIONS = 100

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    // Cycle detection: if we've seen this ID before, there's a cycle
    if (visited.has(currentId)) {
      throw new Error(`Circular parent reference detected starting at ${id}. Check page hierarchy.`)
    }

    visited.add(currentId)

    // Fetch the current page
    let current: Record<string, any>
    try {
      current = await req.payload.findByID({
        id: currentId,
        collection: collectionSlug,
        depth: 0,
        req,
      })
    } catch (_ignore) {
      throw new Error(`Parent page ${currentId} not found or deleted. Broken hierarchy at page ${id}.`)
    }

    if (!current) {
      throw new Error(`Parent page ${currentId} returned null. Broken hierarchy at page ${id}.`)
    }

    // If no parent, we've reached the root
    if (!current.parent) {
      // Validate that root has pageType
      if (!current.pageType || typeof current.pageType !== 'string' || !current.pageType.trim()) {
        throw new Error(`Root page ${currentId} missing or empty pageType. Data corruption detected.`)
      }

      return current.pageType
    }

    // Move to parent for next iteration
    currentId = current.parent
  }

  // Reached iteration limit
  throw new Error(`Page hierarchy too deep (>100 levels). Check for accidental cycles or malformed data.`)
}
