import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MultilineText } from '@/components/common/MultilineText';

interface PostCaptionProps {
  username: string;
  caption: string;
}

const COLLAPSE_LIMIT = 125;

export function PostCaption({ username, caption }: PostCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = caption.length > COLLAPSE_LIMIT;
  const visibleText =
    expanded || !needsTruncation ? caption : `${caption.slice(0, COLLAPSE_LIMIT).trim()}…`;

  return (
    <div className="text-[14px] leading-[18px] mb-1">
      <Link to={`/profile/${username}`} className="font-semibold mr-1 hover:underline">
        {username}
      </Link>
      <MultilineText as="span">{visibleText}</MultilineText>
      {needsTruncation && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-ig-text-secondary ml-1 hover:underline"
        >
          더 보기
        </button>
      )}
    </div>
  );
}
