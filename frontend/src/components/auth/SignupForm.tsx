import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { InstagramLogo } from '@/components/common/InstagramLogo';
import { Button } from '@/components/common/Button';
import { useDebounce } from '@/hooks/useDebounce';
import {
  validateEmail,
  validateUsername,
  validatePassword,
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

    try {
      await register({ email, username, full_name: fullName, password });
      toast.success('가입을 환영합니다!');
      navigate(from, { replace: true });
    } catch {
      toast.error('회원가입에 실패했습니다.');
    }
  };

  const isValid =
    email && username && fullName && password.length >= 8 && !usernameTaken;

  return (
    <div className="w-full max-w-[350px]">
      <div className="bg-white border border-ig-border rounded-sm px-10 py-10 mb-3">
        <div className="flex justify-center mb-3">
          <InstagramLogo className="text-[28px] leading-tight text-center" />
        </div>
        <p className="text-ig-text-secondary text-base font-semibold text-center mb-4">
          친구들의 사진과 동영상을 보려면 가입하세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-2 py-2 bg-ig-secondary border border-ig-border rounded-sm text-xs"
          />
          <div>
            <input
              type="text"
              placeholder="사용자 이름"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ''))}
              className="w-full px-2 py-2 bg-ig-secondary border border-ig-border rounded-sm text-xs"
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
            className="w-full px-2 py-2 bg-ig-secondary border border-ig-border rounded-sm text-xs"
          />
          <div>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2 py-2 bg-ig-secondary border border-ig-border rounded-sm text-xs"
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

      <div className="bg-white border border-ig-border rounded-sm py-5 text-center text-sm">
        계정이 있으신가요?{' '}
        <Link to="/login" className="text-ig-primary font-semibold hover:underline">
          로그인
        </Link>
      </div>
    </div>
  );
}
