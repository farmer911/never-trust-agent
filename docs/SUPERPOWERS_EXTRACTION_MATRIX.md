# Forensic Extraction Matrix: `obra/superpowers` → `NeverTrustAgent`

> **Audit Target:** [`https://github.com/obra/superpowers`](https://github.com/obra/superpowers) (`v7.0.1`)
> **Audit Philosophy:** `NOTHING IS PERFECT. EVERY AGENT IS AN ASSHOLE UNTIL PROVEN BY DETERMINISTIC EVIDENCE.`

---

## 1. Các Lỗ Hổng Chí Mạng Của Chính `obra/superpowers` (Bị NTA Loại Bỏ / Đập Đi Xây Lại)

Mặc dù `obra/superpowers` là một trong những bộ workflow/skill tốt nhất hiện có cho coding agents, khi soi dưới kính hiển vi kỹ thuật của **NeverTrustAgent**, bản thân nó vẫn mắc **4 lỗi thiết kế nghiêm trọng**:

| # | Lỗi trong `obra/superpowers` | Vị trí gốc | Tại sao đây là lỗ hổng kỹ thuật | Cách `NeverTrustAgent` xử lý |
| :- | :--- | :--- | :--- | :--- |
| **1** | **Bắt buộc khen ngợi (Mandatory Sycophancy Priming)** | `skills/requesting-code-review/code-reviewer.md#L98-L109`, `task-reviewer-prompt.md#L158-L172` | Bắt reviewer mở đầu bằng `### Strengths` vì *"accurate praise helps the implementer trust the rest of the feedback"*. Subagent không có cảm xúc; việc ép LLM sinh văn bản khen ngợi ở đầu response làm lệch phân phối xác suất token tiếp theo sang hướng tích cực (sycophancy priming), khiến nó nương tay với lỗi ở phần sau. | **XÓA SỔ hoàn toàn `### Strengths`.** Đưa thêm rule `NTA-E003`: bất kỳ report/review nào có mục `### Strengths` hoặc câu khen ngợi xã giao sẽ bị đánh rớt tự động. |
| **2** | **Tin mù quáng vào báo cáo test của Implementer** | `skills/subagent-driven-development/task-reviewer-prompt.md#L75-L76` | Viết: *"The implementer already ran the tests and reported results... Do not re-run the suite to confirm their report."* Nếu implementer bịa ra output test, chạy test trên 1 file rồi làm gãy file khác, hoặc sửa code *sau* khi chạy test, reviewer sẽ bị lừa hoàn toàn. | **ĐẢO NGƯỢC.** Thay thế niềm tin bằng `VerdictReceipt` (`SHA-256` của toàn bộ source files + exit code) qua [`evidence-verifier.ts`](file:///Users/phucnguyen/Dev/NeverTrustAgent/src/analyzers/evidence-verifier.ts). Sửa 1 byte sau khi chạy test -> mã băm lệch -> `NTA-E004` (`CRITICAL`). |
| **3** | **Quy tắc viết test chỉ nằm trên giấy (0% Static Enforcement)** | `skills/test-driven-development/writing-good-tests.md`, `condition-based-waiting.md` | Nêu rất đúng các tật xấu khi viết test (Mirror Assertion, Mock Existence Assertion, Arbitrary `setTimeout`), nhưng chỉ viết bằng văn xuôi Markdown. Khi agent lười, nó vẫn viết `expect(true).toBe(true)` hoặc `setTimeout(r, 50)`. | **Biến văn xuôi thành Code Tất Định.** Chuyển hóa toàn bộ thành các rule quét tự động `NTA-T001` đến `NTA-T007` trong [`test-fraud.ts`](file:///Users/phucnguyen/Dev/NeverTrustAgent/src/analyzers/test-fraud.ts). |
| **4** | **Trần tuân thủ của Prompt chỉ đạt 72%** | `skills/writing-skills/references/persuasion-principles.md#L7` | Chính tài liệu của `superpowers` trích dẫn nghiên cứu của Meincke et al. (2025): kỹ thuật thuyết phục trên prompt chỉ nâng tỷ lệ tuân thủ từ `33% → 72%`. Tức là **cứ 4 lần thì có hơn 1 lần (28%) agent vẫn lách luật**. | Bọc lớp Prompt bằng **Cổng Kiểm Chứng Tất Định (`nta` CLI + Receipt + Scripts)** trả về Exit Code `0/1` cứng. |

---

## 2. Danh Mục Tinh Hoa Đã Rút Trích & Nâng Cấp Vào `NeverTrustAgent`

### A. Chuyển hóa thành Bộ Máy Phân Tích Tĩnh (`src/analyzers/`)
1. **Từ `writing-good-tests.md` & `condition-based-waiting.md` → [`src/analyzers/test-fraud.ts`](file:///Users/phucnguyen/Dev/NeverTrustAgent/src/analyzers/test-fraud.ts):**
   - `NTA-T001`: Bắt sống khối `test()`/`it()` không có `expect`/`assert`.
   - `NTA-T002`: Bắt sống assertion tự đúng (`expect(true).toBe(true)`).
   - `NTA-T003`: Bắt sống hành vi trốn chạy bằng `.skip`, `.only`, `.todo`, `xit`, `xdescribe`.
   - `NTA-T004` (**Mirror Assertion** từ `writing-good-tests.md#L33-L35`): Bắt sống hành vi gọi chính hàm đang test để tính biến `expected` (`const expected = fn(x); expect(fn(x)).toBe(expected)`).
   - `NTA-T005` (**Mock Existence** từ `writing-good-tests.md#L83-L94`): Bắt sống hành vi kiểm tra sự tồn tại của mock (`getByTestId('...-mock')`) thay vì hành vi thật.
   - `NTA-T006` (**Arbitrary Sleep** từ `condition-based-waiting.md#L37-L38`): Bắt sống `setTimeout`/`Bun.sleep` trong file test mà không dùng cơ chế đợi theo điều kiện (`waitFor`).
   - `NTA-T007` (**Test Diff Sabotage**): Phân tích `git diff` để bắt sống hành vi xóa câu lệnh `expect()` trong test cũ nhằm ép pass.
2. **Từ `verification-before-completion` & `receiving-code-review` → [`src/analyzers/evidence-verifier.ts`](file:///Users/phucnguyen/Dev/NeverTrustAgent/src/analyzers/evidence-verifier.ts):**
   - `NTA-E001` & `NTA-E002`: Kiểm chứng sự tồn tại thực tế của file và số dòng trích dẫn (`file:line`).
   - `NTA-E003`: Quét ngôn ngữ báo cáo của agent để bắt sống các câu xu nịnh (`"You're absolutely right"`, `"Great point"`), mục khen ngợi (`### Strengths`), và các tuyên bố hoàn thành vô căn cứ (`"Should work now"`, `"Probably fixed"`).
   - `NTA-E004`: Băm `SHA-256` toàn bộ source tree để cấp và kiểm tra `VerdictReceipt`.

### B. Rút trích và Cứng hóa Bộ Script Điều Phối (`scripts/`)
1. **[`scripts/sdd-workspace`](file:///Users/phucnguyen/Dev/NeverTrustAgent/scripts/sdd-workspace)**: Tạo thư mục làm việc cô lập theo từng plan (`.nta/sdd/<plan-slug>/`) kèm file đánh dấu `plan-path` chống đụng độ tên file giữa các plan khác nhau, ngăn chặn lỗi đọc nhầm tiến độ cũ.
2. **[`scripts/task-brief`](file:///Users/phucnguyen/Dev/NeverTrustAgent/scripts/task-brief)**: Tách nội dung của riêng `Task N` bằng `awk` có nhận diện hàng rào code (` ``` `), giúp truyền đúng phạm vi task cho subagent mà không làm tràn context của controller.
3. **[`scripts/review-package`](file:///Users/phucnguyen/Dev/NeverTrustAgent/scripts/review-package)**: Kiểm tra tính hợp lệ của dải commit (`git merge-base --is-ancestor`, chặn diff rỗng với exit code `3`) và đóng gói commit log, diff stat, cùng `git diff -U10` vào một file bất biến để Inquisitor đọc 1 lần.
4. **[`scripts/find-polluter.sh`](file:///Users/phucnguyen/Dev/NeverTrustAgent/scripts/find-polluter.sh)**: Chạy cô lập từng file test để truy tìm chính xác bài test nào làm bẩn trạng thái hệ thống/file rác (đã nâng cấp để hỗ trợ `NTA_TEST_CMD`, mặc định `bun test`).

### C. Rút trích và Đột biến Bộ Giao Thức Đối Kháng (`prompts/`)
1. **[`prompts/inquisitor-task-reviewer.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/prompts/inquisitor-task-reviewer.md)**:
   - Giữ lại các nguyên lý sắc bén nhất của `superpowers`: *"Do Not Trust the Report"* (lý do biện minh trong report không bao giờ làm giảm mức độ lỗi), *"The Spec is a Vision Document / Silence is Not Permission"*, *"Plan-Mandated Defects Are Still Findings"*, và danh sách bắt buộc *"Declined to Judge"* (không được âm thầm bỏ qua bất kỳ hành vi nào).
   - Loại bỏ hoàn toàn mục khen ngợi `### Strengths`, thay bằng `### Deterministic Gate Status`.
2. **[`prompts/inquisitor-re-reviewer.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/prompts/inquisitor-re-reviewer.md)**:
   - Cơ chế **5-Round Fix Loop**: Vòng 1–3 dùng lại implementer cũ; Vòng 4–5 nâng cấp lên model mạnh hơn với context mới; Vòng 5 kích hoạt **Breaker Adjudication** và buộc phải công khai toàn bộ trong mục **"Rulings I made"** kèm cái giá phải trả nếu phán quyết sai (*"A ruling that dies with the workspace was a decision made in secret"*).
3. **[`prompts/implementer-strict.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/prompts/implementer-strict.md)**:
   - Hợp đồng trạng thái 4 mức (`DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`), cấm đoán mò khi vượt quá khả năng, bắt buộc đính kèm bằng chứng TDD (`RED`/`GREEN`) và mã băm `.nta/receipt.json`.
4. **[`prompts/session-forensics.md`](file:///Users/phucnguyen/Dev/NeverTrustAgent/prompts/session-forensics.md)**:
   - Rút trích từ `diagnosing-superpowers`: kỹ thuật truy ngược từ câu tuyên bố hoàn thành của agent về các lệnh gọi tool trong cùng turn để bắt quả tang báo cáo láo, và phát hiện lệch kế hoạch (plan drift) ngay sau sự kiện nén ngữ cảnh (context compaction).
