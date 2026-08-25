import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-ig-bg px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-lg text-ig-text-secondary mb-6">페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="text-ig-primary font-semibold hover:underline">
        Instagram 홈으로 돌아가기
      </Link>
    </div>
  );
}
