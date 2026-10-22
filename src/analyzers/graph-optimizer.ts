import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Finding, TechStackProfile, TokenOptimizationMetrics } from "../types/verdict.ts";
import { walkWorkspaceFiles } from "./evidence-verifier.ts";
import { resolveRelativeImport } from "./phantom-code.ts";
import { detectProjectTechStack } from "./tech-stack-detector.ts";

const RUNTIME_IMPORT_REGEX =
  /\b(?:import(?!\s+type\b)|export(?!\s+type\b))\b[\s\S]*?\bfrom\s*['"`]([^'"`]+)['"`]/g;
const GOD_NODE_DEGREE_THRESHOLD = 8;

let cachedRtkVersion: string | null = null;

export function detectRtkVersion(): string {
  if (cachedRtkVersion !== null) return cachedRtkVersion;
  const res = spawnSync("rtk", ["--version"], { encoding: "utf8" });
  cachedRtkVersion = res.status === 0 ? (res.stdout ?? "").trim() : "";
  return cachedRtkVersion;
}

export function analyzeGraphAndTokenOptimization(workspaceRoot: string): {
  readonly telemetry: TokenOptimizationMetrics;
  readonly findings: Finding[];
  readonly techStack: TechStackProfile;
} {
  const findings: Finding[] = [];
  const techStack = detectProjectTechStack(workspaceRoot);
  const fileMap = new Map<string, string>();
  let totalChars = 0;
  let agentConfigFile: string | null = null;

  walkWorkspaceFiles(workspaceRoot, (rel, fullPath, entry, sizeBytes) => {
    if (sizeBytes >= 512_000) return;
    if (
      entry === "SKILL.md" ||
      entry === "AGENTS.md" ||
      entry === "CLAUDE.md" ||
      entry === "GEMINI.md"
    ) {
      agentConfigFile ??= rel;
    }
    if (/\.(?:[cm]?[jt]sx?|py|go|rs|md|css|html|sh)$/.test(entry)) {
      const content = readFileSync(fullPath, "utf8");
      totalChars += content.length;
      if (/\.[cm]?[jt]sx?$/.test(entry) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(rel)) {
        fileMap.set(rel, content);
      }
    }
  });

  const degreeMap = new Map<string, Set<string>>();
  for (const file of fileMap.keys()) {
    degreeMap.set(file, new Set<string>());
  }

  let edgeCount = 0;
  for (const [importer, content] of fileMap.entries()) {
    for (const match of content.matchAll(RUNTIME_IMPORT_REGEX)) {
      const spec = match[1];
      if (!spec || !spec.startsWith(".")) continue;
      const target = resolveRelativeImport(importer, spec, fileMap);
      if (target && target !== importer) {
        degreeMap.get(importer)?.add(target);
        degreeMap.get(target)?.add(importer);
        edgeCount++;
      }
    }
  }

  const graphifyJsonPath = join(workspaceRoot, "graphify-out", "graph.json");
  const graphifyIndexed = existsSync(graphifyJsonPath);
  let graphNodes = fileMap.size;
  let graphEdges = edgeCount;

  if (graphifyIndexed) {
    try {
      const rawGraph = JSON.parse(readFileSync(graphifyJsonPath, "utf8")) as {
        nodes?: unknown[];
        links?: unknown[];
        edges?: unknown[];
      };
      if (Array.isArray(rawGraph.nodes) && rawGraph.nodes.length > graphNodes) {
        graphNodes = rawGraph.nodes.length;
      }
      const linksArr = rawGraph.links ?? rawGraph.edges;
      if (Array.isArray(linksArr) && linksArr.length > graphEdges) {
        graphEdges = linksArr.length;
      }
    } catch (err) {
      findings.push({
        ruleId: "NTA-G002",
        category: "GRAPH_COUPLING",
        severity: "HIGH",
        file: "graphify-out/graph.json",
        line: 1,
        message: "Corrupted graphify-out/graph.json file cannot be parsed.",
        evidence: err instanceof Error ? err.message : String(err),
        subagent: "GraphAndTokenInquisitor",
      });
    }
  }

  const sortedNodes = [...degreeMap.entries()]
    .map(([file, neighbors]) => ({ file, degree: neighbors.size, neighbors: [...neighbors] }))
    .sort((a, b) => b.degree - a.degree);

  for (const node of sortedNodes) {
    if (node.degree >= GOD_NODE_DEGREE_THRESHOLD) {
      findings.push({
        ruleId: "NTA-G001",
        category: "GRAPH_COUPLING",
        severity: "MEDIUM",
        file: node.file,
        line: 1,
        message: `Architectural God Node: '${node.file}' is coupled to ${node.degree} modules (>= ${GOD_NODE_DEGREE_THRESHOLD} threshold).`,
        evidence: `${node.file} <-> [${node.neighbors.slice(0, 6).join(", ")}${node.neighbors.length > 6 ? ", ..." : ""}]`,
        subagent: "GraphAndTokenInquisitor",
      });
    }
  }

  const rawCorpusTokens = Math.max(1, Math.ceil(totalChars / 4));
  const graphCompactTokens = Math.max(
    1,
    Math.min(rawCorpusTokens, graphNodes * 18 + graphEdges * 10)
  );
  const tokensSaved = Math.max(0, rawCorpusTokens - graphCompactTokens);
  const reductionPercent = Math.round((tokensSaved / rawCorpusTokens) * 1000) / 10;

  if (agentConfigFile && !graphifyIndexed) {
    findings.push({
      ruleId: "NTA-G002",
      category: "GRAPH_COUPLING",
      severity: "MEDIUM",
      file: agentConfigFile,
      line: 1,
      message: `Missing Graphify Index (graphify-out/graph.json): agents reading this repo waste ~${tokensSaved} tokens (${reductionPercent}% unoptimized).`,
      evidence: `Agent config '${agentConfigFile}' present without graphify-out/graph.json (raw=${rawCorpusTokens} tok vs graph=${graphCompactTokens} tok)`,
      subagent: "GraphAndTokenInquisitor",
    });
  }

  const rtkVersion = detectRtkVersion();
  const telemetry: TokenOptimizationMetrics = {
    rtkEnabled: rtkVersion.length > 0,
    rtkVersion: rtkVersion || "not-installed",
    graphifyIndexed,
    rawCorpusTokens,
    graphCompactTokens,
    tokensSaved,
    reductionPercent,
    graphNodes,
    graphEdges,
    godNodes: sortedNodes.slice(0, 5).map(({ file, degree }) => ({ file, degree })),
  };

  return { telemetry, findings, techStack };
}
