import os
from pathlib import Path

files = [
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
]

output_file = Path("graphify-out/chunk1_raw.txt")
with output_file.open("w", encoding="utf-8") as out:
    for f in files:
        p = Path(f)
        if p.exists():
            out.write(f"--- FILE: {f} ---\n")
            out.write(p.read_text(encoding="utf-8", errors="ignore"))
            out.write("\n\n")
        else:
            print(f"Warning: {f} not found")
