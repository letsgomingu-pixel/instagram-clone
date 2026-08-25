import { useEffect, useState } from 'react';

import * as settingsApi from '@/api/settings';

import { SettingsToggle } from '@/components/settings/SettingsToggle';

import toast from 'react-hot-toast';



const BOOLEAN_OPTIONS = [

  { key: 'is_private' as const, label: '비공개 계정', desc: '승인한 팔로워만 게시물을 볼 수 있습니다.' },

  { key: 'show_activity_status' as const, label: '활동 상태', desc: '팔로우하는 사람에게 활동 상태를 표시합니다.' },

  { key: 'allow_story_replies' as const, label: '스토리 공유', desc: '다른 사람이 회원님의 스토리에 답장할 수 있습니다.' },

];



const PRIVACY_SELECTS = [

  {

    key: 'comments_privacy' as const,

    label: '댓글',

    options: [

      { value: 'everyone', label: '모두' },

      { value: 'followers', label: '팔로워' },

      { value: 'off', label: '끔' },

    ],

  },

  {

    key: 'mentions_privacy' as const,

    label: '멘션',

    options: [

      { value: 'everyone', label: '모두' },

      { value: 'followers', label: '팔로워' },

      { value: 'off', label: '끔' },

    ],

  },

];



export function SettingsPrivacyPage() {

  const [settings, setSettings] = useState<settingsApi.UserSettings | null>(null);

  const [saving, setSaving] = useState(false);



  useEffect(() => {

    settingsApi.getMySettings().then(setSettings).catch(() => toast.error('설정을 불러오지 못했습니다.'));

  }, []);



  const save = async (patch: settingsApi.UserSettingsUpdate) => {

    if (!settings) return;

    const prev = settings;

    setSettings({ ...settings, ...patch });

    setSaving(true);

    try {

      const updated = await settingsApi.updateMySettings(patch);

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

      <h2 className="text-[24px] font-normal mb-2 hidden md:block">개인정보 보호</h2>

      <p className="text-[14px] text-ig-text-secondary mb-8">

        계정의 공개 범위와 상호작용 설정을 관리하세요.

      </p>



      <div className="divide-y divide-ig-border max-w-[460px]">

        {BOOLEAN_OPTIONS.map(({ key, label, desc }) => (

          <div key={key} className="flex items-center justify-between gap-4 py-4">

            <div>

              <p className="text-[16px] font-semibold">{label}</p>

              <p className="text-[14px] text-ig-text-secondary mt-0.5">{desc}</p>

            </div>

            <SettingsToggle

              checked={settings[key]}

              disabled={saving}

              onChange={(value) => void save({ [key]: value })}

            />

          </div>

        ))}



        {PRIVACY_SELECTS.map(({ key, label, options }) => (

          <div key={key} className="flex items-center justify-between gap-4 py-4">

            <span className="text-[16px] font-semibold">{label}</span>

            <select

              value={settings[key]}

              disabled={saving}

              onChange={(e) =>

                void save({ [key]: e.target.value as settingsApi.UserSettings[typeof key] })

              }

              className="border border-ig-border rounded-lg px-3 py-2 text-sm bg-white"

            >

              {options.map((opt) => (

                <option key={opt.value} value={opt.value}>

                  {opt.label}

                </option>

              ))}

            </select>

          </div>

        ))}

      </div>

    </div>

  );

}


