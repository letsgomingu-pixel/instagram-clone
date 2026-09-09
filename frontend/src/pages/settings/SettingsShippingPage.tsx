import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { AddressFields } from '@/components/address/AddressFields';
import { useAuth } from '@/hooks/useAuth';
import * as usersApi from '@/api/users';
import {
  validatePhone,
  validatePostcode,
  validateAddressLine1,
  validateAddressLine2,
} from '@/utils/validateForm';
import toast from 'react-hot-toast';

function getErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return '배송지 저장에 실패했습니다.';
}

export function SettingsShippingPage() {
  const { user, updateUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [postcode, setPostcode] = useState(user?.postcode || '');
  const [addressLine1, setAddressLine1] = useState(user?.address_line1 || '');
  const [addressLine2, setAddressLine2] = useState(user?.address_line2 || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhone(user?.phone || '');
    setPostcode(user?.postcode || '');
    setAddressLine1(user?.address_line1 || '');
    setAddressLine2(user?.address_line2 || '');
  }, [user?.phone, user?.postcode, user?.address_line1, user?.address_line2]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const phoneVal = validatePhone(phone);
    if (!phoneVal.valid) return toast.error(phoneVal.message!);

    const postcodeVal = validatePostcode(postcode);
    if (!postcodeVal.valid) return toast.error(postcodeVal.message!);

    const address1Val = validateAddressLine1(addressLine1);
    if (!address1Val.valid) return toast.error(address1Val.message!);

    const address2Val = validateAddressLine2(addressLine2);
    if (!address2Val.valid) return toast.error(address2Val.message!);

    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({
        phone: phone.trim(),
        postcode: postcode.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
      });
      updateUser(updated);
      toast.success('배송지가 저장되었습니다.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const settingsInputClass =
    'w-full px-2 py-1.5 border border-ig-border rounded-[3px] text-[16px] bg-ig-secondary focus:border-ig-text-secondary';
  const settingsButtonClass =
    'shrink-0 px-3 py-1.5 text-[14px] font-semibold border border-ig-border rounded-[3px] bg-ig-surface hover:bg-[#fafafa]';

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-[24px] font-normal mb-4 hidden md:block">배송지 관리</h2>
      <p className="text-[14px] text-ig-text-secondary mb-8 hidden md:block">
        주문 시 기본으로 사용되는 배송지입니다. 주문할 때마다 확인·수정할 수 있습니다.
      </p>

      <div className="space-y-6 max-w-[460px]">
        <SettingsField label="받는 분">
          <p className="text-[16px] pt-1.5">{user?.full_name}</p>
        </SettingsField>

        <SettingsField label="연락처 · 주소">
          <AddressFields
            phone={phone}
            postcode={postcode}
            addressLine1={addressLine1}
            addressLine2={addressLine2}
            onPhoneChange={setPhone}
            onPostcodeChange={setPostcode}
            onAddressLine1Change={setAddressLine1}
            onAddressLine2Change={setAddressLine2}
            inputClassName={settingsInputClass}
            buttonClassName={settingsButtonClass}
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
