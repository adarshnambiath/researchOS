interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "python" }: CodeBlockProps) {
  return (
    <pre className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed overflow-x-auto">
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}
