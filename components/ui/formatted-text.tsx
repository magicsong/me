import React from 'react';
import ReactMarkdown from 'react-markdown';

interface FormattedTextProps {
  text: string | null;
  className?: string;
  markdown?: boolean;
}

export function FormattedText({ text, className = "", markdown = false }: FormattedTextProps) {
  if (!text) return null;
  
  // 去掉前置和后置换行符
  const trimmedText = text.replace(/^\n+|\n+$/g, '');
  
  if (markdown) {
    return (
      <div className={className}>
        <ReactMarkdown>{trimmedText}</ReactMarkdown>
      </div>
    );
  }
  
  // 原来的纯文本渲染逻辑
  const lines = trimmedText.split('\n');
  return (
    <div className={className}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}
