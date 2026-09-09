import { Link, useParams } from 'react-router-dom';

const PAGES: Record<string, { title: string; body: string[] }> = {
  about: {
    title: '회사 소개',
    body: [
      'i am not a fishmonger는 신선한 수산물을 온라인으로 만나볼 수 있는 이커머스 플랫폼입니다.',
      '어업인과 소비자를 연결하고, 투명한 상품 정보와 리뷰를 제공합니다.',
    ],
  },
  terms: {
    title: '이용약관',
    body: [
      '서비스 이용 시 본 약관에 동의한 것으로 간주됩니다.',
      '회원은 정확한 정보를 제공해야 하며, 타인의 권리를 침해하는 콘텐츠를 게시할 수 없습니다.',
      '주문 및 결제, 배송, 환불 정책은 각 상품 페이지 및 주문 과정에서 안내됩니다.',
    ],
  },
  privacy: {
    title: '개인정보처리방침',
    body: [
      '수집 항목: 이메일, 사용자명, 배송지, 주문 내역 등 서비스 제공에 필요한 정보.',
      '이용 목적: 회원 관리, 주문·배송 처리, 고객 문의 응대.',
      '보관 기간: 관련 법령에 따른 기간 또는 회원 탈퇴 시까지.',
    ],
  },
  help: {
    title: '고객센터',
    body: [
      '주문·배송 문의: 내 주문 메뉴에서 주문 상태를 확인하세요.',
      '계정·보안: 설정 → 보안에서 비밀번호 변경 및 2단계 인증을 설정할 수 있습니다.',
      '문의: support@iamnotafishmonger.com',
    ],
  },
  wholesale: {
    title: '도매 안내',
    body: ['도매 문의는 고객센터로 연락해 주세요.'],
  },
  retail: {
    title: '소매 안내',
    body: ['홈 피드에서 상품을 선택해 바로 주문할 수 있습니다.'],
  },
};

export function InfoPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? PAGES[slug] : null;

  if (!page) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center">
        <p className="text-sm text-ig-text-secondary mb-4">페이지를 찾을 수 없습니다.</p>
        <Link to="/" className="text-sm text-ig-link hover:underline">홈으로</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-xl font-semibold mb-6">{page.title}</h1>
      <div className="space-y-4 text-sm text-ig-text-secondary leading-relaxed">
        {page.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <Link to="/" className="inline-block mt-8 text-sm text-ig-link hover:underline">홈으로 돌아가기</Link>
    </div>
  );
}
