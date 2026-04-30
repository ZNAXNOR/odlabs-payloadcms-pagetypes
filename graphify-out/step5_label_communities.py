import sys, json
from graphify.build import build_from_json
from graphify.cluster import score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from pathlib import Path

extraction_path = Path('graphify-out/.graphify_extract.json')
detection_path = Path('graphify-out/.graphify_detect.json')
analysis_path = Path('graphify-out/.graphify_analysis.json')

if not all([p.exists() for p in [extraction_path, detection_path, analysis_path]]):
    print("Error: Missing required files for Step 5")
    exit(1)

extraction = json.loads(extraction_path.read_text(encoding='utf-8-sig'))
detection  = json.loads(detection_path.read_text(encoding='utf-8-sig'))
analysis   = json.loads(analysis_path.read_text(encoding='utf-8-sig'))

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
cohesion = {int(k): v for k, v in analysis['cohesion'].items()}
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}

labels = {
    0: "Payload Dev Environment",
    1: "Collection Hooks & Logic",
    2: "Plugin Core & Setup",
    3: "Page Type Resolution",
    4: "Integration Tests & Endpoints",
    5: "Admin Page Routing",
    6: "Email Adapter Helpers",
    7: "Public Exports & Import Map",
    8: "E2E Testing Suite",
    9: "Quick Create UI",
    10: "Dashboard Client Components",
    11: "Dashboard Server Components",
    12: "Linting Config",
    13: "Styling Config",
    14: "Next.js Environment",
    15: "Global Block Config",
    16: "Legal Block Config",
    17: "Service Block Config",
    18: "Health Widget Client",
    19: "Slug Description UI",
    20: "Main README",
    21: "Architecture Documentation",
    22: "Phase 1: Core Logic Docs",
    23: "Phase 3: Blocks System Docs"
}

questions = suggest_questions(G, communities, labels)
report = generate(G, communities, cohesion, labels, analysis['gods'], analysis['surprises'], detection, tokens, '.', suggested_questions=questions)

Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}), encoding='utf-8')

print('Report updated with 24 community labels')
