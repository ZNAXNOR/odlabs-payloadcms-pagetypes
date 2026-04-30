import sys, json
from graphify.build import build_from_json
from graphify.export import to_html
from pathlib import Path

extraction_path = Path('graphify-out/.graphify_extract.json')
analysis_path = Path('graphify-out/.graphify_analysis.json')
labels_path = Path('graphify-out/.graphify_labels.json')

if not all([p.exists() for p in [extraction_path, analysis_path, labels_path]]):
    print("Error: Missing required files for Step 6")
    exit(1)

extraction = json.loads(extraction_path.read_text(encoding='utf-8-sig'))
analysis   = json.loads(analysis_path.read_text(encoding='utf-8-sig'))
labels_raw = json.loads(labels_path.read_text(encoding='utf-8-sig'))

G = build_from_json(extraction)
communities = {int(k): v for k, v in analysis['communities'].items()}
labels = {int(k): v for k, v in labels_raw.items()}

to_html(G, communities, 'graphify-out/graph.html', community_labels=labels or None)
print('graph.html written - open in any browser')
