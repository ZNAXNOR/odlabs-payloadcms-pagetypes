import os
from pathlib import Path

chunks = {
    "chunk1": [
        "eslint.config.js", "playwright.config.js", "postcss.config.mjs", "vitest.config.js",
        "dev/e2e.spec.ts", "dev/int.spec.ts", "dev/next-env.d.ts", "dev/next.config.mjs",
        "dev/payload-types.ts", "dev/payload.config.ts", "dev/seed.ts",
        "dev/app/(payload)/layout.tsx", "dev/app/(payload)/admin/importMap.js",
        "dev/app/(payload)/admin/[[...segments]]/not-found.tsx",
        "dev/app/(payload)/admin/[[...segments]]/page.tsx",
        "dev/app/(payload)/api/graphql/route.ts",
        "dev/app/(payload)/api/graphql-playground/route.ts",
        "dev/app/(payload)/api/[...slug]/route.ts",
        "dev/app/my-route/route.ts"
    ],
    "chunk2": [
        "dev/blocks/GlobalBlock/config.ts", "dev/blocks/LegalBlock/config.ts", "dev/blocks/ServiceBlock/config.ts",
        "dev/collections/Pages.ts", "dev/helpers/testEmailAdapter.ts", "src/enhanceCollection.ts",
        "src/hooks.ts", "src/index.ts", "src/resolveRootPageType.ts", "src/types.ts",
        "src/admin/widgets/PageTypesHealth.tsx", "src/admin/widgets/PageTypesHealthClient.tsx",
        "src/admin/widgets/QuickCreateButton.tsx", "src/components/BeforeDashboardClient.tsx",
        "src/components/BeforeDashboardServer.tsx", "src/components/PageTypeField.tsx"
    ],
    "chunk3": [
        "src/components/SlugDescription.tsx", "src/endpoints/customEndpointHandler.ts",
        "src/exports/client.ts", "src/exports/rsc.ts", "src/__tests__/hooks.test.ts",
        "src/__tests__/resolveRootPageType.test.ts", "CONTRIBUTING.md", "HOW-IT-WORKS.md",
        "README.md", "dev-docs/Phase0_Setup.md", "dev-docs/Phase1_CoreLogic.md",
        "dev-docs/Phase2_CollectionEnhancement.md", "dev-docs/Phase3_BlocksSystem.md",
        "dev-docs/Phase4_AdminWidget.md", "dev-docs/Phase5_NestedDocs.md",
        "dev-docs/Phase6_Packaging.md", "dev/media/Hero.webp"
    ]
}

for name, files in chunks.items():
    output_file = Path(f"graphify-out/{name}_raw.txt")
    with output_file.open("w", encoding="utf-8") as out:
        for f in files:
            p = Path(f)
            if p.exists():
                out.write(f"--- FILE: {f} ---\n")
                out.write(p.read_text(encoding="utf-8", errors="ignore"))
                out.write("\n\n")
            else:
                print(f"Warning: {f} not found")
    print(f"Done: {output_file}")
