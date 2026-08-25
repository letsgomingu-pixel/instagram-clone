import { Fragment } from 'react';
import { cn } from '@/utils/cn';

interface MultilineTextProps {
  children: string;
  className?: string;
  as?: 'span' | 'p' | 'div';
}

/** Renders user text with newline characters visible as line breaks. */
export function MultilineText({ children, className, as: Tag = 'span' }: MultilineTextProps) {
  const lines = children.replace(/\r\n/g, '\n').split('\n');

  return (
    <Tag className={cn('preserve-line-breaks', className)}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </Tag>
  );
}
