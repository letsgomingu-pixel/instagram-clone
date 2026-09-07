import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface MultilineTextProps {
  children: string;
  className?: string;
  as?: 'span' | 'p' | 'div';
}

// Matches #해시태그 tokens (letters/digits in any language + underscore),
// same character class the backend parser uses when saving a post's tags —
// keep the two in sync.
const HASHTAG_PATTERN = /(#[\p{L}\p{N}_]+)/gu;

function renderLineWithHashtags(line: string, keyPrefix: string) {
  const parts = line.split(HASHTAG_PATTERN);
  return parts.map((part, i) => {
    if (part.startsWith('#') && part.length > 1) {
      const tag = part.slice(1).toLowerCase();
      return (
        <Link
          key={`${keyPrefix}-${i}`}
          to={`/explore/tags/${tag}`}
          className="text-ig-link hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

/** Renders user text with newline characters visible as line breaks, and
 * #hashtags as clickable links to that hashtag's page. */
export function MultilineText({ children, className, as: Tag = 'span' }: MultilineTextProps) {
  const lines = children.replace(/\r\n/g, '\n').split('\n');

  return (
    <Tag className={cn('preserve-line-breaks', className)}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {renderLineWithHashtags(line, String(index))}
          {index < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </Tag>
  );
}
