import { Link } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';

const FOOTER_LINKS = [
  { label: '회사 소개', to: '/info/about' },
  { label: '도매 안내', to: '/info/wholesale' },
  { label: '소매 안내', to: '/info/retail' },
  { label: '이용약관', to: '/info/terms' },
  { label: '개인정보처리방침', to: '/info/privacy' },
  { label: '고객센터', to: '/info/help' },
] as const;

export function LoginPage() {
  return (
    <div className="min-h-full flex flex-col">
      <main className="auth-page flex-1 flex items-center justify-center px-4 py-10 font-sans">
        <LoginForm />
      </main>

      <footer className="py-6">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ig-text-secondary mb-4 px-4">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="hover:underline">
              {item.label}
            </Link>
          ))}
        </div>
        <p className="text-center text-xs text-ig-text-secondary">© 2026 i am not a fishmonger</p>
      </footer>
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-ig-bg flex items-center justify-center">
      {children}
    </div>
  );
}
