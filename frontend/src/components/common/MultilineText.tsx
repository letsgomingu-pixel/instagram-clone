import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

interface MultilineTextProps {
  children: string;
  className?: string;
  as?: 'span' | 'p' | 'div';
}

// Matches #해시태그 tokens (letters/digits in any language + underscore),
// same character class the backend parser uses when saving a post's tags.
const HASHTAG_PATTERN = /(#[\p{L}\p{N}_]+)/gu;

// Matches @username — keep in sync with backend app/utils/mentions.py
const MENTION_PATTERN = /(@[a-zA-Z0-9._]{3,30})/g;

const TOKEN_PATTERN = /(#[\p{L}\p{N}_]+|@[a-zA-Z0-9._]{3,30})/gu;

function renderToken(part: string, key: string) {
  if (part.startsWith('#') && part.length > 1) {
    const tag = part.slice(1).toLowerCase();
    return (
      <Link
        key={key}
        to={`/explore/tags/${tag}`}
        className="text-ig-link hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </Link>
    );
  }

  if (part.startsWith('@') && part.length > 1) {
    const username = part.slice(1);
    return (
      <Link
        key={key}
        to={`/profile/${username}`}
        className="text-ig-link hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {part}
      </Link>
    );
  }

  return <Fragment key={key}>{part}</Fragment>;
}

function renderLineWithLinks(line: string, keyPrefix: string) {
  const parts = line.split(TOKEN_PATTERN);
  return parts.map((part, i) => renderToken(part, `${keyPrefix}-${i}`));
}

/** Renders user text with newlines, #hashtags, and @mentions as clickable links. */
export function MultilineText({ children, className, as: Tag = 'span' }: MultilineTextProps) {
  const lines = children.replace(/\r\n/g, '\n').split('\n');

  return (
    <Tag className={cn('preserve-line-breaks', className)}>
      {lines.map((line, index) => (
        <Fragment key={index}>
          {renderLineWithLinks(line, String(index))}
          {index < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </Tag>
  );
}

// Export patterns for tests if needed
export { HASHTAG_PATTERN, MENTION_PATTERN };
