import json
from pathlib import Path

def align():
    ast_path = Path('graphify-out/.graphify_ast.json')
    if not ast_path.exists():
        print("Error: AST JSON not found")
        return

    ast = json.loads(ast_path.read_text(encoding='utf-8-sig'))
    
    # Create a map from source_file to the "main" node ID for that file (the file node itself)
    # File nodes usually have label == filename or similar, and are the root for that file.
    file_to_id = {}
    for n in ast['nodes']:
        if n.get('source_location') == 'L1' or n['id'].endswith('_ts') or n['id'].endswith('_js') or n['id'].endswith('_tsx'):
            # This is likely the file node
            file_to_id[n['source_file'].replace('\\', '/')] = n['id']

    # Also map src/... to src/...
    for f, id in list(file_to_id.items()):
        if f.startswith('c:/Users/omkar/Desktop/Omkar/VisualStudioCode/odlabs-payloadcms-pagetypes/'):
            rel = f.replace('c:/Users/omkar/Desktop/Omkar/VisualStudioCode/odlabs-payloadcms-pagetypes/', '')
            file_to_id[rel] = id

    for i in range(1, 4):
        p = Path(f'graphify-out/.graphify_chunk_{i}.json')
        if not p.exists(): continue
        
        chunk = json.loads(p.read_text(encoding='utf-8-sig'))
        id_map = {}
        
        # Identify mapping
        for n in chunk['nodes']:
            src = n.get('source_file', '').replace('\\', '/')
            if src in file_to_id:
                id_map[n['id']] = file_to_id[src]
        
        # Apply mapping to nodes
        new_nodes = []
        for n in chunk['nodes']:
            if n['id'] in id_map:
                # We merge this semantic info into the AST node later, 
                # but for now we just update the ID so the merge works.
                n['id'] = id_map[n['id']]
            new_nodes.append(n)
        chunk['nodes'] = new_nodes
        
        # Apply mapping to edges
        for e in chunk['edges']:
            if e['source'] in id_map: e['source'] = id_map[e['source']]
            if e['target'] in id_map: e['target'] = id_map[e['target']]
        
        # Apply mapping to hyperedges
        for h in chunk.get('hyperedges', []):
            h['nodes'] = [id_map.get(nid, nid) for nid in h['nodes']]
            
        p.write_text(json.dumps(chunk, indent=2), encoding='utf-8')
        print(f"Aligned {p}")

if __name__ == "__main__":
    align()
