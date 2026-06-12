"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

interface MathBlockProps {
  content: string;
}

export function MathBlock({ content }: MathBlockProps) {
  const parts = parseContent(content);

  return (
    <div className="text-sm leading-relaxed space-y-1">
      {parts.map((part, i) => {
        if (part.type === "display-math") {
          return (
            <div
              key={i}
              className="my-3 overflow-x-auto"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(part.content, {
                  displayMode: true,
                  throwOnError: false,
                }),
              }}
            />
          );
        }
        if (part.type === "inline-math") {
          return (
            <span
              key={i}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(part.content, {
                  displayMode: false,
                  throwOnError: false,
                }),
              }}
            />
          );
        }
        return <span key={i}>{part.content}</span>;
      })}
    </div>
  );
}

interface Part {
  type: "text" | "inline-math" | "display-math";
  content: string;
}

function parseContent(text: string): Part[] {
  const parts: Part[] = [];
  const regex = /\$\$([\s\S]*?)\$\$|\$([\s\S]*?)\$/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      parts.push({ type: "display-math", content: match[1].trim() });
    } else if (match[2] !== undefined) {
      parts.push({ type: "inline-math", content: match[2].trim() });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}
