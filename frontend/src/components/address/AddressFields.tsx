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
  showLabels?: boolean;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-semibold text-ig-text mb-1.5">
      {children}
      {required && <span className="text-ig-red ml-0.5">*</span>}
    </label>
  );
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
  buttonClassName = 'shrink-0 px-3 py-2.5 text-xs font-semibold border border-ig-border rounded-lg bg-ig-surface hover:bg-ig-hover',
  compact = false,
  showLabels = true,
}: AddressFieldsProps) {
  const { openSearch, loading } = useDaumPostcode();

  const handleSearch = () => {
    openSearch(({ postcode: nextPostcode, addressLine1: nextAddress }) => {
      onPostcodeChange(nextPostcode);
      onAddressLine1Change(nextAddress);
    });
  };

  const label = (id: string, text: string, required = false) =>
    showLabels ? (
      <FieldLabel htmlFor={id} required={required}>
        {text}
      </FieldLabel>
    ) : null;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div>
        {label('address-phone', '휴대폰 번호', true)}
        <input
          id="address-phone"
          type="tel"
          placeholder="010-1234-5678"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className={inputClassName}
          autoComplete="tel"
        />
      </div>

      <div>
        {label('address-postcode', '우편번호', true)}
        <div className="flex gap-2">
          <input
            id="address-postcode"
            type="text"
            placeholder="00000"
            value={postcode}
            readOnly
            className={`${inputClassName} bg-ig-muted cursor-default`}
          />
          <button type="button" onClick={handleSearch} disabled={loading} className={buttonClassName}>
            {loading ? '로딩...' : '주소 검색'}
          </button>
        </div>
      </div>

      <div>
        {label('address-line1', '주소', true)}
        <input
          id="address-line1"
          type="text"
          placeholder="주소 검색 버튼으로 입력"
          value={addressLine1}
          readOnly
          className={`${inputClassName} bg-ig-muted cursor-default`}
        />
      </div>

      <div>
        {label('address-line2', '상세주소', true)}
        <input
          id="address-line2"
          type="text"
          placeholder="동·호수 등"
          value={addressLine2}
          onChange={(e) => onAddressLine2Change(e.target.value)}
          className={inputClassName}
          autoComplete="address-line2"
        />
      </div>
    </div>
  );
}
