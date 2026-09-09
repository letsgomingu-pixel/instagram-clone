import { useEffect, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { useCall } from '@/contexts/CallContext';

export function CallOverlay() {
  const {
    status,
    callType,
    peer,
    localStream,
    remoteStream,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleCamera,
    isMuted,
    isCameraOff,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (status === 'idle' || !peer) return null;

  const isVideo = callType === 'video';
  const label =
    status === 'calling'
      ? '연결 중...'
      : status === 'incoming'
        ? isVideo
          ? '영상 통화'
          : '음성 통화'
        : '통화 중';

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center text-white p-4">
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      {isVideo && status === 'connected' && (
        <div className="absolute inset-0">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute top-4 right-4 w-28 h-40 md:w-36 md:h-48 object-cover rounded-xl border-2 border-white/30 shadow-lg"
            />
          )}
        </div>
      )}

      <div className={`relative z-10 flex flex-col items-center ${isVideo && status === 'connected' ? 'mt-auto mb-24' : ''}`}>
        {!(isVideo && status === 'connected') && (
          <Avatar src={peer.avatar_url} alt={peer.username} size="xl" className="mb-4 ring-4 ring-white/20" />
        )}
        <p className="text-xl font-semibold">{peer.username}</p>
        {peer.full_name && <p className="text-sm text-white/70 mt-1">{peer.full_name}</p>}
        <p className="text-sm text-white/60 mt-3">{label}</p>
      </div>

      <div className="relative z-10 flex items-center gap-4 mt-10">
        {status === 'incoming' ? (
          <>
            <button
              type="button"
              onClick={() => void acceptCall()}
              className="h-14 w-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600"
              aria-label="수락"
            >
              <Phone size={24} />
            </button>
            <button
              type="button"
              onClick={rejectCall}
              className="h-14 w-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
              aria-label="거절"
            >
              <PhoneOff size={24} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMute}
              className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25"
              aria-label={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            {isVideo && (
              <button
                type="button"
                onClick={toggleCamera}
                className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25"
                aria-label={isCameraOff ? '카메라 켜기' : '카메라 끄기'}
              >
                {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}
            <button
              type="button"
              onClick={hangUp}
              className="h-14 w-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600"
              aria-label="통화 종료"
            >
              <PhoneOff size={24} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
