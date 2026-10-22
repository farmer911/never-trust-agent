export function renderForensicDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NEVER TRUST AGENT — Multi-Subagent Forensic Code & Skill Inquisitor</title>
  <style>
    :root {
      --bg-base: #090b10;
      --bg-panel: #11151f;
      --bg-elevated: #171c29;
      --bg-code: #06080c;
      --border-dim: #242c3d;
      --border-strong: #38445e;
      --text-main: #e5e9f0;
      --text-muted: #8b95a7;
      --accent-red: #f43f5e;
      --accent-red-dim: rgba(244, 63, 94, 0.14);
      --accent-amber: #f59e0b;
      --accent-amber-dim: rgba(245, 158, 11, 0.14);
      --accent-cyan: #06b6d4;
      --accent-cyan-dim: rgba(6, 182, 212, 0.14);
      --accent-green: #10b981;
      --accent-green-dim: rgba(16, 185, 129, 0.14);
      --font-mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
      --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.5;
      padding: 24px;
    }

    .container {
      max-width: 1440px;
      margin: 0 auto;
    }

    .header {
      border: 1px solid var(--border-strong);
      background: var(--bg-panel);
      padding: 20px 24px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .title-block h1 {
      font-family: var(--font-mono);
      font-size: 20px;
      letter-spacing: 0.05em;
      color: var(--accent-red);
    }

    .title-block p {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 4px;
      font-family: var(--font-mono);
    }

    .axiom-pill {
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 4px;
      background: var(--accent-red-dim);
      color: var(--accent-red);
      border: 1px solid var(--accent-red);
      font-weight: 700;
    }

    .control-bar {
      background: var(--bg-panel);
      border: 1px solid var(--border-dim);
      padding: 18px 24px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .input-row {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .repo-input {
      flex: 1;
      background: var(--bg-code);
      border: 1px solid var(--border-strong);
      color: var(--text-main);
      font-family: var(--font-mono);
      font-size: 14px;
      padding: 12px 16px;
      border-radius: 6px;
    }

    .btn-scan {
      background: var(--accent-red);
      color: var(--text-main);
      border: none;
      padding: 12px 24px;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 13px;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-scan:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .presets {
      margin-top: 10px;
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 12px;
      color: var(--text-muted);
      font-family: var(--font-mono);
    }

    .preset-btn {
      background: var(--bg-elevated);
      color: var(--accent-cyan);
      border: 1px solid var(--border-dim);
      padding: 4px 10px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 11px;
      cursor: pointer;
    }

    .meta-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .metric-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-dim);
      padding: 14px 16px;
      border-radius: 6px;
    }

    .metric-label {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--text-muted);
      text-transform: uppercase;
    }

    .metric-val {
      font-size: 20px;
      font-family: var(--font-mono);
      font-weight: 700;
      margin-top: 4px;
    }

    .subagent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      margin-bottom: 24px;
    }

    .subagent-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-dim);
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: border-color 0.15s ease;
    }

    .subagent-card.active {
      border-color: var(--accent-cyan);
      background: var(--bg-elevated);
    }

    .subagent-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .subagent-name {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 14px;
      color: var(--accent-cyan);
    }

    .subagent-role {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .badge-row {
      display: flex;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 11px;
    }

    .badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }

    .badge-CRITICAL {
      background: var(--accent-red-dim);
      color: var(--accent-red);
      border: 1px solid var(--accent-red);
    }

    .badge-HIGH {
      background: var(--accent-amber-dim);
      color: var(--accent-amber);
      border: 1px solid var(--accent-amber);
    }

    .badge-MEDIUM, .badge-NITPICK {
      background: var(--accent-cyan-dim);
      color: var(--accent-cyan);
      border: 1px solid var(--accent-cyan);
    }

    .badge-PASS {
      background: var(--accent-green-dim);
      color: var(--accent-green);
      border: 1px solid var(--accent-green);
    }

    .workspace-split {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      align-items: start;
    }

    .panel {
      background: var(--bg-panel);
      border: 1px solid var(--border-dim);
      border-radius: 8px;
      overflow: hidden;
    }

    .panel-header {
      padding: 12px 16px;
      background: var(--bg-elevated);
      border-bottom: 1px solid var(--border-dim);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 700;
    }

    .filter-bar {
      display: flex;
      gap: 8px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-dim);
      background: var(--bg-base);
    }

    .filter-input {
      flex: 1;
      background: var(--bg-panel);
      border: 1px solid var(--border-dim);
      color: var(--text-main);
      padding: 6px 10px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .findings-list {
      max-height: 700px;
      overflow-y: auto;
    }

    .finding-item {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-dim);
      cursor: pointer;
    }

    .finding-item:hover {
      background: var(--bg-elevated);
    }

    .finding-top {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .finding-loc {
      color: var(--accent-cyan);
      font-weight: 700;
    }

    .finding-msg {
      font-size: 13px;
      margin-bottom: 8px;
    }

    .finding-evidence {
      background: var(--bg-code);
      border-left: 3px solid var(--accent-red);
      padding: 8px 10px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .code-viewer {
      max-height: 750px;
      overflow: auto;
      background: var(--bg-code);
      font-family: var(--font-mono);
      font-size: 12px;
    }

    .code-line {
      display: flex;
      padding: 2px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }

    .code-line.flagged {
      background: var(--accent-red-dim);
    }

    .line-num {
      width: 48px;
      color: var(--text-muted);
      user-select: none;
      text-align: right;
      padding-right: 12px;
      flex-shrink: 0;
    }

    .line-text {
      white-space: pre;
      overflow-x: auto;
    }

    .inline-critique {
      background: var(--bg-elevated);
      border-left: 4px solid var(--accent-red);
      padding: 6px 12px 6px 60px;
      color: var(--accent-amber);
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="title-block">
        <h1>NEVER TRUST AGENT // FORENSIC INQUISITOR</h1>
        <p>Multi-Subagent Static & Skill-vs-Code Drift Auditor — Every Critique Backed By Line Evidence</p>
      </div>
      <div class="axiom-pill">NOTHING IS PERFECT // AGENT IS AN ASSHOLE</div>
    </header>

    <section class="control-bar">
      <div class="input-row">
        <input
          id="repoUrlInput"
          class="repo-input"
          type="text"
          placeholder="Enter GitHub Repo URL or local path (e.g. https://github.com/obra/superpowers)"
          value="https://github.com/obra/superpowers"
        />
        <button id="scanBtn" class="btn-scan" onclick="triggerScan()">CLONE / PULL &amp; AUDIT REPO</button>
      </div>
      <div class="presets">
        <span>Quick Targets:</span>
        <button class="preset-btn" onclick="setTarget('https://github.com/obra/superpowers')">obra/superpowers</button>
        <button class="preset-btn" onclick="setTarget('.')">Self-Audit (NeverTrustAgent)</button>
      </div>
    </section>

    <section id="metaStrip" class="meta-strip"></section>
    <section id="subagentGrid" class="subagent-grid"></section>

    <section class="workspace-split">
      <div class="panel">
        <div class="panel-header">
          <span id="findingsHeader">EVIDENCE-BACKED CRITIQUE LEDGER (0)</span>
          <button class="preset-btn" onclick="filterBySubagent(null)">Show All Subagents</button>
        </div>
        <div class="filter-bar">
          <input
            id="searchFilter"
            class="filter-input"
            type="text"
            placeholder="Filter by file, ruleId (e.g. NTA-K003, NTA-C001), message, or code evidence..."
            oninput="renderFindingsList()"
          />
        </div>
        <div id="findingsList" class="findings-list"></div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <span id="inspectorHeader">LINE-BY-LINE FORENSIC FILE INSPECTOR</span>
        </div>
        <div id="codeViewer" class="code-viewer"></div>
      </div>
    </section>
  </div>

  <script>
    let currentAudit = null;
    let activeSubagent = null;

    function setTarget(val) {
      document.getElementById("repoUrlInput").value = val;
      triggerScan();
    }

    async function triggerScan() {
      const repoUrl = document.getElementById("repoUrlInput").value.trim();
      if (!repoUrl) return;
      const btn = document.getElementById("scanBtn");
      btn.disabled = true;
      btn.textContent = "CLONING / PULLING & DISPATCHING 6 INQUISITORS...";

      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ repoUrl }),
          signal: AbortSignal.timeout(120000),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Scan failed");
          return;
        }
        currentAudit = data;
        activeSubagent = null;
        renderDashboard();
      } catch (err) {
        alert("Scan request failed: " + String(err));
      } finally {
        btn.disabled = false;
        btn.textContent = "CLONE / PULL & AUDIT REPO";
      }
    }

    function renderDashboard() {
      if (!currentAudit) return;
      const m = currentAudit.repoMeta;
      const t = currentAudit.tokenOptimization || {};
      document.getElementById("metaStrip").innerHTML = [
        metricCard("GIT SYNC ACTION", m.action + " (" + m.branch + ")"),
        metricCard("HEAD COMMIT SHA", m.headSha),
        metricCard("FILES / LINES SCANNED", currentAudit.scannedFilesCount + " files / " + currentAudit.totalLinesScanned + " LOC"),
        metricCard("TOTAL DEFECTS FOUND", String(currentAudit.totalFindings)),
        metricCard("INTEGRITY SCORE", currentAudit.integrityScore + " / 100"),
        metricCard("RTK + GRAPHIFY SAVED", (t.reductionPercent || 0) + "% (" + (t.tokensSaved || 0) + " tok)"),
        metricCard("GRAPH TOPOLOGY", (t.graphNodes || 0) + " nodes / " + (t.graphEdges || 0) + " edges"),
        metricCard("RTK ENGINE", t.rtkVersion || "active"),
      ].join("");

      document.getElementById("subagentGrid").innerHTML = currentAudit.subagentReports
        .map((sub) => {
          const isActive = activeSubagent === sub.name ? "active" : "";
          return \`
            <div class="subagent-card \${isActive}" onclick="filterBySubagent('\${sub.name}')">
              <div class="subagent-head">
                <span class="subagent-name">\${escapeHtml(sub.name)}</span>
                <span class="badge \${sub.findingsCount > 0 ? 'badge-CRITICAL' : 'badge-PASS'}">\${sub.findingsCount} findings (\${sub.durationMs}ms)</span>
              </div>
              <div class="subagent-role">\${escapeHtml(sub.role)}</div>
              <div class="badge-row">
                <span class="badge badge-CRITICAL">CRIT: \${sub.criticalCount}</span>
                <span class="badge badge-HIGH">HIGH: \${sub.highCount}</span>
                <span class="badge badge-MEDIUM">MED: \${sub.mediumCount}</span>
                <span class="badge badge-NITPICK">NIT: \${sub.nitpickCount}</span>
              </div>
            </div>
          \`;
        })
        .join("");

      renderFindingsList();
      if (currentAudit.findings.length > 0) {
        inspectFile(currentAudit.findings[0].file, currentAudit.findings[0].line);
      }
    }

    function filterBySubagent(name) {
      activeSubagent = name;
      renderDashboard();
    }

    function renderFindingsList() {
      if (!currentAudit) return;
      const q = document.getElementById("searchFilter").value.trim().toLowerCase();
      const filtered = currentAudit.findings.filter((f) => {
        if (activeSubagent && f.subagent !== activeSubagent) return false;
        if (!q) return true;
        return (
          f.file.toLowerCase().includes(q) ||
          f.ruleId.toLowerCase().includes(q) ||
          f.message.toLowerCase().includes(q) ||
          f.evidence.toLowerCase().includes(q)
        );
      });

      document.getElementById("findingsHeader").textContent =
        "EVIDENCE-BACKED CRITIQUE LEDGER (" + filtered.length + ")";

      document.getElementById("findingsList").innerHTML = filtered
        .map(
          (f) => \`
          <div class="finding-item" onclick="inspectFile('\${escapeAttr(f.file)}', \${f.line})">
            <div class="finding-top">
              <span class="badge badge-\${f.severity}">\${f.severity}</span>
              <span class="badge badge-MEDIUM">\${escapeHtml(f.ruleId)}</span>
              <span class="finding-loc">\${escapeHtml(f.file)}:\${f.line}</span>
              <span style="margin-left:auto;color:var(--text-muted)">[\${escapeHtml(f.subagent || "")}]</span>
            </div>
            <div class="finding-msg">\${escapeHtml(f.message)}</div>
            <div class="finding-evidence">EVIDENCE: \${escapeHtml(f.evidence)}</div>
          </div>
        \`
        )
        .join("");
    }

    async function inspectFile(filePath, targetLine) {
      if (!currentAudit) return;
      const slug = currentAudit.repoMeta.slug;
      const res = await fetch(
        "/api/file?slug=" + encodeURIComponent(slug) + "&file=" + encodeURIComponent(filePath),
        { signal: AbortSignal.timeout(30000) }
      );
      if (!res.ok) return;
      const data = await res.json();
      document.getElementById("inspectorHeader").textContent =
        "FILE INSPECTOR: " + filePath + " (Line " + targetLine + ")";

      const fileFindings = new Map();
      for (const f of currentAudit.findings) {
        if (f.file === filePath) {
          const list = fileFindings.get(f.line) || [];
          list.push(f);
          fileFindings.set(f.line, list);
        }
      }

      const viewer = document.getElementById("codeViewer");
      viewer.innerHTML = data.lines
        .map((lineText, idx) => {
          const ln = idx + 1;
          const hits = fileFindings.get(ln) || [];
          const flaggedClass = hits.length > 0 ? "flagged" : "";
          const critiques = hits
            .map(
              (h) =>
                \`<div class="inline-critique">▲ [\${escapeHtml(h.ruleId)} / \${escapeHtml(h.subagent || "")}] (\${h.severity}): \${escapeHtml(h.message)}</div>\`
            )
            .join("");
          return \`
            <div id="code-line-\${ln}" class="code-line \${flaggedClass}">
              <span class="line-num">\${ln}</span>
              <span class="line-text">\${escapeHtml(lineText)}</span>
            </div>
            \${critiques}
          \`;
        })
        .join("");

      const targetEl = document.getElementById("code-line-" + targetLine);
      if (targetEl) {
        targetEl.scrollIntoView({ block: "center" });
      }
    }

    function metricCard(label, val) {
      return \`
        <div class="metric-card">
          <div class="metric-label">\${escapeHtml(label)}</div>
          <div class="metric-val">\${escapeHtml(val)}</div>
        </div>
      \`;
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function escapeAttr(str) {
      return String(str).replace(/'/g, "\\\\'");
    }
  </script>
</body>
</html>`;
}
