import { SignupForm } from '@/components/auth/SignupForm';

const FOOTER_LINKS = [
  '회사 소개',
  '도매 안내',
  '소매 안내',
  '이용약관',
  '개인정보처리방침',
  '고객센터',
] as const;

export function SignupPage() {
  return (
    <div className="min-h-full flex flex-col bg-ig-bg">
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <SignupForm />
      </main>

      <footer className="py-6">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-ig-text-secondary mb-4 px-4">
          {FOOTER_LINKS.map((item) => (
            <a key={item} href="#" className="hover:underline">
              {item}
            </a>
          ))}
        </div>
        <p className="text-center text-xs text-ig-text-secondary">© 2026 i am not a fishmonger</p>
      </footer>
    </div>
  );
}
