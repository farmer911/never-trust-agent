#!/usr/bin/env bash
set -euo pipefail

GRAPHIFY_BIN="$(command -v graphify)"
PYTHON_BIN="$(head -n 1 "$GRAPHIFY_BIN" | tr -d '#!')"

"$PYTHON_BIN" -c '
import json
from pathlib import Path
from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

all_files = []
for target in ["src", "tests", "scripts", "prompts", "skills", "AGENTS.md", "GEMINI.md"]:
    p = Path(target)
    if p.is_file():
        all_files.append(p)
    elif p.is_dir():
        all_files.extend(collect_files(p))

result = extract(all_files)
Path("graphify-out").mkdir(exist_ok=True)
G = build_from_json(result)
communities = cluster(G)
cohesion = score_all(G, communities)
tokens = {"input": result.get("input_tokens", 0), "output": result.get("output_tokens", 0)}
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: "Community " + str(cid) for cid in communities}
questions = suggest_questions(G, communities, labels)
det = detect(Path("."))
report = generate(G, communities, cohesion, labels, gods, surprises, det, tokens, "main", suggested_questions=questions)
Path("graphify-out/GRAPH_REPORT.md").write_text(report)
to_json(G, communities, "graphify-out/graph.json", force=True)
manifest = {str(f): Path(f).stat().st_mtime for f in all_files}
Path("graphify-out/manifest.json").write_text(json.dumps(manifest, indent=2))
print(f"[graphify] Indexed {len(all_files)} files -> {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, {len(communities)} communities")
'
