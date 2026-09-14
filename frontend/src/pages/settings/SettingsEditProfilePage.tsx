import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/contexts/AppContext';
import * as usersApi from '@/api/users';
import { AVATAR_IMAGE_MAX_EDGE, isServerReadyImage, normalizeImageFile } from '@/utils/media';
import toast from 'react-hot-toast';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;

function isImageFile(file: File) {
  if (!file.type || file.type === 'application/octet-stream' || file.type === 'binary/octet-stream') {
    return true;
  }
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name);
}

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      if (/heic/i.test(detail)) {
        return '이 사진 형식(HEIC)은 지원하지 않습니다. JPG 또는 PNG로 저장한 뒤 다시 시도해 주세요.';
      }
      return detail;
    }
  }
  return '프로필 저장에 실패했습니다. 이미지 형식(JPG, PNG, WEBP)을 확인해 주세요.';
}

function revokePreview(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function SettingsEditProfilePage() {
  const { user, updateUser } = useAuth();
  const { refreshFeed, refreshStories, syncCurrentUserAvatar } = useApp();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [website, setWebsite] = useState(user?.website || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const blobPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => revokePreview(blobPreviewRef.current);
  }, []);

  useEffect(() => {
    setFullName(user?.full_name || '');
    setUsername(user?.username || '');
    setBio(user?.bio || '');
    setWebsite(user?.website || '');
    if (!uploadingAvatar && !blobPreviewRef.current) {
      setAvatarPreview(user?.avatar_url || '');
    }
  }, [user?.full_name, user?.username, user?.bio, user?.website, user?.avatar_url, uploadingAvatar]);

  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameAvailable(null);
      return;
    }
    if (username.length < 3) {
      setUsernameAvailable(false);
      return;
    }
    setCheckingUsername(true);
    const timer = window.setTimeout(() => {
      usersApi
        .checkUsername(username)
        .then(setUsernameAvailable)
        .catch(() => setUsernameAvailable(false))
        .finally(() => setCheckingUsername(false));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [username, user?.username]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    if (!isImageFile(file)) {
      toast.error('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
      return;
    }

    revokePreview(blobPreviewRef.current);
    const previewUrl = URL.createObjectURL(file);
    blobPreviewRef.current = previewUrl;
    setAvatarPreview(previewUrl);
    setUploadingAvatar(true);

    try {
      const toUpload = isServerReadyImage(file)
        ? file
        : await normalizeImageFile(file, AVATAR_IMAGE_MAX_EDGE);
      const updated = await usersApi.uploadAvatar(toUpload);
      const avatarUrl = updated.avatar_url
        ? `${updated.avatar_url.split('?')[0]}?t=${Date.now()}`
        : '';
      updateUser({ ...updated, avatar_url: avatarUrl || updated.avatar_url });
      syncCurrentUserAvatar(user.id, avatarUrl || updated.avatar_url);
      blobPreviewRef.current = null;
      setAvatarPreview(avatarUrl);
      toast.success('프로필 사진이 변경되었습니다.');
      queueMicrotask(() => revokePreview(previewUrl));
    } catch (error) {
      blobPreviewRef.current = null;
      setAvatarPreview(user.avatar_url || '');
      toast.error(getErrorMessage(error));
      queueMicrotask(() => revokePreview(previewUrl));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      if (username !== user.username && usernameAvailable === false) {
        toast.error('사용할 수 없는 사용자 이름입니다.');
        return;
      }

      const updated = await usersApi.updateProfile({
        username: username !== user.username ? username : undefined,
        full_name: fullName,
        bio,
        website: website || undefined,
      });

      updateUser(updated);
      await Promise.all([refreshFeed(), refreshStories()]);
      toast.success('프로필이 저장되었습니다.');
      navigate(`/profile/${updated.username}`);
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
        <label className={uploadingAvatar ? 'cursor-wait' : 'cursor-pointer'}>
          <Avatar
            key={avatarPreview || 'default-avatar'}
            src={avatarPreview}
            alt={user?.username || ''}
            size="lg"
            className="h-[77px] w-[77px]"
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
            className="hidden"
            disabled={uploadingAvatar}
            onChange={handleAvatarChange}
          />
        </label>
        <div>
          <p className="text-[16px] font-semibold mb-2">{user?.username}</p>
          <label className={uploadingAvatar ? 'cursor-wait' : 'cursor-pointer'}>
            <span className="text-[14px] font-semibold text-ig-primary hover:text-ig-primary-hover">
              {uploadingAvatar ? '사진 업로드 중...' : '프로필 사진 바꾸기'}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/*"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={handleAvatarChange}
            />
          </label>
        </div>
      </div>

      <div className="space-y-6 max-w-[460px]">
        <SettingsField label="사용자 이름">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 30))}
            className="w-full px-2 py-1.5 border border-ig-border rounded-[3px] text-[16px] bg-ig-secondary focus:border-ig-text-secondary"
          />
          {username !== user?.username && username.length >= 3 && (
            <p className={`text-[12px] mt-1 ${usernameAvailable ? 'text-green-600' : 'text-ig-red'}`}>
              {checkingUsername
                ? '확인 중...'
                : usernameAvailable
                  ? '사용 가능한 사용자 이름입니다.'
                  : '사용할 수 없는 사용자 이름입니다.'}
            </p>
          )}
        </SettingsField>

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
        disabled={saving || uploadingAvatar}
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
