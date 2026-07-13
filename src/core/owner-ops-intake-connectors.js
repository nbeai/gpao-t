import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { buildOwnerOpsWorkflowPreview } from "./owner-ops.js";

const TEXT_EXTENSIONS = new Set([".csv", ".tsv", ".txt", ".md"]);
const TABLE_EXTENSIONS = new Set([".csv", ".tsv"]);
const EXCEL_EXTENSIONS = new Set([".xlsx", ".xls"]);
const MAX_BYTES = 200_000;
const MAX_ROWS = 50;
const MAX_FILES = 80;

export function buildOwnerOpsReadOnlyIntakePlan() {
  return {
    schema: "gpao_t.owner_ops_read_only_intake_plan.v0_1",
    status: "ready",
    purpose: "자영업자가 가진 리뷰, 문의, 예약 자료를 계정 연결 없이 안전하게 가져와 Owner Ops workflow preview로 연결한다.",
    documentRef: "docs/04-skill-ecosystem/OWNER-OPS-MCP-CONNECTOR-PLAN-ko.md",
    implementationScope: "paste_csv_tsv_text_file_folder_preview_excel_metadata_only",
    connectors: [
      {
        id: "paste_intake",
        label: "붙여넣기",
        allowed: ["text_classification", "workflow_preview"],
        blocked: ["browser_control", "external_send", "auto_reply"],
      },
      {
        id: "local_csv_tsv_file",
        label: "로컬 CSV/TSV 파일",
        allowed: ["file_read", "table_preview", "workflow_preview"],
        blocked: ["file_overwrite", "external_upload", "background_watch"],
      },
      {
        id: "local_excel_metadata",
        label: "로컬 Excel 파일",
        allowed: ["file_exists_check", "metadata_preview"],
        blocked: ["binary_parse_without_parser", "file_overwrite", "external_upload"],
      },
      {
        id: "local_folder_preview",
        label: "로컬 폴더 미리보기",
        allowed: ["folder_list", "candidate_file_preview"],
        blocked: ["background_watch", "file_move", "file_delete", "external_sync"],
      },
    ],
    authorityBoundary: {
      allowedNow: ["read_local_text_file", "parse_local_csv_tsv", "list_local_folder", "workflow_preview"],
      blockedNow: [
        "read_credentials",
        "oauth",
        "send_customer_message",
        "post_review_reply",
        "write_or_delete_source_file",
        "background_folder_watch",
      ],
    },
  };
}

export function previewOwnerOpsPasteIntake({ inputText = "", workflowType = "review_reply", businessType } = {}) {
  const text = String(inputText || "");
  const preview = buildOwnerOpsWorkflowPreview({ workflowType, inputText: text, businessType });
  return {
    schema: "gpao_t.owner_ops_paste_intake_preview.v0_1",
    status: text.trim() ? "ready" : "empty",
    connectorId: "paste_intake",
    input: {
      source: "manual_paste",
      lineCount: text.split(/\r?\n/).filter((line) => line.trim()).length,
      byteLength: Buffer.byteLength(text),
    },
    workflowPreview: preview,
    blockedActions: ["browser_control", "external_send", "auto_reply"],
  };
}

export function previewOwnerOpsTableTextIntake({
  content = "",
  filename = "owner-ops.csv",
  workflowType = "shopping_inquiry",
  businessType,
} = {}) {
  const extension = extname(filename).toLowerCase();
  const delimiter = extension === ".tsv" ? "\t" : ",";
  const rows = parseDelimitedRows(String(content || ""), delimiter).slice(0, MAX_ROWS);
  const text = rows.map((row) => row.join(" ")).join("\n");
  return {
    schema: "gpao_t.owner_ops_table_text_intake_preview.v0_1",
    status: rows.length ? "ready" : "empty",
    connectorId: "local_csv_tsv_file",
    filename,
    delimiter: delimiter === "\t" ? "tab" : "comma",
    rowCountPreviewed: rows.length,
    columnsPreviewed: rows[0]?.length || 0,
    sampleRows: rows.slice(0, 5),
    workflowPreview: buildOwnerOpsWorkflowPreview({ workflowType, inputText: text, businessType }),
    blockedActions: ["file_overwrite", "external_upload", "background_watch"],
  };
}

export function previewOwnerOpsLocalFileIntake({
  filePath,
  root = process.cwd(),
  workflowType,
  businessType,
} = {}) {
  const resolved = resolve(root, filePath || "");
  if (!filePath || !existsSync(resolved)) {
    return blockedFilePreview({ filePath, reason: "file_not_found" });
  }
  const stats = statSync(resolved);
  const extension = extname(resolved).toLowerCase();
  if (!stats.isFile()) {
    return blockedFilePreview({ filePath: resolved, reason: "not_a_file" });
  }
  if (stats.size > MAX_BYTES) {
    return blockedFilePreview({ filePath: resolved, reason: "file_too_large_for_v0_1_preview", size: stats.size });
  }
  if (EXCEL_EXTENSIONS.has(extension)) {
    return {
      schema: "gpao_t.owner_ops_local_file_intake_preview.v0_1",
      status: "metadata_only",
      connectorId: "local_excel_metadata",
      file: fileSummary(resolved, stats),
      reason: "xlsx_xls_binary_parser_not_enabled_in_v0_1",
      nextSafeAction: "Export the sheet as CSV/TSV or enable a reviewed parser lane later.",
      blockedActions: ["binary_parse_without_parser", "file_overwrite", "external_upload"],
    };
  }
  if (!TEXT_EXTENSIONS.has(extension)) {
    return blockedFilePreview({ filePath: resolved, reason: "unsupported_extension", extension });
  }
  const content = readFileSync(resolved, "utf8");
  const workflow = workflowType || inferWorkflowFromFilename(resolved);
  if (TABLE_EXTENSIONS.has(extension)) {
    return {
      ...previewOwnerOpsTableTextIntake({
        content,
        filename: basename(resolved),
        workflowType: workflow,
        businessType,
      }),
      schema: "gpao_t.owner_ops_local_file_intake_preview.v0_1",
      file: fileSummary(resolved, stats),
    };
  }
  return {
    schema: "gpao_t.owner_ops_local_file_intake_preview.v0_1",
    status: "ready",
    connectorId: "local_text_file",
    file: fileSummary(resolved, stats),
    workflowPreview: buildOwnerOpsWorkflowPreview({
      workflowType: workflow,
      inputText: content,
      businessType,
    }),
    blockedActions: ["file_overwrite", "external_upload", "background_watch"],
  };
}

export function previewOwnerOpsFolderIntake({ folderPath, root = process.cwd() } = {}) {
  const resolved = resolve(root, folderPath || "");
  if (!folderPath || !existsSync(resolved)) {
    return {
      schema: "gpao_t.owner_ops_folder_intake_preview.v0_1",
      status: "blocked",
      connectorId: "local_folder_preview",
      reason: "folder_not_found",
      folderPath,
      blockedActions: ["background_watch", "file_move", "file_delete", "external_sync"],
    };
  }
  const stats = statSync(resolved);
  if (!stats.isDirectory()) {
    return {
      schema: "gpao_t.owner_ops_folder_intake_preview.v0_1",
      status: "blocked",
      connectorId: "local_folder_preview",
      reason: "not_a_folder",
      folderPath: resolved,
      blockedActions: ["background_watch", "file_move", "file_delete", "external_sync"],
    };
  }
  const files = readdirSync(resolved, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .slice(0, MAX_FILES)
    .map((entry) => {
      const fullPath = resolve(resolved, entry.name);
      const fileStats = statSync(fullPath);
      return {
        name: entry.name,
        extension: extname(entry.name).toLowerCase(),
        size: fileStats.size,
        intakeState: classifyFileForIntake(entry.name),
        suggestedWorkflow: inferWorkflowFromFilename(entry.name),
      };
    });
  return {
    schema: "gpao_t.owner_ops_folder_intake_preview.v0_1",
    status: "ready",
    connectorId: "local_folder_preview",
    folderPath: resolved,
    fileCountPreviewed: files.length,
    candidateFiles: files,
    blockedActions: ["background_watch", "file_move", "file_delete", "external_sync"],
    nextSafeAction: "Pick one candidate file and run local file intake preview.",
  };
}

export function verifyOwnerOpsReadOnlyIntakeConnectors({ root = process.cwd() } = {}) {
  const paste = previewOwnerOpsPasteIntake({
    inputText: "음식은 맛있었는데 대기 시간이 길었어요.",
    workflowType: "review_reply",
  });
  const table = previewOwnerOpsTableTextIntake({
    filename: "smartstore.csv",
    content: "문의,상태\n배송 언제 되나요?,신규\n교환 가능한가요?,신규",
  });
  const plan = buildOwnerOpsReadOnlyIntakePlan();
  const findings = [];
  if (plan.status !== "ready") findings.push("plan_not_ready");
  if (paste.status !== "ready") findings.push("paste_intake_not_ready");
  if (table.status !== "ready") findings.push("table_intake_not_ready");
  if (!plan.authorityBoundary.blockedNow.includes("send_customer_message")) {
    findings.push("customer_send_must_remain_blocked");
  }
  if (!plan.authorityBoundary.allowedNow.includes("parse_local_csv_tsv")) {
    findings.push("csv_tsv_parse_not_allowed");
  }
  return {
    schema: "gpao_t.owner_ops_read_only_intake_check.v0_1",
    status: findings.length ? "blocked" : "ready",
    findings,
    root,
    checkedConnectors: plan.connectors.map((connector) => connector.id),
    nextSafeAction: findings.length
      ? "Fix read-only intake findings before adding host registration."
      : "Connect these previews to MCP tools and first owner-facing scenario fixtures.",
  };
}

function blockedFilePreview({ filePath, reason, size, extension } = {}) {
  return {
    schema: "gpao_t.owner_ops_local_file_intake_preview.v0_1",
    status: "blocked",
    connectorId: "local_file_read",
    filePath,
    reason,
    size,
    extension,
    blockedActions: ["file_overwrite", "external_upload", "background_watch"],
  };
}

function fileSummary(filePath, stats) {
  return {
    path: filePath,
    name: basename(filePath),
    extension: extname(filePath).toLowerCase(),
    size: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

function parseDelimitedRows(content, delimiter) {
  return String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => splitDelimitedLine(line, delimiter));
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function classifyFileForIntake(filename) {
  const extension = extname(filename).toLowerCase();
  if (TABLE_EXTENSIONS.has(extension)) return "ready_for_table_preview";
  if (TEXT_EXTENSIONS.has(extension)) return "ready_for_text_preview";
  if (EXCEL_EXTENSIONS.has(extension)) return "metadata_only_export_csv_recommended";
  return "unsupported";
}

function inferWorkflowFromFilename(filename) {
  const text = String(filename || "").toLowerCase();
  if (/배송|교환|환불|문의|smartstore|store|order/.test(text)) return "shopping_inquiry";
  if (/예약|reservation|booking|calendar/.test(text)) return "reservation_inquiry";
  return "review_reply";
}
