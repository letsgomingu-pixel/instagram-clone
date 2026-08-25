import { useEffect, useState } from 'react';

import * as settingsApi from '@/api/settings';

import { SettingsToggle } from '@/components/settings/SettingsToggle';

import toast from 'react-hot-toast';



const OPTIONS = [

  { key: 'notify_likes' as const, label: '좋아요', desc: '회원님의 게시물에 좋아요를 누른 경우' },

  { key: 'notify_comments' as const, label: '댓글', desc: '회원님의 게시물에 댓글이 달린 경우' },

  { key: 'notify_follows' as const, label: '팔로우', desc: '회원님을 팔로우하기 시작한 경우' },

  { key: 'notify_mentions' as const, label: '멘션', desc: '회원님이 멘션된 경우' },

];



export function SettingsNotificationsPage() {

  const [settings, setSettings] = useState<settingsApi.UserSettings | null>(null);

  const [saving, setSaving] = useState(false);



  useEffect(() => {

    settingsApi.getMySettings().then(setSettings).catch(() => toast.error('설정을 불러오지 못했습니다.'));

  }, []);



  const handleToggle = async (key: keyof settingsApi.UserSettings, value: boolean) => {

    if (!settings) return;

    const prev = settings;

    setSettings({ ...settings, [key]: value });

    setSaving(true);

    try {

      const updated = await settingsApi.updateMySettings({ [key]: value });

      setSettings(updated);

    } catch {

      setSettings(prev);

      toast.error('설정 저장에 실패했습니다.');

    } finally {

      setSaving(false);

    }

  };



  if (!settings) {

    return (

      <div className="flex justify-center py-16">

        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />

      </div>

    );

  }



  return (

    <div>

      <h2 className="text-[24px] font-normal mb-2 hidden md:block">알림</h2>

      <p className="text-[14px] text-ig-text-secondary mb-8">

        받고 싶은 알림 유형을 선택하세요.

      </p>

      <div className="space-y-6 max-w-[460px]">

        {OPTIONS.map(({ key, label, desc }) => (

          <div key={key} className="flex items-center justify-between gap-4">

            <div>

              <p className="text-[16px] font-semibold">{label}</p>

              <p className="text-[14px] text-ig-text-secondary mt-0.5">{desc}</p>

            </div>

            <SettingsToggle

              checked={settings[key]}

              disabled={saving}

              onChange={(value) => void handleToggle(key, value)}

            />

          </div>

        ))}

      </div>

    </div>

  );

}


