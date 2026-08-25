import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import * as usersApi from '@/api/users';
import toast from 'react-hot-toast';

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

function isImageFile(file: File) {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name);
}

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return '프로필 저장에 실패했습니다. 이미지 형식(JPG, PNG, WEBP)을 확인해 주세요.';
}

export function SettingsEditProfilePage() {
  const { user, updateUser } = useAuth();
  const { refreshFeed, refreshStories, syncCurrentUserAvatar } = useApp();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setBio(user?.bio || '');
    setWebsite(user?.website || '');
    if (!avatarFile) {
      setAvatarPreview(user?.avatar_url || '');
    }
  }, [user?.full_name, user?.bio, user?.website, user?.avatar_url, avatarFile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      toast.error('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
      e.target.value = '';
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      let updated = user;

      if (avatarFile) {
        updated = await usersApi.uploadAvatar(avatarFile);
        updateUser(updated);
        syncCurrentUserAvatar(user.id, updated.avatar_url);
      }

      updated = await usersApi.updateProfile({
        full_name: fullName,
        bio,
        website: website || undefined,
      });

      updateUser(updated);
      await Promise.all([refreshFeed(), refreshStories()]);
      setAvatarFile(null);
      toast.success('프로필이 저장되었습니다.');
      navigate(`/profile/${user.username}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[24px] font-normal mb-8 hidden md:block">프로필 편집</h2>

      <div className="flex items-center gap-8 mb-10 pb-8 border-b border-ig-border">
        <Avatar
          key={avatarPreview || 'default-avatar'}
          src={avatarPreview}
          alt={user?.username || ''}
          size="lg"
          className="h-[77px] w-[77px]"
        />
        <div>
          <p className="text-[16px] font-semibold mb-2">{user?.username}</p>
          <label className="cursor-pointer">
            <span className="text-[14px] font-semibold text-ig-primary hover:text-ig-primary-hover">
              프로필 사진 바꾸기
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
      </div>

      <div className="space-y-6 max-w-[460px]">
        <SettingsField label="웹사이트">
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="웹사이트"
            className="w-full px-2 py-1.5 border border-ig-border rounded-[3px] text-[16px] bg-ig-secondary focus:border-ig-text-secondary"
          />
        </SettingsField>

        <SettingsField label="소개">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            className="w-full px-2 py-1.5 border border-ig-border rounded-[3px] text-[16px] bg-ig-secondary resize-none min-h-[80px] focus:border-ig-text-secondary"
            maxLength={150}
          />
        </SettingsField>

        <SettingsField label="이름">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-2 py-1.5 border border-ig-border rounded-[3px] text-[16px] bg-ig-secondary focus:border-ig-text-secondary"
          />
        </SettingsField>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-8 text-[14px] font-semibold text-ig-primary hover:text-ig-primary-hover disabled:opacity-50"
      >
        {saving ? '저장 중...' : '제출'}
      </button>
    </form>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-8">
      <label className="md:w-[194px] md:text-right text-[16px] font-semibold shrink-0 md:pt-1.5">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
