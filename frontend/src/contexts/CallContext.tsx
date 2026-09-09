import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { createPeerConnection, getCallMedia, getCallWebSocketUrl } from '@/utils/callWs';

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected';

export interface CallPeer {
  id: number;
  username: string;
  full_name?: string;
  avatar_url?: string;
}

interface IncomingCallPayload {
  from_user_id: number;
  from_username: string;
  from_full_name?: string;
  from_avatar_url?: string;
  call_type: CallType;
  sdp: RTCSessionDescriptionInit;
}

interface CallContextValue {
  status: CallStatus;
  callType: CallType | null;
  peer: CallPeer | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (peer: CallPeer, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  isMuted: boolean;
  isCameraOff: boolean;
}

const CallContext = createContext<CallContextValue | null>(null);

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIncomingRef = useRef<IncomingCallPayload | null>(null);
  const peerIdRef = useRef<number | null>(null);
  const statusRef = useRef<CallStatus>('idle');

  const [status, setStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const sendSignal = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const setCallStatus = useCallback((next: CallStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const cleanupCall = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
    setCallType(null);
    setPeer(null);
    setIsMuted(false);
    setIsCameraOff(false);
    peerIdRef.current = null;
    pendingIncomingRef.current = null;
  }, [setCallStatus]);

  const hangUp = useCallback(() => {
    const target = peerIdRef.current;
    if (target) {
      sendSignal({ type: 'call-hangup', to_user_id: target });
    }
    cleanupCall();
  }, [cleanupCall, sendSignal]);

  const rejectCall = useCallback(() => {
    const incoming = pendingIncomingRef.current;
    if (incoming) {
      sendSignal({ type: 'call-reject', to_user_id: incoming.from_user_id });
    }
    cleanupCall();
  }, [cleanupCall, sendSignal]);

  const setupPeerConnection = useCallback(
    (targetUserId: number) => {
      const pc = createPeerConnection();
      pcRef.current = pc;
      peerIdRef.current = targetUserId;

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) setRemoteStream(stream);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: 'ice-candidate',
            to_user_id: targetUserId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          toast.error('통화 연결이 끊어졌습니다.');
          hangUp();
        }
      };

      return pc;
    },
    [hangUp, sendSignal],
  );

  const attachLocalMedia = useCallback(async (pc: RTCPeerConnection, withVideo: boolean) => {
    const stream = await getCallMedia(withVideo);
    localStreamRef.current = stream;
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    return stream;
  }, []);

  const startCall = useCallback(
    async (target: CallPeer, type: CallType) => {
      if (statusRef.current !== 'idle') {
        toast.error('이미 통화 중입니다.');
        return;
      }
      try {
        setPeer(target);
        setCallType(type);
        setCallStatus('calling');
        peerIdRef.current = target.id;

        const pc = setupPeerConnection(target.id);
        await attachLocalMedia(pc, type === 'video');

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendSignal({
          type: 'call-offer',
          to_user_id: target.id,
          call_type: type,
          sdp: offer,
        });
      } catch {
        toast.error('마이크/카메라 권한이 필요합니다.');
        cleanupCall();
      }
    },
    [attachLocalMedia, cleanupCall, sendSignal, setCallStatus, setupPeerConnection],
  );

  const acceptCall = useCallback(async () => {
    const incoming = pendingIncomingRef.current;
    if (!incoming) return;

    try {
      const type = incoming.call_type;
      setCallType(type);
      setCallStatus('connected');

      const pc = setupPeerConnection(incoming.from_user_id);
      await attachLocalMedia(pc, type === 'video');
      await pc.setRemoteDescription(new RTCSessionDescription(incoming.sdp));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: 'call-answer',
        to_user_id: incoming.from_user_id,
        sdp: answer,
      });
      pendingIncomingRef.current = null;
    } catch {
      toast.error('통화를 수락하지 못했습니다.');
      rejectCall();
    }
  }, [attachLocalMedia, rejectCall, sendSignal, setCallStatus, setupPeerConnection]);

  const handleWsMessage = useCallback(
    async (data: Record<string, unknown>) => {
      switch (data.type) {
        case 'call-incoming': {
          const incoming = data as unknown as IncomingCallPayload;
          if (statusRef.current !== 'idle') {
            sendSignal({ type: 'call-reject', to_user_id: incoming.from_user_id });
            return;
          }
          pendingIncomingRef.current = incoming;
          peerIdRef.current = incoming.from_user_id;
          setPeer({
            id: incoming.from_user_id,
            username: incoming.from_username,
            full_name: incoming.from_full_name,
            avatar_url: incoming.from_avatar_url,
          });
          setCallType(incoming.call_type);
          setCallStatus('incoming');
          break;
        }
        case 'call-answer': {
          const pc = pcRef.current;
          if (!pc || !data.sdp) return;
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp as RTCSessionDescriptionInit));
          setCallStatus('connected');
          break;
        }
        case 'ice-candidate': {
          const pc = pcRef.current;
          if (!pc || !data.candidate) return;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate as RTCIceCandidateInit));
          } catch {
            // ignore stale candidates
          }
          break;
        }
        case 'call-reject':
          toast.error('상대방이 통화를 거절했습니다.');
          cleanupCall();
          break;
        case 'call-hangup':
          cleanupCall();
          break;
        case 'call-failed': {
          const reason = data.reason as string;
          if (reason === 'offline') toast.error('상대방이 오프라인입니다.');
          else if (reason === 'blocked') toast.error('통화할 수 없는 사용자입니다.');
          else toast.error('통화를 시작할 수 없습니다.');
          cleanupCall();
          break;
        }
        case 'call-busy':
          toast.error('상대방이 통화 중입니다.');
          cleanupCall();
          break;
        default:
          break;
      }
    },
    [cleanupCall, sendSignal, setCallStatus],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      wsRef.current?.close();
      wsRef.current = null;
      cleanupCall();
      return;
    }

    const ws = new WebSocket(getCallWebSocketUrl());
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;
        void handleWsMessage(data);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [cleanupCall, handleWsMessage, isAuthenticated]);

  const toggleMute = useCallback(() => {
    const audio = localStreamRef.current?.getAudioTracks()[0];
    if (!audio) return;
    audio.enabled = !audio.enabled;
    setIsMuted(!audio.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const video = localStreamRef.current?.getVideoTracks()[0];
    if (!video) return;
    video.enabled = !video.enabled;
    setIsCameraOff(!video.enabled);
  }, []);

  const value = useMemo(
    () => ({
      status,
      callType,
      peer,
      localStream,
      remoteStream,
      startCall,
      acceptCall,
      rejectCall,
      hangUp,
      toggleMute,
      toggleCamera,
      isMuted,
      isCameraOff,
    }),
    [
      status,
      callType,
      peer,
      localStream,
      remoteStream,
      startCall,
      acceptCall,
      rejectCall,
      hangUp,
      toggleMute,
      toggleCamera,
      isMuted,
      isCameraOff,
    ],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
