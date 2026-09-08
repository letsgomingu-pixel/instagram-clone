import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConversationList } from '@/components/message/ConversationList';
import { ChatPanel } from '@/components/message/ChatPanel';
import { NewGroupModal } from '@/components/message/NewGroupModal';
import { NewMessageModal } from '@/components/message/NewMessageModal';
import * as conversationsApi from '@/api/conversations';
import type { Conversation, Message } from '@/types';
import { conversationRouteKey } from '@/utils/messages';
import { useAuth } from '@/hooks/useAuth';

const POLL_INTERVAL_MS = 4000;

function mergeConversation(prev: Conversation[], incoming: Conversation): Conversation[] {
  const key = conversationRouteKey(incoming);
  const index = prev.findIndex((c) => conversationRouteKey(c) === key);
  if (index === -1) return [incoming, ...prev];
  const next = [...prev];
  next[index] = incoming;
  return next;
}

export function MessagesPage() {
  const { username, conversationId } = useParams<{ username?: string; conversationId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);

  // A single stable key identifying "what's currently open" — either
  // `user:<username>` (1:1) or `group:<conversationId>` — used both to find
  // the active conversation in state and to avoid re-fetching stale data
  // for a route we've since navigated away from.
  const activeKey = conversationId ? `group:${conversationId}` : username ? `user:${username}` : null;
  const activeKeyRef = useRef(activeKey);

  useEffect(() => {
    activeKeyRef.current = activeKey;
  }, [activeKey]);

  const refreshConversations = useCallback(async () => {
    const data = await conversationsApi.getConversations();
    setConversations(data);
    return data;
  }, []);

  const fetchActive = useCallback((key: string): Promise<Conversation> => {
    if (key.startsWith('group:')) {
      return conversationsApi.getGroupMessages(Number(key.slice('group:'.length)));
    }
    return conversationsApi.getMessages(key.slice('user:'.length));
  }, []);

  const refreshActiveChat = useCallback(
    async (key: string) => {
      const conv = await fetchActive(key);
      setConversations((prev) => mergeConversation(prev, conv));
      return conv;
    },
    [fetchActive],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await refreshConversations();
        if (activeKeyRef.current) {
          setChatLoading(true);
          await refreshActiveChat(activeKeyRef.current);
        }
      } catch {
        if (!cancelled) toast.error('메시지를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setChatLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshConversations, refreshActiveChat]);

  useEffect(() => {
    if (!activeKey) {
      setChatLoading(false);
      return;
    }

    let cancelled = false;
    setChatLoading(true);

    refreshActiveChat(activeKey)
      .catch(() => {
        if (!cancelled) toast.error('대화를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setChatLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeKey, refreshActiveChat]);

  useEffect(() => {
    if (loading) return;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        await refreshConversations();
        const key = activeKeyRef.current;
        if (key) {
          await refreshActiveChat(key);
        }
      } catch {
        // Ignore transient polling errors.
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loading, refreshConversations, refreshActiveChat]);

  const activeConversation = useMemo(() => {
    if (!activeKey) return null;
    return conversations.find((c) => conversationRouteKey(c) === activeKey) ?? null;
  }, [activeKey, conversations]);

  const handleSelect = useCallback(
    (conversation: Conversation) => {
      if (conversation.is_group) {
        navigate(`/messages/group/${conversation.id}`);
      } else if (conversation.participant) {
        navigate(`/messages/${conversation.participant.username}`);
      }
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    navigate('/messages');
  }, [navigate]);

  const handleGroupCreated = useCallback(
    (conversation: Conversation) => {
      setConversations((prev) => mergeConversation(prev, conversation));
      navigate(`/messages/group/${conversation.id}`);
    },
    [navigate],
  );

  const handleSend = useCallback(
    (content: string) => {
      // Returns a promise (and rejects on failure) so ChatPanel can keep the
      // user's draft text in the input instead of clearing it and silently
      // losing what they typed when the request fails.
      if (!activeKey || !user) return Promise.reject(new Error('No active conversation'));

      const sendPromise = activeKey.startsWith('group:')
        ? conversationsApi.sendGroupMessage(Number(activeKey.slice('group:'.length)), content)
        : conversationsApi.sendMessage(activeKey.slice('user:'.length), content);

      return sendPromise
        .then(async (newMessage: Message) => {
          setConversations((prev) => {
            const index = prev.findIndex((c) => conversationRouteKey(c) === activeKey);
            if (index === -1) return prev;

            const updated = [...prev];
            const conversation = {
              ...updated[index],
              messages: [...updated[index].messages, newMessage],
              last_message: newMessage,
              unread_count: 0,
            };
            updated.splice(index, 1);
            return [conversation, ...updated];
          });

          try {
            await refreshActiveChat(activeKey);
          } catch {
            // Local optimistic state is enough if refresh fails.
          }
        })
        .catch((error) => {
          toast.error('메시지 전송에 실패했습니다.');
          throw error;
        });
    },
    [activeKey, user, refreshActiveChat],
  );

  const handleSendImage = useCallback(
    (file: File) => {
      if (!activeKey || !user) return Promise.reject(new Error('No active conversation'));

      const sendPromise = activeKey.startsWith('group:')
        ? conversationsApi.sendGroupMessageWithImage(Number(activeKey.slice('group:'.length)), file)
        : conversationsApi.sendMessageWithImage(activeKey.slice('user:'.length), file);

      return sendPromise
        .then(async (newMessage: Message) => {
          setConversations((prev) => {
            const index = prev.findIndex((c) => conversationRouteKey(c) === activeKey);
            if (index === -1) return prev;
            const updated = [...prev];
            const conversation = {
              ...updated[index],
              messages: [...updated[index].messages, newMessage],
              last_message: newMessage,
              unread_count: 0,
            };
            updated.splice(index, 1);
            return [conversation, ...updated];
          });
          try {
            await refreshActiveChat(activeKey);
          } catch {
            // optimistic state is enough
          }
        })
        .catch((error) => {
          toast.error('미디어 전송에 실패했습니다.');
          throw error;
        });
    },
    [activeKey, user, refreshActiveChat],
  );

  const handleDeleteMessage = useCallback(
    (messageId: number) =>
      conversationsApi.deleteMessage(messageId).then(async () => {
        if (activeKey) {
          await refreshActiveChat(activeKey);
        }
      }).catch(() => {
        toast.error('메시지 삭제에 실패했습니다.');
        throw new Error('delete failed');
      }),
    [activeKey, refreshActiveChat],
  );

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.last_message.created_at).getTime() -
          new Date(a.last_message.created_at).getTime(),
      ),
    [conversations],
  );

  const showChatOnMobile = !!activeKey;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  return (
    <div className="md:-mt-8 md:-mx-4">
      <div className="bg-white border-ig-border md:border md:rounded-xl overflow-hidden h-[calc(100dvh-var(--mobile-header-stack,92px)-49px-env(safe-area-inset-bottom))] md:h-[calc(100vh-32px)]">
        <div className="flex h-full">
          <div
            className={`w-full md:w-[397px] md:border-r border-ig-border shrink-0 h-full ${
              showChatOnMobile ? 'hidden md:flex md:flex-col' : 'flex flex-col'
            }`}
          >
            <ConversationList
              conversations={sortedConversations}
              activeConversationKey={activeKey ?? undefined}
              currentUserId={user?.id ?? 0}
              onSelect={handleSelect}
              onNewGroup={() => setShowNewGroup(true)}
              onNewMessage={() => setShowNewMessage(true)}
            />
          </div>

          <div
            className={`flex-1 min-w-0 h-full ${
              showChatOnMobile ? 'flex flex-col' : 'hidden md:flex md:flex-col'
            }`}
          >
            <ChatPanel
              conversation={activeConversation}
              loading={chatLoading}
              onSend={handleSend}
              onSendImage={handleSendImage}
              onDeleteMessage={handleDeleteMessage}
              onBack={handleBack}
              showBackButton={showChatOnMobile}
            />
          </div>
        </div>
      </div>

      <NewGroupModal
        isOpen={showNewGroup}
        onClose={() => setShowNewGroup(false)}
        onCreated={handleGroupCreated}
      />
      <NewMessageModal
        isOpen={showNewMessage}
        onClose={() => setShowNewMessage(false)}
        onStarted={(uname) => navigate(`/messages/${uname}`)}
      />
    </div>
  );
}
