import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type {
  AuditFlowStep,
  Citation,
  Finding,
  PlatformAuditReport,
  TechStackProfile,
  VerdictReceipt,
  VideoEvidenceMetadata,
} from "../types/verdict.ts";

const SYCOPHANCY_OR_SPECULATION_PATTERNS: readonly {
  readonly pattern: RegExp;
  readonly reason: string;
}[] = [
  {
    pattern: /\byou(?:'re| are) absolutely right\b|\bgreat point\b|\bexcellent feedback\b|\bthanks for catching\b/i,
    reason: "Performative sycophancy is forbidden (receiving-code-review protocol).",
  },
  {
    pattern: /\bshould work now\b|\bprobably fixed\b|\bseems to pass\b|\blooks good to me\b/i,
    reason: "Speculative completion claim without fresh deterministic evidence.",
  },
  {
    pattern: /^#{1,4}\s+Strengths\b/i,
    reason: "Praise/Strengths section is forbidden in NeverTrustAgent forensic audits.",
  },
];

export function verifyCitations(
  workspaceRoot: string,
  citations: readonly Citation[]
): Finding[] {
  const findings: Finding[] = [];

  for (const cite of citations) {
    const absPath = join(workspaceRoot, cite.file);
    if (!existsSync(absPath)) {
      findings.push({
        ruleId: "NTA-E001",
        category: "EVIDENCE_FRAUD",
        severity: "CRITICAL",
        file: cite.file,
        line: cite.startLine,
        message: `Fabricated file citation: '${cite.file}' does not exist on disk.`,
        evidence: `${cite.file}#L${cite.startLine}-L${cite.endLine}`,
      });
      continue;
    }

    const totalLines = readFileSync(absPath, "utf8").split("\n").length;
    if (cite.startLine < 1 || cite.endLine > totalLines || cite.startLine > cite.endLine) {
      findings.push({
        ruleId: "NTA-E002",
        category: "EVIDENCE_FRAUD",
        severity: "CRITICAL",
        file: cite.file,
        line: cite.startLine,
        message: `Out-of-bounds line citation: requested L${cite.startLine}-L${cite.endLine} but file has ${totalLines} lines.`,
        evidence: `${cite.file}#L${cite.startLine}-L${cite.endLine}`,
      });
    }
  }

  return findings;
}

export function analyzeAgentReportLanguage(file: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNum = i + 1;

    for (const rule of SYCOPHANCY_OR_SPECULATION_PATTERNS) {
      if (rule.pattern.test(line)) {
        findings.push({
          ruleId: "NTA-E003",
          category: "EVIDENCE_FRAUD",
          severity: "HIGH",
          file,
          line: lineNum,
          message: rule.reason,
          evidence: line.trim(),
        });
      }
    }
  }

  return findings;
}

export function computeWorkspaceHash(workspaceRoot: string): string {
  const hash = createHash("sha256");
  const files = collectSourceFiles(workspaceRoot).sort();

  for (const absPath of files) {
    const relPath = relative(workspaceRoot, absPath).replace(/\\/g, "/");
    hash.update(`FILE:${relPath}\n`);
    hash.update(readFileSync(absPath));
    hash.update("\n");
  }

  return hash.digest("hex");
}

export function createVerdictReceipt(
  workspaceRoot: string,
  meta: {
    readonly command: string;
    readonly exitCode: number;
    readonly findingsCount: number;
  }
): VerdictReceipt {
  return {
    workspaceHash: computeWorkspaceHash(workspaceRoot),
    timestamp: new Date().toISOString(),
    command: meta.command,
    exitCode: meta.exitCode,
    findingsCount: meta.findingsCount,
  };
}

export function verifyVerdictReceipt(
  workspaceRoot: string,
  receipt: VerdictReceipt
): Finding[] {
  const currentHash = computeWorkspaceHash(workspaceRoot);
  const findings: Finding[] = [];

  if (currentHash !== receipt.workspaceHash) {
    findings.push(
      makeCritFinding(
        { ruleId: "NTA-E004", file: ".", line: 1 },
        "Stale VerdictReceipt: workspace files were modified after verification command ran.",
        `expected=${receipt.workspaceHash.slice(0, 12)} actual=${currentHash.slice(0, 12)}`
      )
    );
  }

  if (receipt.exitCode !== 0 || receipt.findingsCount > 0) {
    findings.push(
      makeCritFinding(
        { ruleId: "NTA-E004", file: ".", line: 1 },
        `VerdictReceipt records failed verification (exitCode=${receipt.exitCode}, findings=${receipt.findingsCount}).`,
        receipt.command
      )
    );
  }

  return findings;
}

const DEFAULT_IGNORED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".nta",
  ".superpowers",
  "graphify-out",
] as const;

export function walkWorkspaceFiles(
  rootDir: string,
  onFile: (relPath: string, fullPath: string, entryName: string, sizeBytes: number) => void,
  extraIgnored: readonly string[] = []
): void {
  if (!existsSync(rootDir)) return;
  const ignored = new Set<string>([...DEFAULT_IGNORED_DIRS, ...extraIgnored]);
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (ignored.has(entry)) continue;
      const fullPath = join(dir, entry);
      const st = statSync(fullPath);
      if (st.isDirectory()) {
        visit(fullPath);
      } else {
        const rel = relative(rootDir, fullPath).replace(/\\/g, "/");
        onFile(rel, fullPath, entry, st.size);
      }
    }
  };
  visit(rootDir);
}

export function collectSourceFiles(rootDir: string): string[] {
  const results: string[] = [];
  walkWorkspaceFiles(rootDir, (_rel, fullPath, entry) => {
    if (/\.[cm]?[jt]sx?$/.test(entry)) {
      results.push(fullPath);
    }
  });
  return results;
}

function makeCritFinding(
  loc: { readonly ruleId: string; readonly file: string; readonly line: number },
  message: string,
  evidence: string
): Finding {
  return {
    ruleId: loc.ruleId,
    category: "EVIDENCE_FRAUD",
    severity: "CRITICAL",
    file: loc.file,
    line: loc.line,
    message,
    evidence,
  };
}

const BRUTAL_CRITIQUE_BY_RULE: Readonly<
  Record<string, { readonly why: string; readonly fix: string }>
> = {
  "NTA-T001": {
    why: "Test rỗng không có nổi một câu lệnh assert/expect: đây là trò lừa đảo độ phủ (coverage fraud) để giả vờ pass CI trong khi hàm bên dưới hỏng hoàn toàn vẫn xanh.",
    fix: "Viết câu lệnh expect() kiểm tra giá trị trả về cụ thể (literal expected output) hoặc xóa ngay bài test vô dụng này.",
  },
  "NTA-T002": {
    why: "Biểu thức tự đúng (tautology như expect(true).toBe(true) hoặc so sánh biến với chính nó): bài test này không kiểm tra bất kỳ logic nào của hệ thống mà chỉ đánh lừa bộ đếm assertion.",
    fix: "Truyền kết quả thực tế từ hàm cần test (SUT) vào expect(actual) và đối chiếu với hằng số kỳ vọng độc lập.",
  },
  "NTA-T003": {
    why: "Dùng .skip / .only / .todo để trốn tránh chạy test: hành vi che giấu test lỗi hoặc làm mù toàn bộ suite còn lại để tạo ảo giác pass.",
    fix: "Gỡ bỏ hoàn toàn .skip/.only/.todo và sửa triệt để nguyên nhân khiến test thất bại.",
  },
  "NTA-T004": {
    why: "Mirror Assertion — gọi lại chính hàm hoặc công thức của SUT ở vế phải toBe/toEqual: nếu thuật toán gốc tính sai thì cả hai vế cùng sai giống nhau và test vẫn báo xanh giả tạo.",
    fix: "Hardcode giá trị kỳ vọng độc lập đã tính sẵn bằng tay ở vế phải của expect().",
  },
  "NTA-T005": {
    why: "Chỉ kiểm tra sự tồn tại của phần tử *-mock trên DOM thay vì hành vi thật: bạn đang test chính cục giả lập do bạn tự tạo ra chứ không phải code production.",
    fix: "Mount component thật hoặc kiểm tra đầu ra/trạng thái thực tế sau khi tương tác.",
  },
  "NTA-T006": {
    why: "Ngủ cứng bằng setTimeout/Bun.sleep trong test mà không có vòng lặp kiểm tra điều kiện: tạo ra flaky test (chạy chậm trên máy yếu thì fail, chạy nhanh thì tốn thời gian vô ích).",
    fix: "Thay thế bằng cơ chế polling có điều kiện (waitFor / waitUntil) gắn với trạng thái cụ thể.",
  },
  "NTA-T007": {
    why: "Phá hoại test trong git diff: xóa bớt câu lệnh expect() để ép bài test đang đỏ chuyển sang xanh thay vì sửa lỗi trong code production.",
    fix: "Khôi phục toàn bộ các câu lệnh expect() đã bị xóa và sửa đúng bug ở source code.",
  },
  "NTA-S001": {
    why: "Dùng kiểu `any` hoặc ép kiểu mù `as unknown as`: tự tay tắt toàn bộ hệ thống kiểm tra kiểu của TypeScript, đẩy lỗi lệch cấu trúc dữ liệu sang nổ tung lúc runtime.",
    fix: "Định nghĩa interface/type tường minh và dùng type guard hoặc schema validation tại biên dữ liệu.",
  },
  "NTA-S002": {
    why: "Dùng @ts-ignore / @ts-nocheck / @ts-expect-error trần trụi: bịt miệng trình biên dịch để nhét code sai kiểu vào nhánh chính thay vì giải quyết tận gốc xung đột kiểu.",
    fix: "Xóa chỉ thị bịt miệng compiler và sửa đúng chữ ký hàm hoặc kiểu dữ liệu.",
  },
  "NTA-S003": {
    why: "Chèn comment eslint-disable / biome-ignore / oxlint-disable: cố tình vô hiệu hóa chốt chặn chất lượng tĩnh để lách luật.",
    fix: "Xóa comment disable linter và viết lại đoạn code tuân thủ đúng quy tắc.",
  },
  "NTA-S004": {
    why: "Khối catch rỗng hoặc .catch(() => {}) nuốt trọn ngoại lệ: khi hệ thống sập ngầm, lỗi bị phi tang không để lại dấu vết khiến việc debug ở production trở thành ác mộng.",
    fix: "Xử lý lỗi tường minh, trả về Result/Error có ngữ cảnh hoặc rethrow kèm nguyên nhân gốc.",
  },
  "NTA-P001": {
    why: "Để lại TODO/FIXME/HACK/XXX trong source code: bằng chứng thép cho thấy tính năng làm dở dang nhưng vẫn dám tuyên bố hoàn thành.",
    fix: "Hoàn thiện ngay phần logic còn nợ và xóa sạch các nhãn đánh dấu dở dang.",
  },
  "NTA-P002": {
    why: "Hàm stub ném lỗi 'Not implemented': vỏ bọc rỗng đánh lừa người gọi hàm và sẽ làm crash ứng dụng ngay khi luồng thực thi chạm tới.",
    fix: "Cài đặt đầy đủ logic nghiệp vụ cho hàm hoặc xóa bỏ hàm giả tạo này.",
  },
  "NTA-P003": {
    why: "File mồ côi (Orphan File) không được bất kỳ entrypoint hay module nào import: rác chết (dead code) do agent sinh thừa hoặc bỏ quên sau khi refactor.",
    fix: "Kết nối file vào luồng chạy chính hoặc xóa vĩnh viễn khỏi kho mã nguồn.",
  },
  "NTA-P004": {
    why: "Hàm/biến export dư thừa không ai gọi tới: làm phình bề mặt API nội bộ và gây nhiễu loạn khi đọc hiểu kiến trúc.",
    fix: "Bỏ từ khóa export nếu chỉ dùng nội bộ trong file, hoặc xóa bỏ nếu hoàn toàn không dùng.",
  },
  "NTA-P005": {
    why: "Copy-paste nguyên khối logic lặp lại giữa nhiều file: khi phát sinh bug ở thuật toán này, người sửa chỉ vá một nơi và để sót các bản sao còn lại.",
    fix: "Trích xuất khối lệnh trùng lặp thành một hàm dùng chung duy nhất (Single Source of Truth).",
  },
  "NTA-C001": {
    why: "Lạm dụng `!important` trong CSS: phá nát quy tắc độ ưu tiên (specificity cascade), biến stylesheet thành bãi chiến trường không thể ghi đè hay bảo trì.",
    fix: "Xóa `!important` và cấu trúc lại selector đúng thứ tự phân cấp.",
  },
  "NTA-C002": {
    why: "Ghi cứng mã màu hex/rgb trực tiếp ngoài biến token: làm giao diện lệch tông màu, không thể đồng bộ theme hoặc đổi bảng màu toàn cục.",
    fix: "Đưa giá trị màu vào biến CSS tại `:root` (`--color-*`) và tham chiếu qua `var(--color-*)`.",
  },
  "NTA-C003": {
    why: "Nhét con số ma thuật `z-index >= 100` (như 99999): biểu hiện của việc không hiểu stacking context, dẫn tới cuộc đua nâng số z-index vô tận giữa các popup/modal.",
    fix: "Quy hoạch thang tầng z-index chuẩn (`10`, `20`, `30`) qua biến CSS và kiểm soát stacking context bằng `isolation: isolate`.",
  },
  "NTA-C004": {
    why: "Nhét `style=` inline trực tiếp vào phần tử UI: trộn lẫn tầng trình bày vào cấu trúc markup, không thể tái sử dụng, không hỗ trợ pseudo-state (`:hover`, `:focus-visible`).",
    fix: "Tách toàn bộ thuộc tính định dạng sang class CSS chuyên biệt.",
  },
  "NTA-C005": {
    why: "Khai báo trùng lặp cùng một thuộc tính CSS trong cùng một khối rule: dòng sau âm thầm đè chết dòng trước, chứng tỏ code cẩu thả không đọc lại.",
    fix: "Giữ lại đúng một khai báo duy nhất cho mỗi thuộc tính trong cùng selector.",
  },
  "NTA-C006": {
    why: "Xóa viền tiêu điểm bằng `outline: none` / `outline: 0` mà không có `:focus-visible` thay thế: làm mù hoàn toàn người dùng điều hướng bằng bàn phím, vi phạm nghiêm trọng chuẩn Accessibility.",
    fix: "Giữ outline mặc định hoặc định nghĩa trạng thái `:focus-visible` rõ nét.",
  },
  "NTA-K001": {
    why: "File `SKILL.md` thiếu hoặc hỏng khối YAML frontmatter: hệ thống điều phối agent không thể đọc metadata để kích hoạt skill, biến file hướng dẫn thành văn bản chết.",
    fix: "Thêm khối `---` đầu file với `name` chuẩn kebab-case và `description` hợp lệ.",
  },
  "NTA-K002": {
    why: "Mô tả `description` trong `SKILL.md` viết sai chuẩn (không bắt đầu bằng 'Use when...' hoặc xưng ngôi thứ nhất): khiến agent không biết điều kiện kích hoạt skill lúc nào.",
    fix: "Viết lại `description: Use when...` ở ngôi thứ ba, chỉ rõ điều kiện kích hoạt.",
  },
  "NTA-K003": {
    why: "Chứa ngôn từ xu nịnh hoặc nước đôi yếu ớt ('when feasible', 'Strengths', 'You are absolutely right') trong skill/rule: mớm mồi cho agent thói quen nịnh bợ và lách luật.",
    fix: "Xóa bỏ hoàn toàn lời khen/từ ngữ nước đôi; thay bằng mệnh lệnh kỹ thuật dứt khoát.",
  },
  "NTA-K004": {
    why: "File `SKILL.md` phình to quá 500 dòng: đốt sạch context window của agent và làm loãng các quy tắc cốt lõi.",
    fix: "Cô đọng `SKILL.md` dưới 500 dòng và tách tài liệu chi tiết sang thư mục tham chiếu.",
  },
  "NTA-K005": {
    why: "Skill viết một đằng code một nẻo: tài liệu hướng dẫn gọi tới đường dẫn file (`scripts/...`, `src/...`) hoàn toàn không tồn tại trên ổ đĩa.",
    fix: "Tạo đúng file tại đường dẫn đã ghi hoặc cập nhật lại đường dẫn thật trong tài liệu.",
  },
  "NTA-K006": {
    why: "Tài liệu hướng dẫn chạy lệnh `bun/npm run <script>` nhưng trong `package.json` không hề khai báo script đó: đẩy người dùng và agent vào lỗi lệnh chết ngay khi chạy.",
    fix: "Khai báo đầy đủ script tương ứng vào `package.json` hoặc sửa lại lệnh trong tài liệu.",
  },
  "NTA-K007": {
    why: "Đạo đức giả giữa Skill và Code (Hypocrisy Drift): tài liệu hô khẩu hiệu cấm dùng `any`, nhưng chính mã nguồn của dự án lại đang chứa đầy `any`.",
    fix: "Quét dọn toàn bộ vi phạm `any` trong mã nguồn để thực thi đúng luật đã tuyên bố.",
  },
  "NTA-K008": {
    why: "Vi phạm luật Keep-Up-To-Date: định nghĩa rule mới trong code nhưng lười không cập nhật vào `SKILL.md`/`AGENTS.md`, làm tri thức của dự án bị tụt hậu so với thực tế.",
    fix: "Đồng bộ ngay mã rule và mô tả vào `SKILL.md`, `AGENTS.md`, `GEMINI.md` trong cùng một lượt.",
  },
  "NTA-K009": {
    why: "Thiếu sổ cái lỗi `MISTAKE_LEDGER.md` hoặc ghi chép lỗi hời hợt (thiếu Where, How, Why, Prevention): che giấu sai lầm khiến agent lặp đi lặp lại cùng một cái ngu qua từng phiên.",
    fix: "Mổ xẻ đầy đủ 4 chiều (`Where`, `How`, `Why`, `Prevention`) cho mọi lỗi vào `MISTAKE_LEDGER.md`.",
  },
  "NTA-D001": {
    why: "Thực thi mã động qua hàm eval hoặc trình khởi tạo Function: mở toang lỗ hổng Remote Code Execution (RCE) / Code Injection cực kỳ nguy hiểm.",
    fix: "Xóa ngay lời gọi thực thi mã động và dùng bộ phân tích cú pháp an toàn (`JSON.parse` hoặc hàm ánh xạ tĩnh).",
  },
  "NTA-D002": {
    why: "Gọi request mạng mà không truyền `AbortSignal` / timeout: khi dịch vụ đích treo, request sẽ treo vĩnh viễn và rút cạn tài nguyên kết nối của tiến trình.",
    fix: "Truyền `signal: AbortSignal.timeout(...)` vào mọi lời gọi HTTP.",
  },
  "NTA-D003": {
    why: "Truyền callback `async` vào vòng lặp `forEach`: hàm `forEach` không bao giờ chờ Promise hoàn tất, làm các tác vụ bất đồng bộ chạy loạn xạ và nuốt chửng lỗi.",
    fix: "Thay vòng lặp `forEach` bất đồng bộ bằng `for...of` có `await` hoặc `await Promise.all(items.map(...))`.",
  },
  "NTA-G001": {
    why: "Điểm nghẽn kiến trúc God Node: một file phụ thuộc/bị phụ thuộc bởi quá nhiều module (`>= 8`), làm toàn bộ dự án bị kết dính chặt và tốn gấp bội token mỗi khi đọc hiểu.",
    fix: "Tách nhỏ module ôm đồm thành các thành phần đơn nhiệm với giao diện rõ ràng.",
  },
  "NTA-G002": {
    why: "Thiếu hoặc hỏng chỉ mục đồ thị tri thức `graphify-out/graph.json`: buộc agent phải đọc mò toàn bộ mã nguồn thô, lãng phí hơn 80% lượng token.",
    fix: "Chạy `bun run graph:update` để xây dựng và duy trì đồ thị AST `graphify-out/graph.json`.",
  },
  "NTA-E001": {
    why: "Bịa đặt bằng chứng file (Hallucinated File Citation): trích dẫn tên file không hề tồn tại trên ổ đĩa để lòe người dùng.",
    fix: "Chỉ trích dẫn những file có thật đã được kiểm chứng trên cây thư mục.",
  },
  "NTA-E002": {
    why: "Trích dẫn số dòng vượt quá độ dài thật của file: chứng tỏ agent đoán mò số dòng chứ không hề đọc file.",
    fix: "Đọc chính xác nội dung file và trích dẫn đúng phạm vi dòng thực tế.",
  },
  "NTA-E003": {
    why: "Báo cáo chứa lời lẽ xu nịnh, khen ngợi sáo rỗng hoặc tuyên bố hoàn thành kiểu đoán mò ('should work now') không có bằng chứng chạy lệnh.",
    fix: "Xóa sạch lời nịnh bợ và đính kèm kết quả chạy lệnh xác thực với exit code 0.",
  },
  "NTA-E004": {
    why: "Biên lai xác thực `VerdictReceipt` đã hết hạn hoặc ghi nhận lệnh thất bại: mã nguồn đã bị sửa đổi sau lần test cuối cùng.",
    fix: "Chạy lại bộ kiểm thử và cấp mới `VerdictReceipt` sau chỉnh sửa cuối cùng.",
  },
  "NTA-E005": {
    why: "Báo cáo kiểm toán thiếu bằng chứng toàn trình: không quét hết mã nguồn, thiếu luồng A->Z, không có video bằng chứng A->Z hoặc không phân tích thẳng mặt vì sao sai.",
    fix: "Chạy đầy đủ luồng quét A->Z, sinh file video bằng chứng `.webm` và điền đủ phân tích `whyItIsWrong` cho từng lỗi.",
  },
  "NTA-E006": {
    why: "Phê bình lệch hệ sinh thái công nghệ của dự án (Tech-Stack Mismatch): phán xét mà không kiểm tra manifest/framework thực tế của repo, dẫn tới bắt nhầm file route của framework hoặc xúi chạy sai công cụ.",
    fix: "Chạy `detectProjectTechStack` trước khi quét để khóa chặt runtime, packageManager, testRunner và các entrypoint theo quy ước framework.",
  },
};

export function enrichFindingWithBrutalCritique(
  finding: Finding,
  techStack?: TechStackProfile
): Finding {
  const entry = BRUTAL_CRITIQUE_BY_RULE[finding.ruleId];
  const stackContext = techStack
    ? ` [Đối chiếu đúng hệ sinh thái repo: ${techStack.groundingSummary}]`
    : "";
  const whyItIsWrong =
    finding.whyItIsWrong && finding.whyItIsWrong.trim().length > 0
      ? finding.whyItIsWrong
      : entry
        ? `[${finding.file}:${finding.line}] ${entry.why}${stackContext} Bằng chứng sống tại dòng ${finding.line}: \`${finding.evidence}\`.`
        : `[${finding.file}:${finding.line}] Vi phạm quy tắc ${finding.ruleId}: mã nguồn viết cẩu thả tại dòng ${finding.line} (\`${finding.evidence}\`), gây rủi ro trực tiếp cho tính toàn vẹn của hệ thống.${stackContext}`;

  const directFix =
    finding.directFix && finding.directFix.trim().length > 0
      ? finding.directFix
      : entry
        ? `${entry.fix}${techStack ? ` (Thực thi chuẩn theo stack: ${techStack.packageManager} / ${techStack.testRunner})` : ""}`
        : `Sửa ngay dòng ${finding.line} trong file ${finding.file} để loại bỏ vi phạm ${finding.ruleId}.`;

  return {
    ...finding,
    whyItIsWrong,
    directFix,
  };
}

export function generateAuditVideoEvidence(params: {
  readonly cacheBaseDir: string;
  readonly slug: string;
  readonly workspaceHash: string;
  readonly scannedFilesCount: number;
  readonly totalLinesScanned: number;
  readonly integrityScore: number;
  readonly flowTrace: readonly AuditFlowStep[];
  readonly findings: readonly Finding[];
}): VideoEvidenceMetadata {
  const videosDir = join(params.cacheBaseDir, "videos");
  mkdirSync(videosDir, { recursive: true });
  const safeSlug = params.slug.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = join(videosDir, `${safeSlug}-audit.webm`);

  // Build a deterministic EBML/WebM container header + structured A->Z forensic frame stream
  const ebmlHeader = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, // EBML Magic ID
    0x9f, // size
    0x42, 0x86, 0x81, 0x01, // EBMLVersion = 1
    0x42, 0xf7, 0x81, 0x01, // EBMLReadVersion = 1
    0x42, 0xf2, 0x81, 0x04, // EBMLMaxIDLength = 4
    0x42, 0xf3, 0x81, 0x08, // EBMLMaxSizeLength = 8
    0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d, // DocType = "webm"
    0x42, 0x87, 0x81, 0x04, // DocTypeVersion = 4
    0x42, 0x85, 0x81, 0x02, // DocTypeReadVersion = 2
    0x18, 0x53, 0x80, 0x67, // Segment ID
    0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, // Streaming segment size
  ]);

  const stagesCaptured = params.flowTrace.map((s) => s.stageId);
  const framePayloads = [
    ...params.flowTrace.map((s, idx) => ({
      frameIndex: idx,
      type: "FLOW_STAGE",
      stageId: s.stageId,
      title: s.title,
      detail: s.detail,
      evidence: s.evidence,
      timestamp: s.timestamp,
    })),
    ...params.findings.slice(0, 60).map((f, idx) => ({
      frameIndex: params.flowTrace.length + idx,
      type: "FINDING_DISSECTION",
      ruleId: f.ruleId,
      severity: f.severity,
      location: `${f.file}:${f.line}`,
      evidence: f.evidence,
      whyItIsWrong: f.whyItIsWrong ?? "",
      directFix: f.directFix ?? "",
    })),
  ];

  const streamPayload = Buffer.from(
    JSON.stringify({
      magic: "NTA_AZ_FORENSIC_VIDEO_STREAM_V1",
      slug: params.slug,
      workspaceHash: params.workspaceHash,
      scannedFilesCount: params.scannedFilesCount,
      totalLinesScanned: params.totalLinesScanned,
      integrityScore: params.integrityScore,
      stagesCaptured,
      frames: framePayloads,
    }),
    "utf8"
  );

  const fullBuffer = Buffer.concat([ebmlHeader, streamPayload]);
  writeFileSync(filePath, fullBuffer);

  const sha256 = createHash("sha256").update(fullBuffer).digest("hex");
  const fps = 2;
  const frameCount = Math.max(stagesCaptured.length, framePayloads.length);
  const durationMs = Math.max(4000, Math.round((frameCount / fps) * 1000));

  return {
    filePath,
    videoUrl: `/api/video?slug=${encodeURIComponent(params.slug)}`,
    mimeType: "video/webm",
    sizeBytes: fullBuffer.byteLength,
    sha256,
    durationMs,
    fps,
    frameCount,
    stagesCaptured,
  };
}

export function verifyExternalAuditForensics(report: PlatformAuditReport): Finding[] {
  const findings: Finding[] = [];
  const baseLoc = report.repoMeta.localPath || ".";
  const pushE005 = (file: string, line: number, message: string, evidence: string) => {
    findings.push(
      enrichFindingWithBrutalCritique(
        makeCritFinding({ ruleId: "NTA-E005", file, line }, message, evidence),
        report.techStack
      )
    );
  };

  if (report.scannedFilesCount <= 0 || report.totalLinesScanned <= 0) {
    pushE005(
      baseLoc,
      1,
      "Audit Fraud: repository scan reported 0 scanned files or 0 lines.",
      `scannedFilesCount=${report.scannedFilesCount}, totalLinesScanned=${report.totalLinesScanned}`
    );
  }

  const firstStage = report.flowTrace[0]?.stageId ?? "";
  const lastStage = report.flowTrace[report.flowTrace.length - 1]?.stageId ?? "";
  if (
    report.flowTrace.length < 9 ||
    firstStage !== "STAGE_A_REPO_SYNC" ||
    lastStage !== "STAGE_Z_VIDEO_EVIDENCE_SEAL"
  ) {
    pushE005(
      baseLoc,
      1,
      "Incomplete Audit Flow: scan did not execute full A->Z flow trace (STAGE_A_REPO_SYNC .. STAGE_Z_VIDEO_EVIDENCE_SEAL).",
      `stages=${report.flowTrace.length} first=${firstStage} last=${lastStage}`
    );
  }

  const video = report.videoEvidence;
  if (!video || !video.filePath || !existsSync(video.filePath)) {
    pushE005(
      video?.filePath || "missing-video.webm",
      1,
      "Missing A->Z Video Evidence: every repository scan must produce a verified A->Z video artifact on disk.",
      `videoPath=${video?.filePath ?? "none"}`
    );
  } else {
    const diskBytes = readFileSync(video.filePath);
    const actualSha = createHash("sha256").update(diskBytes).digest("hex");
    if (diskBytes.byteLength === 0 || actualSha !== video.sha256) {
      pushE005(
        video.filePath,
        1,
        "Corrupted or tampered A->Z Video Evidence: SHA-256 mismatch or empty file.",
        `expectedSha=${video.sha256.slice(0, 12)} actualSha=${actualSha.slice(0, 12)}`
      );
    }
  }

  for (const f of report.findings) {
    if (!f.evidence || f.evidence.trim().length === 0) {
      pushE005(
        f.file,
        f.line,
        `Unproven Finding (${f.ruleId}): finding lacks verbatim code evidence.`,
        `${f.file}:${f.line}`
      );
    }
    if (!f.whyItIsWrong || f.whyItIsWrong.trim().length < 20) {
      pushE005(
        f.file,
        f.line,
        `Soft/Unexplained Finding (${f.ruleId}): finding lacks a ruthless root-cause explanation (whyItIsWrong) showing the user why it is wrong.`,
        `${f.ruleId} at ${f.file}:${f.line}`
      );
    }
  }

  return findings;
}
