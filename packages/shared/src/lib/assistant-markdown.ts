export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; children: InlineNode[] }
  | { type: "italic"; children: InlineNode[] }
  | { type: "code"; text: string };

export type BlockNode =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "heading"; level: 1 | 2 | 3; children: InlineNode[] }
  | { type: "list"; ordered: boolean; items: InlineNode[][] }
  | { type: "table"; header: InlineNode[][]; rows: InlineNode[][][] }
  | { type: "code"; text: string }
  | { type: "quote"; children: InlineNode[] };

export function parseAssistantMarkdown(source: string): BlockNode[] {
  const lines = stitchBrokenTableRows(normalizeSource(source).split("\n"));
  const blocks: BlockNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.trim().startsWith("```")) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
        body.push(lines[i]!);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }
    if (isTableStart(lines, i)) {
      const header = splitRow(lines[i]!);
      i += 1;
      if (i < lines.length && isSeparator(lines[i]!)) i += 1;
      const rows: string[][] = [];
      const width = header.length;
      while (i < lines.length && isTableRow(lines[i]!) && splitRow(lines[i]!).length === width) {
        rows.push(splitRow(lines[i]!));
        i += 1;
      }
      blocks.push({
        type: "table",
        header: header.map(parseInline),
        rows: rows.map((row) => padCells(row, width).map(parseInline)),
      });
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1]!.length as 1 | 2 | 3,
        children: parseInline(heading[2]!),
      });
      i += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        quoted.push(lines[i]!.replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", children: parseInline(quoted.join(" ")) });
      continue;
    }
    const unordered = /^[-*+]\s+/.test(line);
    const ordered = /^\d+[.)]\s+/.test(line);
    if (unordered || ordered) {
      const items: InlineNode[][] = [];
      while (i < lines.length && (unordered ? /^[-*+]\s+/ : /^\d+[.)]\s+/).test(lines[i]!)) {
        items.push(parseInline(lines[i]!.replace(unordered ? /^[-*+]\s+/ : /^\d+[.)]\s+/, "")));
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length) {
      const current = lines[i] ?? "";
      if (
        current.trim() === "" ||
        current.trim().startsWith("```") ||
        isTableStart(lines, i) ||
        /^(#{1,3})\s+/.test(current) ||
        /^>\s?/.test(current) ||
        /^[-*+]\s+/.test(current) ||
        /^\d+[.)]\s+/.test(current)
      ) {
        break;
      }
      para.push(current);
      i += 1;
    }
    blocks.push({ type: "paragraph", children: parseInline(para.join("\n")) });
  }
  return blocks;
}

export function parseInline(input: string): InlineNode[] {
  const out: InlineNode[] = [];
  let i = 0;
  while (i < input.length) {
    const codeEnd = input[i] === "`" ? input.indexOf("`", i + 1) : -1;
    if (codeEnd !== -1) {
      out.push({ type: "code", text: input.slice(i + 1, codeEnd) });
      i = codeEnd + 1;
      continue;
    }
    const boldEnd = input.startsWith("**", i) ? input.indexOf("**", i + 2) : -1;
    if (boldEnd !== -1) {
      out.push({ type: "bold", children: parseInline(input.slice(i + 2, boldEnd)) });
      i = boldEnd + 2;
      continue;
    }
    const italicEnd =
      input[i] === "*" && input[i + 1] !== "*" ? input.indexOf("*", i + 1) : -1;
    if (italicEnd !== -1 && !input.startsWith("**", italicEnd)) {
      out.push({ type: "italic", children: parseInline(input.slice(i + 1, italicEnd)) });
      i = italicEnd + 1;
      continue;
    }
    let next = i + 1;
    while (next < input.length && !opensInline(input, next)) next += 1;
    out.push({ type: "text", text: input.slice(i, next) });
    i = next;
  }
  return out;
}

function opensInline(input: string, index: number): boolean {
  if (input[index] === "`" && input.indexOf("`", index + 1) !== -1) return true;
  if (input.startsWith("**", index) && input.indexOf("**", index + 2) !== -1) return true;
  if (input[index] === "*" && input[index + 1] !== "*") {
    const end = input.indexOf("*", index + 1);
    return end !== -1 && !input.startsWith("**", end);
  }
  return false;
}

function normalizeSource(source: string): string {
  return source.replace(/\r\n/g, "\n").replace(/<br\s*\/?>/gi, "\n");
}

function stitchBrokenTableRows(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.includes("|") &&
      !isSeparator(prev) &&
      !prev.trim().endsWith("|") &&
      line.includes("|") &&
      !line.trim().startsWith("|")
    ) {
      out[out.length - 1] = `${prev} ${line.trim()}`;
      continue;
    }
    out.push(line);
  }
  return out;
}

function isTableRow(line: string): boolean {
  return line.includes("|") && line.trim() !== "" && !isSeparator(line) && splitRow(line).length >= 2;
}

function isSeparator(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function isTableStart(lines: string[], index: number): boolean {
  const row = lines[index];
  const next = lines[index + 1];
  if (!row || !next || !isTableRow(row)) return false;
  const width = splitRow(row).length;
  if (isSeparator(next) && splitRow(next).length === width) return true;
  return isTableRow(next) && splitRow(next).length === width;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const body = inner.endsWith("|") ? inner.slice(0, -1) : inner;
  return body.split("|").map((cell) => cell.trim());
}

function padCells(row: string[], width: number): string[] {
  const next = row.slice(0, width);
  while (next.length < width) next.push("");
  return next;
}
