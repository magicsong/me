import React from 'react';

interface FormattedTextProps {
  text: string | null;
  className?: string;
}

export function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;
  
  // 去掉前置和后置换行符
  const trimmedText = text.replace(/^\n+|\n+$/g, '');
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
