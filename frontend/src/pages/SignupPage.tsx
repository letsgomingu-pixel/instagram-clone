import { SignupForm } from '@/components/auth/SignupForm';

export function SignupPage() {
  return (
    <div className="min-h-full flex flex-col bg-ig-bg">
      <main className="auth-page flex-1 flex items-center justify-center px-4 py-10 font-sans">
        <SignupForm />
      </main>
    </div>
  );
}
