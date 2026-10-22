import { existsSync, readFileSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import { parseRepoSlug } from "../repo/git-manager.ts";
import { runInquisitorSubagents } from "../subagents/orchestrator.ts";
import { renderForensicDashboardHtml } from "./ui.ts";

export interface ServerOptions {
  readonly port?: number;
  readonly cacheDir?: string;
}

export function createAppServer(options: ServerOptions = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 4173);
  const cacheDir = resolve(options.cacheDir ?? join(process.cwd(), ".nta/repos"));

  return Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/") {
        return new Response(renderForensicDashboardHtml(), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

      if (req.method === "POST" && url.pathname === "/api/scan") {
        try {
          const body = (await req.json()) as { repoUrl?: string };
          const repoUrl = body.repoUrl?.trim() ?? "";
          if (!repoUrl) {
            return Response.json({ error: "repoUrl is required" }, { status: 400 });
          }

          const target = repoUrl === "." ? process.cwd() : repoUrl;
          const report = await runInquisitorSubagents(target, cacheDir);
          return Response.json(report);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return Response.json({ error: message }, { status: 400 });
        }
      }

      if (req.method === "GET" && url.pathname === "/api/file") {
        try {
          const slug = parseRepoSlug(url.searchParams.get("slug") ?? "");
          const relFile = url.searchParams.get("file") ?? "";
          const repoRoot = resolve(join(cacheDir, slug));
          const absFile = resolve(join(repoRoot, normalize(relFile)));

          if (!absFile.startsWith(repoRoot) || !existsSync(absFile)) {
            return Response.json({ error: "File not found in cached repository" }, { status: 404 });
          }

          const content = readFileSync(absFile, "utf8");
          return Response.json({
            file: relFile,
            lines: content.split("\n"),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return Response.json({ error: message }, { status: 400 });
        }
      }

      if (req.method === "GET" && url.pathname === "/api/video") {
        try {
          const slug = parseRepoSlug(url.searchParams.get("slug") ?? "");
          const safeSlug = slug.replace(/[^a-zA-Z0-9._-]/g, "_");
          const videoPath = resolve(join(cacheDir, "videos", `${safeSlug}-audit.webm`));
          if (!videoPath.startsWith(cacheDir) || !existsSync(videoPath)) {
            return Response.json({ error: "Forensic A->Z video not found" }, { status: 404 });
          }
          const bytes = readFileSync(videoPath);
          return new Response(bytes, {
            headers: {
              "content-type": "video/webm",
              "content-length": String(bytes.byteLength),
              "content-disposition": `inline; filename="${safeSlug}-audit.webm"`,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return Response.json({ error: message }, { status: 400 });
        }
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    },
  });
}
