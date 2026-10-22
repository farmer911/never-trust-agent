import type { Finding } from "../types/verdict.ts";

const IMPORTANT_REGEX = /!important\b/;
const HEX_OR_RGB_COLOR_REGEX = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(/;
const Z_INDEX_REGEX = /\bz-index\s*:\s*(\d+)/;
const OUTLINE_NONE_REGEX = /\boutline\s*:\s*(?:none|0)\b/;
const INLINE_STYLE_REGEX = /\bstyle\s*=\s*(?:\{\{|\s*["'])/;
const CSS_PROP_LINE_REGEX = /^[ \t]*([a-zA-Z-]+)\s*:\s*([^;]+);/;
const QUOTED_ARRAY_LINE = /^[ \t]*['"`].*['"`]\s*,?\s*$/;

export function analyzeCssAndUi(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");
  const isStylesheet = /\.(?:css|scss|less)$/.test(file);
  const isMarkupOrJsx = /\.(?:tsx|jsx|html|vue|svelte)$/.test(file);

  let currentBlockProps = new Map<string, number>();
  let inStyleTag = false;
  let inReducedMotionMedia = false;
  let mediaBraceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;

    if (isMarkupOrJsx && /<style\b/i.test(line)) {
      inStyleTag = true;
    }
    if (isMarkupOrJsx && /<\/style>/i.test(line)) {
      inStyleTag = false;
    }

    if (isMarkupOrJsx && !QUOTED_ARRAY_LINE.test(line) && INLINE_STYLE_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-C004",
        category: "CSS_NITPICK",
        severity: "NITPICK",
        file,
        line: lineNum,
        message: "Inline style attribute bypasses design tokens and stylesheet cascade.",
        evidence: line.trim(),
        subagent: "CssAndUiInquisitor",
      });
    }

    if (!isStylesheet && !inStyleTag) continue;

    if (/@media\b[^{]*prefers-reduced-motion/i.test(line)) {
      inReducedMotionMedia = true;
      mediaBraceDepth = 0;
    }
    if (inReducedMotionMedia) {
      mediaBraceDepth += (line.match(/\{/g) ?? []).length;
      mediaBraceDepth -= (line.match(/\}/g) ?? []).length;
    }

    if (line.includes("{")) {
      currentBlockProps = new Map<string, number>();
    }

    const isWcagReducedMotionOverride =
      inReducedMotionMedia && /\b(?:animation|transition|scroll-behavior)[a-zA-Z-]*\s*:/.test(line);

    if (IMPORTANT_REGEX.test(line) && !isWcagReducedMotionOverride) {
      findings.push({
        ruleId: "NTA-C001",
        category: "CSS_NITPICK",
        severity: "MEDIUM",
        file,
        line: lineNum,
        message: "CSS !important override indicates broken specificity hierarchy.",
        evidence: line.trim(),
        subagent: "CssAndUiInquisitor",
      });
    }

    const trimmed = line.trim();
    const isCustomPropDef = trimmed.startsWith("--");
    if (!isCustomPropDef && HEX_OR_RGB_COLOR_REGEX.test(line)) {
      findings.push({
        ruleId: "NTA-C002",
        category: "CSS_NITPICK",
        severity: "NITPICK",
        file,
        line: lineNum,
        message: "Hardcoded color literal outside CSS custom property (--token); use a design token.",
        evidence: trimmed,
        subagent: "CssAndUiInquisitor",
      });
    }

    const zMatch = Z_INDEX_REGEX.exec(line);
    if (zMatch) {
      const zVal = Number(zMatch[1] ?? "0");
      if (zVal >= 100) {
        findings.push({
          ruleId: "NTA-C003",
          category: "CSS_NITPICK",
          severity: "MEDIUM",
          file,
          line: lineNum,
          message: `Arbitrary magic z-index (${zVal}) causes stacking context wars.`,
          evidence: trimmed,
          subagent: "CssAndUiInquisitor",
        });
      }
    }

    if (OUTLINE_NONE_REGEX.test(line)) {
      const ruleWindow = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 4)).join("\n");
      const hasReplacementFocusRing = /\bbox-shadow\s*:|\bborder(?:-color|-width)?\s*:/.test(
        ruleWindow
      );
      if (!hasReplacementFocusRing) {
        findings.push({
          ruleId: "NTA-C006",
          category: "CSS_NITPICK",
          severity: "HIGH",
          file,
          line: lineNum,
          message: "Removing focus outline (outline: none/0) destroys keyboard accessibility.",
          evidence: trimmed,
          subagent: "CssAndUiInquisitor",
        });
      }
    }

    const propMatch = CSS_PROP_LINE_REGEX.exec(line);
    if (propMatch) {
      const propName = propMatch[1]?.toLowerCase() ?? "";
      if (propName && !propName.startsWith("--")) {
        const prevLine = currentBlockProps.get(propName);
        if (prevLine !== undefined) {
          findings.push({
            ruleId: "NTA-C005",
            category: "CSS_NITPICK",
            severity: "MEDIUM",
            file,
            line: lineNum,
            message: `Duplicate CSS property '${propName}' overwrites declaration at line ${prevLine}.`,
            evidence: trimmed,
            subagent: "CssAndUiInquisitor",
          });
        }
        currentBlockProps.set(propName, lineNum);
      }
    }

    if (line.includes("}")) {
      currentBlockProps.clear();
      if (inReducedMotionMedia && mediaBraceDepth <= 0) {
        inReducedMotionMedia = false;
      }
    }
  }

  return findings;
}
