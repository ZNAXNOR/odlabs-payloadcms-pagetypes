import json
from pathlib import Path

chunks = []
for i in range(1, 4):
    p = Path(f'graphify-out/.graphify_chunk_{i}.json')
    if p.exists():
        chunks.append(json.loads(p.read_text(encoding='utf-8-sig')))

all_nodes = []
all_edges = []
all_hyperedges = []
total_input = 0
total_output = 0

for c in chunks:
    all_nodes.extend(c.get('nodes', []))
    all_edges.extend(c.get('edges', []))
    all_hyperedges.extend(c.get('hyperedges', []))
    total_input += c.get('input_tokens', 0)
    total_output += c.get('output_tokens', 0)

seen = set()
deduped = []
for n in all_nodes:
    if n['id'] not in seen:
        deduped.append(n)
        seen.add(n['id'])

merged = {
    'nodes': deduped,
    'edges': all_edges,
    'hyperedges': all_hyperedges,
    'input_tokens': total_input,
    'output_tokens': total_output,
}

Path('graphify-out/.graphify_semantic.json').write_text(json.dumps(merged, indent=2))
print(f'Semantic: {len(deduped)} nodes, {len(all_edges)} edges')
