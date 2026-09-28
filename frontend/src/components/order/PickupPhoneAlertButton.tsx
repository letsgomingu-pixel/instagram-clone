import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/common/Button';
import { enableOrderPush, orderPushSupport } from '@/pwa/orderPush';

export function PickupPhoneAlertButton() {
  const [pushState, setPushState] = useState<'off' | 'on' | 'denied' | 'install' | 'unsupported'>('off');
  const [enabling, setEnabling] = useState(false);

  if (pushState === 'on') {
    return <p className="text-xs font-semibold text-ig-primary">휴대폰 알림이 켜져 있습니다.</p>;
  }
  if (pushState === 'denied') {
    return <p className="text-xs text-ig-text-secondary">브라우저 설정에서 알림을 허용해 주세요.</p>;
  }
  if (pushState === 'install') {
    return <p className="text-xs text-ig-text-secondary">아이폰은 홈 화면에 추가한 뒤 알림을 켤 수 있습니다.</p>;
  }
  if (pushState === 'unsupported' || orderPushSupport() === 'unsupported') return null;

  return (
    <Button
      type="button"
      size="sm"
      loading={enabling}
      onClick={async () => {
        setEnabling(true);
        try {
          const result = await enableOrderPush();
          if (result === 'enabled') {
            setPushState('on');
            toast.success('휴대폰 알림을 켰습니다.');
            return;
          }
          setPushState(result);
        } finally {
          setEnabling(false);
        }
      }}
    >
      휴대폰 알림 켜기
    </Button>
  );
}
