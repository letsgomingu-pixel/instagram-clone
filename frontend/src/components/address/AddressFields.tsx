import { useDaumPostcode } from '@/hooks/useDaumPostcode';

interface AddressFieldsProps {
  phone: string;
  postcode: string;
  addressLine1: string;
  addressLine2: string;
  onPhoneChange: (value: string) => void;
  onPostcodeChange: (value: string) => void;
  onAddressLine1Change: (value: string) => void;
  onAddressLine2Change: (value: string) => void;
  inputClassName?: string;
  buttonClassName?: string;
  compact?: boolean;
}

export function AddressFields({
  phone,
  postcode,
  addressLine1,
  addressLine2,
  onPhoneChange,
  onPostcodeChange,
  onAddressLine1Change,
  onAddressLine2Change,
  inputClassName = 'w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs',
  buttonClassName = 'shrink-0 px-3 py-2.5 text-xs font-semibold border border-ig-border rounded-lg bg-ig-surface hover:bg-[#fafafa]',
  compact = false,
}: AddressFieldsProps) {
  const { openSearch, loading } = useDaumPostcode();

  const handleSearch = () => {
    openSearch(({ postcode: nextPostcode, addressLine1: nextAddress }) => {
      onPostcodeChange(nextPostcode);
      onAddressLine1Change(nextAddress);
    });
  };

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <input
        type="tel"
        placeholder="휴대폰 번호 (010-1234-5678)"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        className={inputClassName}
        autoComplete="tel"
      />

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="우편번호"
          value={postcode}
          readOnly
          className={`${inputClassName} bg-[#efefef] cursor-default`}
        />
        <button type="button" onClick={handleSearch} disabled={loading} className={buttonClassName}>
          {loading ? '로딩...' : '주소 검색'}
        </button>
      </div>

      <input
        type="text"
        placeholder="주소"
        value={addressLine1}
        readOnly
        className={`${inputClassName} bg-[#efefef] cursor-default`}
      />

      <input
        type="text"
        placeholder="상세주소 (동·호수 등)"
        value={addressLine2}
        onChange={(e) => onAddressLine2Change(e.target.value)}
        className={inputClassName}
        autoComplete="address-line2"
      />
    </div>
  );
}
