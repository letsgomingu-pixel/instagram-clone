export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) return { valid: false, message: '이메일을 입력해주세요.' };
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return { valid: false, message: '올바른 이메일 형식이 아닙니다.' };
  return { valid: true };
}

export function validateUsername(username: string): ValidationResult {
  if (!username.trim()) return { valid: false, message: '사용자명을 입력해주세요.' };
  if (username.length < 3) return { valid: false, message: '사용자명은 3자 이상이어야 합니다.' };
  if (!/^[a-zA-Z0-9._]+$/.test(username))
    return { valid: false, message: '영문, 숫자, ., _ 만 사용 가능합니다.' };
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, message: '비밀번호를 입력해주세요.' };
  if (password.length < 8) return { valid: false, message: '비밀번호는 8자 이상이어야 합니다.' };
  return { valid: true };
}

export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  if (password.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 3 && password.length >= 10) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}

export function getPasswordStrengthLabel(strength: 'weak' | 'medium' | 'strong'): string {
  const labels = { weak: '약함', medium: '보통', strong: '강함' };
  return labels[strength];
}

export function validateLogin(username: string, password: string): ValidationResult {
  if (!username.trim()) return { valid: false, message: '사용자명 또는 이메일을 입력해주세요.' };
  if (!password) return { valid: false, message: '비밀번호를 입력해주세요.' };
  return { valid: true };
}
