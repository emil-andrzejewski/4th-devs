/**
 * Native tools for sendit task.
 *
 * Focus:
 * - HTTP download to local cache
 * - selective local reads (lines/sections/TOC)
 * - include extraction
 * - image understanding (vision)
 * - verify submission with artifact persistence
 */

import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { hub, paths, task } from "../config.js";
import { vision } from "./vision.js";
import log from "../helpers/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "../..");

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 700;

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const normalizeSlashes = (value) => value.replaceAll("\\", "/");

const isPathInsideProject = (absolutePath) => {
  const normalizedRoot = PROJECT_ROOT.endsWith(sep) ? PROJECT_ROOT : `${PROJECT_ROOT}${sep}`;
  return absolutePath === PROJECT_ROOT || absolutePath.startsWith(normalizedRoot);
};

const resolveProjectPath = (userPath) => {
  if (typeof userPath !== "string" || !userPath.trim()) {
    throw new Error("Path must be a non-empty string");
  }

  const absolutePath = resolve(PROJECT_ROOT, userPath);
  if (!isPathInsideProject(absolutePath)) {
    throw new Error(`Path escapes project root: ${userPath}`);
  }

  return {
    absolutePath,
    relativePath: normalizeSlashes(relative(PROJECT_ROOT, absolutePath))
  };
};

const ensureParentDir = async (absolutePath) => {
  await mkdir(dirname(absolutePath), { recursive: true });
};

const toUtf8 = (buffer) => buffer.toString("utf8");

const splitLines = (text) => text.split(/\r?\n/);

const getMimeType = (filepath) => {
  const ext = extname(filepath).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp"
  };

  return mimeTypes[ext] || "application/octet-stream";
};

const parseRange = (value) => {
  const match = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(value ?? "");
  if (!match) return null;

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    return null;
  }

  return { start, end };
};

const normalizeHeading = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[`*_~[\](){}:;,.!?'"\\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isRetryableStatus = (status) => status === 429 || status >= 500;

const fetchWithRetry = async (url, options = {}) => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastError;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok && isRetryableStatus(response.status) && attempt < retries - 1) {
        await sleep(retryDelayMs * 2 ** attempt);
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt === retries - 1) {
        throw error;
      }

      await sleep(retryDelayMs * 2 ** attempt);
    }
  }

  throw lastError ?? new Error(`Request failed: ${url}`);
};

const hasLinePrefix = (line) => /^\s*\d+\.\s+\[[^\]]+\]\(#[^)]+\)\s*$/.test(line);

const parseMarkdownHeadings = (lines) => {
  const headings = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[index]);
    if (!match) continue;

    headings.push({
      line: index + 1,
      level: match[1].length,
      text: match[2].trim(),
      normalized: normalizeHeading(match[2])
    });
  }

  return headings;
};

const readSectionByHeading = (lines, headingName) => {
  const headings = parseMarkdownHeadings(lines);
  const target = normalizeHeading(headingName);
  const startHeading = headings.find((heading) =>
    heading.normalized === target
    || heading.normalized.includes(target)
    || target.includes(heading.normalized)
  );

  if (!startHeading) {
    throw new Error(`Heading not found: ${headingName}`);
  }

  const endHeading = headings.find((heading) =>
    heading.line > startHeading.line && heading.level <= startHeading.level
  );

  const startLine = startHeading.line;
  const endLine = endHeading ? endHeading.line - 1 : lines.length;
  const content = lines.slice(startLine - 1, endLine).join("\n");

  return {
    startLine,
    endLine,
    heading: startHeading.text,
    content
  };
};

const formatLineWindow = (lines, startLine, endLine) =>
  lines
    .slice(startLine - 1, endLine)
    .map((line, idx) => `${startLine + idx}: ${line}`)
    .join("\n");

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const tryParseJson = (value) => {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false, value };
  }
};

const parseIncludeTokens = (text) => {
  const includeRegex = /\[include\s+file="([^"]+)"\]/g;
  const linksRegex = /\[[^\]]+\]\(([^)]+)\)/g;
  const includeFiles = [];
  const linkTargets = [];

  let includeMatch = includeRegex.exec(text);
  while (includeMatch) {
    includeFiles.push(includeMatch[1]);
    includeMatch = includeRegex.exec(text);
  }

  let linkMatch = linksRegex.exec(text);
  while (linkMatch) {
    linkTargets.push(linkMatch[1]);
    linkMatch = linksRegex.exec(text);
  }

  return {
    include_files: [...new Set(includeFiles)],
    links: [...new Set(linkTargets)]
  };
};

const maybeResolveUrl = (baseUrl, target) => {
  if (!target) return null;

  try {
    return new URL(target, baseUrl).toString();
  } catch {
    return null;
  }
};

const pathExists = async (absolutePath) => {
  try {
    await access(absolutePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const submitVerifyRequest = async (payload) => {
  const response = await fetchWithRetry(hub.verifyEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();
  const parsed = tryParseJson(rawText);

  return {
    ok: response.ok,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: parsed.ok ? parsed.value : rawText
  };
};

export const nativeTools = [
  {
    type: "function",
    name: "http_download_to_file",
    description: "Download a file from HTTP(S) to a project-local path and return metadata. Use this before reading docs content.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "HTTP(S) URL to download." },
        local_path: { type: "string", description: "Destination path relative to project root, e.g. workspace/docs-cache/index.md." }
      },
      required: ["url", "local_path"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "read_file_lines",
    description: "Read only a specific line range from a local text file.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to project root." },
        start: { type: "integer", description: "1-based start line." },
        end: { type: "integer", description: "1-based end line (inclusive)." }
      },
      required: ["path", "start", "end"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "parse_markdown_toc",
    description: "Parse a markdown table of contents from selected lines and return structured entries.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to project root." },
        start_line: { type: "integer", description: "1-based start line for TOC scan. Default 17." },
        end_line: { type: "integer", description: "1-based end line for TOC scan. Default 30." }
      },
      required: ["path"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "read_markdown_section",
    description: "Read one markdown section by heading name or by explicit line range (e.g. '120-180').",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to project root." },
        heading_or_range: {
          type: "string",
          description: "Heading title (e.g. '9. TABELA OPŁAT I ROZLICZEŃ') or line range ('120-180')."
        }
      },
      required: ["path", "heading_or_range"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "extract_include_files",
    description: "Extract [include file=\"...\"] tokens and markdown links from local file text or raw text input.",
    parameters: {
      type: "object",
      properties: {
        path_or_text: { type: "string", description: "Either a local path or raw text content." },
        base_url: { type: "string", description: "Optional base URL for resolving relative include targets." }
      },
      required: ["path_or_text"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "understand_image",
    description: "Analyze a local image file with vision and answer a targeted question.",
    parameters: {
      type: "object",
      properties: {
        image_path: { type: "string", description: "Path to image relative to project root." },
        question: { type: "string", description: "Question about the image content." }
      },
      required: ["image_path", "question"],
      additionalProperties: false
    },
    strict: true
  },
  {
    type: "function",
    name: "submit_verify",
    description: "Submit final declaration to https://hub.ag3nts.org/verify and persist declaration/payload/response files.",
    parameters: {
      type: "object",
      properties: {
        declaration: { type: "string", description: "Full declaration text exactly matching template format." }
      },
      required: ["declaration"],
      additionalProperties: false
    },
    strict: true
  }
];

export const nativeHandlers = {
  async http_download_to_file({ url, local_path }) {
    if (!/^https?:\/\//i.test(url)) {
      throw new Error(`Only HTTP(S) URLs are allowed: ${url}`);
    }

    const { absolutePath, relativePath } = resolveProjectPath(local_path);
    await ensureParentDir(absolutePath);

    const response = await fetchWithRetry(url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}) for ${url}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(absolutePath, buffer);

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    log.success(`Downloaded ${url} -> ${relativePath}`);

    return {
      success: true,
      url,
      resolved_url: response.url,
      local_path: relativePath,
      status: response.status,
      content_type: contentType,
      bytes: buffer.length,
      sha256: sha256(buffer)
    };
  },

  async read_file_lines({ path, start, end }) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      throw new Error(`Invalid line range: ${start}-${end}`);
    }

    const { absolutePath, relativePath } = resolveProjectPath(path);
    const content = await readFile(absolutePath, "utf8");
    const lines = splitLines(content);
    const safeEnd = Math.min(end, lines.length);

    return {
      success: true,
      path: relativePath,
      start,
      end: safeEnd,
      total_lines: lines.length,
      line_count: safeEnd >= start ? safeEnd - start + 1 : 0,
      content: safeEnd >= start ? formatLineWindow(lines, start, safeEnd) : ""
    };
  },

  async parse_markdown_toc({ path, start_line = 17, end_line = 30 }) {
    if (!Number.isInteger(start_line) || !Number.isInteger(end_line) || start_line < 1 || end_line < start_line) {
      throw new Error(`Invalid TOC range: ${start_line}-${end_line}`);
    }

    const { absolutePath, relativePath } = resolveProjectPath(path);
    const content = await readFile(absolutePath, "utf8");
    const lines = splitLines(content);
    const safeEnd = Math.min(end_line, lines.length);
    const entries = [];

    for (let lineNo = start_line; lineNo <= safeEnd; lineNo += 1) {
      const line = lines[lineNo - 1] ?? "";
      if (!hasLinePrefix(line)) continue;

      const match = /^\s*(\d+)\.\s+\[([^\]]+)\]\((#[^)]+)\)\s*$/.exec(line);
      if (!match) continue;

      entries.push({
        index: Number.parseInt(match[1], 10),
        title: match[2],
        anchor: match[3].slice(1),
        line: lineNo
      });
    }

    return {
      success: true,
      path: relativePath,
      start_line,
      end_line: safeEnd,
      entries,
      scanned_lines: formatLineWindow(lines, start_line, safeEnd)
    };
  },

  async read_markdown_section({ path, heading_or_range }) {
    const { absolutePath, relativePath } = resolveProjectPath(path);
    const content = await readFile(absolutePath, "utf8");
    const lines = splitLines(content);
    const range = parseRange(heading_or_range);

    if (range) {
      const safeEnd = Math.min(range.end, lines.length);
      return {
        success: true,
        path: relativePath,
        mode: "range",
        start_line: range.start,
        end_line: safeEnd,
        content: lines.slice(range.start - 1, safeEnd).join("\n")
      };
    }

    const section = readSectionByHeading(lines, heading_or_range);
    return {
      success: true,
      path: relativePath,
      mode: "heading",
      heading: section.heading,
      start_line: section.startLine,
      end_line: section.endLine,
      content: section.content
    };
  },

  async extract_include_files({ path_or_text, base_url }) {
    let text = path_or_text;
    let source = "text";

    const canBePath = (
      typeof path_or_text === "string"
      && path_or_text.length <= 300
      && !path_or_text.includes("\n")
      && !path_or_text.includes("\r")
    );

    if (canBePath) {
      try {
        const maybePath = resolveProjectPath(path_or_text);
        if (await pathExists(maybePath.absolutePath)) {
          text = await readFile(maybePath.absolutePath, "utf8");
          source = maybePath.relativePath;
        }
      } catch {
        // If input is raw text, treat it as text source without failing.
      }
    }

    const parsed = parseIncludeTokens(text);
    const resolvedIncludes = parsed.include_files
      .map((file) => ({ file, resolved_url: maybeResolveUrl(base_url, file) }))
      .filter((item) => item.resolved_url);
    const resolvedLinks = parsed.links
      .map((href) => ({ href, resolved_url: maybeResolveUrl(base_url, href) }))
      .filter((item) => item.resolved_url);

    return {
      success: true,
      source,
      include_files: parsed.include_files,
      links: parsed.links,
      resolved_includes: resolvedIncludes,
      resolved_links: resolvedLinks
    };
  },

  async understand_image({ image_path, question }) {
    const { absolutePath, relativePath } = resolveProjectPath(image_path);
    const buffer = await readFile(absolutePath);
    const mimeType = getMimeType(absolutePath);
    const imageBase64 = buffer.toString("base64");

    log.vision(relativePath, question);
    const answer = await vision({ imageBase64, mimeType, question });
    log.info(`Vision response ready for ${relativePath}`);

    return {
      success: true,
      image_path: relativePath,
      mime_type: mimeType,
      answer
    };
  },

  async submit_verify({ declaration }) {
    if (typeof declaration !== "string" || !declaration.trim()) {
      throw new Error("declaration must be a non-empty string");
    }

    const payload = {
      apikey: task.apiKey,
      task: task.name,
      answer: {
        declaration
      }
    };

    const verifyResult = await submitVerifyRequest(payload);
    const declarationPath = resolveProjectPath(paths.declaration);
    const payloadPath = resolveProjectPath(paths.verifyPayload);
    const responsePath = resolveProjectPath(paths.verifyResponse);

    await ensureParentDir(declarationPath.absolutePath);
    await writeFile(declarationPath.absolutePath, declaration, "utf8");
    await writeFile(payloadPath.absolutePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await writeFile(responsePath.absolutePath, `${JSON.stringify(verifyResult, null, 2)}\n`, "utf8");

    return {
      success: verifyResult.ok,
      status: verifyResult.status,
      response: verifyResult.body,
      savedPaths: {
        declaration: declarationPath.relativePath,
        payload: payloadPath.relativePath,
        response: responsePath.relativePath
      }
    };
  }
};

export const isNativeTool = (name) => name in nativeHandlers;

export const executeNativeTool = async (name, args) => {
  const handler = nativeHandlers[name];
  if (!handler) throw new Error(`Unknown native tool: ${name}`);
  return handler(args);
};
