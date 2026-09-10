import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYWORDS = new Set([
  "and","break","do","else","elseif","end","false","for","function","goto","if","in",
  "local","nil","not","or","repeat","return","then","true","until","while","self",
]);

type Token = { text: string; kind: "plain" | "keyword" | "string" | "comment" | "number" | "func" };

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    const parts = buffer.split(/(\b)/);
    void parts;
    tokens.push(...splitWords(buffer));
    buffer = "";
  };

  while (i < line.length) {
    const rest = line.slice(i);

    if (rest.startsWith("--")) {
      flush();
      tokens.push({ text: rest, kind: "comment" });
      break;
    }

    const char = line[i]!;
    if (char === '"' || char === "'") {
      flush();
      let j = i + 1;
      while (j < line.length && (line[j] !== char || line[j - 1] === "\\")) j++;
      tokens.push({ text: line.slice(i, Math.min(j + 1, line.length)), kind: "string" });
      i = j + 1;
      continue;
    }

    buffer += char;
    i++;
  }
  flush();
  return tokens;
}

function splitWords(chunk: string): Token[] {
  const out: Token[] = [];
  const re = /([A-Za-z_][A-Za-z0-9_]*)|(\d+\.?\d*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk))) {
    if (match.index > last) out.push({ text: chunk.slice(last, match.index), kind: "plain" });
    const word = match[0];
    if (match[2]) out.push({ text: word, kind: "number" });
    else if (KEYWORDS.has(word)) out.push({ text: word, kind: "keyword" });
    else {
      const after = chunk.slice(match.index + word.length).trimStart();
      out.push({ text: word, kind: after.startsWith("(") ? "func" : "plain" });
    }
    last = match.index + word.length;
  }
  if (last < chunk.length) out.push({ text: chunk.slice(last), kind: "plain" });
  return out;
}

const KIND_CLASS: Record<Token["kind"], string> = {
  plain: "text-foreground/85",
  keyword: "text-code-keyword",
  string: "text-code-string",
  comment: "text-code-comment italic",
  number: "text-code-number",
  func: "text-code-func",
};

export function LuaCodeViewer({
  code,
  fileName,
  onCopy,
  onDownload,
  copyCount,
  downloadCount,
}: {
  code: string;
  fileName: string;
  onCopy?: () => void;
  onDownload?: () => void;
  copyCount?: number;
  downloadCount?: number;
}) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => code.replace(/\r\n/g, "\n").split("\n"), [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement("textarea");
      area.value = code;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
    onCopy?.();
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/x-lua;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.lua`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onDownload?.();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-code-bg shadow-2xl shadow-black/40">
      <div className="flex items-center gap-3 border-b border-border bg-surface/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-destructive/80" />
          <span className="size-3 rounded-full bg-warning/80" />
          <span className="size-3 rounded-full bg-success/80" />
        </div>
        <span className="truncate font-mono text-xs text-muted-foreground">{fileName}.lua</span>
        <div className="ml-auto flex items-center gap-2">
          <ViewerButton onClick={handleCopy}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            {typeof copyCount === "number" && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {copyCount.toLocaleString()}
              </span>
            )}
          </ViewerButton>
          <ViewerButton onClick={handleDownload}>
            <Download className="size-3.5" />
            <span className="hidden sm:inline">.lua</span>
            {typeof downloadCount === "number" && (
              <span className="font-mono text-[11px] text-muted-foreground">
                {downloadCount.toLocaleString()}
              </span>
            )}
          </ViewerButton>
        </div>
      </div>

      <div className="max-h-[32rem] overflow-auto">
        <pre className="min-w-full font-mono text-[13px] leading-6">
          <code className="block py-4">
            {lines.map((line, index) => (
              <div key={index} className="flex px-4 hover:bg-foreground/[0.03]">
                <span className="w-10 shrink-0 select-none pr-4 text-right text-muted-foreground/50">
                  {index + 1}
                </span>
                <span className="whitespace-pre-wrap break-words">
                  {tokenizeLine(line).map((token, tokenIndex) => (
                    <span key={tokenIndex} className={KIND_CLASS[token.kind]}>
                      {token.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function ViewerButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2.5 py-1.5",
        "font-mono text-xs text-foreground transition-colors hover:border-primary/50 hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}
