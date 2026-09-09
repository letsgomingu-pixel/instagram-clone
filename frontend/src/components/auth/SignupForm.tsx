import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { InstagramLogo } from '@/components/common/InstagramLogo';
import { Button } from '@/components/common/Button';
import { AddressFields } from '@/components/address/AddressFields';
import { useDebounce } from '@/hooks/useDebounce';
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validatePhone,
  validatePostcode,
  validateAddressLine1,
  validateAddressLine2,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from '@/utils/validateForm';
import { checkUsername } from '@/api/users';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [postcode, setPostcode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  const debouncedUsername = useDebounce(username, 500);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (debouncedUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    checkUsername(debouncedUsername)
      .then(setUsernameAvailable)
      .catch(() => setUsernameAvailable(false));
  }, [debouncedUsername]);

  const usernameTaken = usernameAvailable === false;
  const passwordStrength = getPasswordStrength(password);

  const strengthColors = {
    weak: 'bg-ig-red',
    medium: 'bg-yellow-400',
    strong: 'bg-green-500',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailVal = validateEmail(email);
    if (!emailVal.valid) return toast.error(emailVal.message!);

    const usernameVal = validateUsername(username);
    if (!usernameVal.valid) return toast.error(usernameVal.message!);
    if (usernameTaken) return toast.error('이미 사용 중인 사용자명입니다.');

    const passwordVal = validatePassword(password);
    if (!passwordVal.valid) return toast.error(passwordVal.message!);

    if (!fullName.trim()) return toast.error('이름을 입력해주세요.');

    const phoneVal = validatePhone(phone);
    if (!phoneVal.valid) return toast.error(phoneVal.message!);

    const postcodeVal = validatePostcode(postcode);
    if (!postcodeVal.valid) return toast.error(postcodeVal.message!);

    const address1Val = validateAddressLine1(addressLine1);
    if (!address1Val.valid) return toast.error(address1Val.message!);

    const address2Val = validateAddressLine2(addressLine2);
    if (!address2Val.valid) return toast.error(address2Val.message!);

    try {
      await register({
        email,
        username,
        full_name: fullName,
        password,
        phone: phone.trim(),
        postcode: postcode.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim(),
      });
      toast.success('가입을 환영합니다!');
      navigate(from, { replace: true });
    } catch (error) {
      if (isAxiosError(error) && typeof error.response?.data?.detail === 'string') {
        const detail = error.response.data.detail as string;
        if (detail === 'Email is already registered') {
          toast.error('이미 사용 중인 이메일입니다.');
        } else if (detail === 'Username is already taken') {
          toast.error('이미 사용 중인 사용자명입니다.');
        } else {
          toast.error(detail);
        }
        return;
      }
      toast.error('회원가입에 실패했습니다.');
    }
  };

  const isValid =
    email &&
    username &&
    fullName &&
    password.length >= 8 &&
    !usernameTaken &&
    phone.trim() &&
    postcode.trim() &&
    addressLine1.trim() &&
    addressLine2.trim();

  return (
    <div className="w-full max-w-[420px]">
      <div className="bg-ig-surface border border-ig-border rounded-xl px-8 py-8 mb-3 shadow-sm">
        <div className="flex justify-center mb-3">
          <InstagramLogo className="text-[22px] leading-tight text-center" />
        </div>
        <p className="text-ig-text-secondary text-sm font-medium text-center mb-4 leading-relaxed">
          친구의 사진과 동영상을 보려면 가입하세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
          />
          <div>
            <input
              type="text"
              placeholder="사용자 이름"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
              className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
            />
            {debouncedUsername.length >= 3 && (
              <p className={`text-xs mt-1 ${usernameTaken ? 'text-ig-red' : 'text-green-600'}`}>
                {usernameTaken ? '✗ 사용할 수 없는 사용자명' : '✓ 사용 가능한 사용자명'}
              </p>
            )}
          </div>
          <input
            type="text"
            placeholder="성명"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
          />

          <div className="pt-1 pb-1">
            <p className="text-[11px] font-semibold text-ig-text-secondary mb-2">배송지 정보</p>
            <AddressFields
              phone={phone}
              postcode={postcode}
              addressLine1={addressLine1}
              addressLine2={addressLine2}
              onPhoneChange={setPhone}
              onPostcodeChange={setPostcode}
              onAddressLine1Change={setAddressLine1}
              onAddressLine2Change={setAddressLine2}
              compact
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-ig-secondary border border-ig-border rounded-lg text-xs"
            />
            {password && (
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 h-1 bg-ig-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${strengthColors[passwordStrength]}`}
                    style={{
                      width: passwordStrength === 'weak' ? '33%' : passwordStrength === 'medium' ? '66%' : '100%',
                    }}
                  />
                </div>
                <span className="text-[10px] text-ig-text-secondary">{getPasswordStrengthLabel(passwordStrength)}</span>
              </div>
            )}
          </div>
          <Button type="submit" fullWidth size="lg" loading={isLoading} disabled={!isValid}>
            가입
          </Button>
        </form>

        <p className="text-xs text-ig-text-secondary text-center mt-4 leading-4">
          가입하면 i am not a fishmonger의{' '}
          <a href="#" className="text-ig-link">약관</a>,{' '}
          <a href="#" className="text-ig-link">데이터 정책</a> 및{' '}
          <a href="#" className="text-ig-link">쿠키 정책</a>에 동의하게 됩니다.
        </p>
      </div>

      <div className="bg-ig-surface border border-ig-border rounded-xl py-5 text-center text-sm shadow-sm">
        계정이 있으신가요?{' '}
        <Link to="/login" className="text-ig-primary font-semibold hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
