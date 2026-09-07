import type { Conversation } from '@/types';

export interface ConversationDisplay {
  name: string;
  subtitle: string;
  avatarUrl?: string;
}

/**
 * Shared "how do we show this thread" logic for both the conversation list
 * row and the chat panel header. 1:1 threads show the other person; groups
 * show their title (falling back to a comma-joined member list) since
 * there's no single "other person" to show an avatar/name for.
 */
export function getConversationDisplay(
  conversation: Conversation,
  currentUserId: number,
): ConversationDisplay {
  if (conversation.is_group) {
    const others = conversation.participants.filter((p) => p.id !== currentUserId);
    const name = conversation.title?.trim() || others.map((p) => p.username).join(', ') || '그룹';
    return { name, subtitle: `참여자 ${conversation.participants.length}명` };
  }
  const participant = conversation.participant;
  return {
    name: participant?.username ?? '',
    subtitle: participant?.full_name ?? '',
    avatarUrl: participant?.avatar_url,
  };
}

/** Stable key for matching a conversation against the active route param. */
export function conversationRouteKey(conversation: Conversation): string {
  return conversation.is_group ? `group:${conversation.id}` : `user:${conversation.participant?.username ?? ''}`;
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분`;
  if (diffHour < 24) return `${diffHour}시간`;
  if (diffDay < 7) return `${diffDay}일`;
  if (diffWeek < 4) return `${diffWeek}주`;

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function formatChatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (isToday) return time;
  if (isYesterday) return `어제 ${time}`;
  return date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
