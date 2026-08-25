import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConversationList } from '@/components/message/ConversationList';
import { ChatPanel } from '@/components/message/ChatPanel';
import * as conversationsApi from '@/api/conversations';
import type { Conversation, Message } from '@/types';
import { useAuth } from '@/hooks/useAuth';

const POLL_INTERVAL_MS = 4000;

function mergeConversation(prev: Conversation[], incoming: Conversation): Conversation[] {
  const index = prev.findIndex((c) => c.participant.username === incoming.participant.username);
  if (index === -1) return [incoming, ...prev];
  const next = [...prev];
  next[index] = incoming;
  return next;
}

export function MessagesPage() {
  const { username } = useParams<{ username?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const usernameRef = useRef(username);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  const refreshConversations = useCallback(async () => {
    const data = await conversationsApi.getConversations();
    setConversations(data);
    return data;
  }, []);

  const refreshActiveChat = useCallback(async (targetUsername: string) => {
    const conv = await conversationsApi.getMessages(targetUsername);
    setConversations((prev) => mergeConversation(prev, conv));
    return conv;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        await refreshConversations();
        if (usernameRef.current) {
          setChatLoading(true);
          await refreshActiveChat(usernameRef.current);
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
    if (!username) {
      setChatLoading(false);
      return;
    }

    let cancelled = false;
    setChatLoading(true);

    refreshActiveChat(username)
      .catch(() => {
        if (!cancelled) toast.error('대화를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setChatLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [username, refreshActiveChat]);

  useEffect(() => {
    if (loading) return;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        await refreshConversations();
        const activeUsername = usernameRef.current;
        if (activeUsername) {
          await refreshActiveChat(activeUsername);
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
    if (!username) return null;
    return conversations.find((c) => c.participant.username === username) ?? null;
  }, [username, conversations]);

  const handleSelect = useCallback(
    (selectedUsername: string) => {
      navigate(`/messages/${selectedUsername}`);
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    navigate('/messages');
  }, [navigate]);

  const handleSend = useCallback(
    (content: string) => {
      if (!username || !user) return;

      void conversationsApi
        .sendMessage(username, content)
        .then(async (newMessage: Message) => {
          setConversations((prev) => {
            const index = prev.findIndex((c) => c.participant.username === username);
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
            await refreshActiveChat(username);
          } catch {
            // Local optimistic state is enough if refresh fails.
          }
        })
        .catch(() => {
          toast.error('메시지 전송에 실패했습니다.');
        });
    },
    [username, user, refreshActiveChat],
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

  const showChatOnMobile = !!username;

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
              activeUsername={username}
              currentUserId={user?.id ?? 0}
              onSelect={handleSelect}
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
              onBack={handleBack}
              showBackButton={showChatOnMobile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
