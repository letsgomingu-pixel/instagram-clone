import { SignupForm } from '@/components/auth/SignupForm';

export function SignupPage() {
  return (
    <div className="min-h-full flex flex-col bg-ig-bg">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <SignupForm />
      </main>

      <footer className="py-6">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ig-text-secondary mb-4 px-4">
          {['메타', '소개', '블로그', '채용 정보', '도움말', '개발자 센터', '개인정보처리방침', '약관', '위치'].map(
            (item) => (
              <a key={item} href="#" className="hover:underline">{item}</a>
            ),
          )}
        </div>
        <p className="text-center text-xs text-ig-text-secondary">© 2026 Instagram · 메타</p>
      </footer>
    </div>
  );
}
