import React from 'react';

interface FormattedTextProps {
  text: string | null;
  className?: string;
}

export function FormattedText({ text, className = "" }: FormattedTextProps) {
  if (!text) return null;
  
  return (
    <div className={className}>
      {text.split('\n').map((line, index) => (
        <React.Fragment key={index}>
            
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}
