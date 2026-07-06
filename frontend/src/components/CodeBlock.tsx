import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
}

export function CodeBlock({ code, language = "python", showCopy = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available – ignore
    }
  };

  return (
    <div className="relative group">
      {showCopy && (
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 z-10 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
        >
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3" /> Copied
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Copy className="h-3 w-3" /> Copy
            </span>
          )}
        </button>
      )}
      <pre className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed overflow-x-auto">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
}
