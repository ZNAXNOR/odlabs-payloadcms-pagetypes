# Graph Report - .  (2026-04-30)

## Corpus Check
- Corpus is ~23,908 words - fits in a single context window. You may not need a graph.

## Summary
- 67 nodes · 49 edges · 5 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.82)
- Token cost: 18,000 input · 4,500 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Collection Hooks & Logic|Collection Hooks & Logic]]
- [[_COMMUNITY_Main README|Main README]]
- [[_COMMUNITY_Architecture Documentation|Architecture Documentation]]
- [[_COMMUNITY_Phase 1 Core Logic Docs|Phase 1: Core Logic Docs]]
- [[_COMMUNITY_Phase 3 Blocks System Docs|Phase 3: Blocks System Docs]]

## God Nodes (most connected - your core abstractions)
1. `enhanceCollection()` - 3 edges
2. `createBeforeValidateHook()` - 2 edges
3. `createBeforeDeleteHook()` - 2 edges
4. `Project README` - 0 edges
5. `Architecture Guide` - 0 edges
6. `Phase 1: Core Logic Docs` - 0 edges
7. `Phase 3: Blocks System Docs` - 0 edges

## Surprising Connections (you probably didn't know these)
- `enhanceCollection()` --calls--> `createBeforeValidateHook()`  [INFERRED]
  src\enhanceCollection.ts → src\hooks.ts
- `enhanceCollection()` --calls--> `createBeforeDeleteHook()`  [INFERRED]
  src\enhanceCollection.ts → src\hooks.ts

## Hyperedges (group relationships)
- **Development Environment Stack** — dev_payload_config_ts, dev_next_config_mjs, dev_seed_ts, dev_app_payload_layout_tsx [INFERRED 0.90]
- **Core Plugin Architecture** — src_index_ts, src_enhancecollection_ts, src_hooks_ts, src_resolverootpagetype_ts [EXTRACTED 1.00]
- **Project Documentation** — readme, how_it_works, phase1_docs, phase3_docs [EXTRACTED 1.00]

## Communities

### Community 1 - "Collection Hooks & Logic"
Cohesion: 0.28
Nodes (3): enhanceCollection(), createBeforeDeleteHook(), createBeforeValidateHook()

### Community 20 - "Main README"
Cohesion: 1.0
Nodes (1): Project README

### Community 21 - "Architecture Documentation"
Cohesion: 1.0
Nodes (1): Architecture Guide

### Community 22 - "Phase 1: Core Logic Docs"
Cohesion: 1.0
Nodes (1): Phase 1: Core Logic Docs

### Community 23 - "Phase 3: Blocks System Docs"
Cohesion: 1.0
Nodes (1): Phase 3: Blocks System Docs

## Knowledge Gaps
- **4 isolated node(s):** `Project README`, `Architecture Guide`, `Phase 1: Core Logic Docs`, `Phase 3: Blocks System Docs`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Main README`** (1 nodes): `Project README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Architecture Documentation`** (1 nodes): `Architecture Guide`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phase 1: Core Logic Docs`** (1 nodes): `Phase 1: Core Logic Docs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Phase 3: Blocks System Docs`** (1 nodes): `Phase 3: Blocks System Docs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 2 inferred relationships involving `enhanceCollection()` (e.g. with `createBeforeValidateHook()` and `createBeforeDeleteHook()`) actually correct?**
  _`enhanceCollection()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Project README`, `Architecture Guide`, `Phase 1: Core Logic Docs` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Payload Dev Environment` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._