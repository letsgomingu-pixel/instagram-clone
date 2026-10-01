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
      '주문 및 결제, 배송, 환불 안내는 배송·반품 안내에서 확인할 수 있습니다.',
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

function FishmongerLink() {
  return (
    <Link to="/messages/fishmonger" className="text-ig-link hover:underline">
      fishmonger
    </Link>
  );
}

function ShippingGuide() {
  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-xl font-semibold mb-8">배송·반품 안내</h1>

      <section className="space-y-4 text-sm text-ig-text-secondary leading-relaxed">
        <h2 className="text-base font-semibold text-ig-text">배송안내</h2>
        <ul className="space-y-1.5">
          <li>배송 방법 : 택배</li>
          <li>배송 지역 : 전국</li>
          <li>배송 비용 : 4,000원. 매장 포장 수령은 배송비가 없습니다.</li>
          <li>배송 기간 : 결제 확인 후 1~2일. 보통 다음 날 받아보실 수 있습니다.</li>
          <li>출고지 : 금복수산, 충청남도 태안군 근흥면 신진부두길 35-14</li>
        </ul>
        <p>
          신선·냉장 수산물은 아이스박스에 아이스팩을 넣어 보내고, 냉동 수산물은 녹지 않도록 포장합니다. 건조·훈제 수산물은 상품에 맞게 포장해 드립니다.
        </p>
        <p>
          평일 오후 2시 이전 결제 건은 당일 출고를 기준으로 합니다. 그 이후와 금요일 오후, 주말, 공휴일 주문은 다음 영업일에 보내드립니다. 바다 날씨나 조업 사정으로 하루 이틀 늦어질 수 있습니다. 운송장이 등록되면 배송 중으로 안내해 드립니다.
        </p>
        <p>
          수산물은 받은 날 바로 열어 보시고, 안내에 맞게 냉장이나 냉동 보관해 주세요. 더운 날 문 앞에 오래 두면 상하기 쉽습니다. 생물은 받으신 날 손질해서 드시고, 남으면 손질한 뒤 냉동 보관해 주세요.
        </p>
        <p>
          받는 분, 연락처, 주소를 정확히 적어 주세요. 주소가 달라 반송되면 다시 보내는 배송비는 고객님 부담입니다.
        </p>
      </section>

      <section className="mt-10 space-y-4 text-sm text-ig-text-secondary leading-relaxed">
        <h2 className="text-base font-semibold text-ig-text">교환/반품안내</h2>
        <ul className="space-y-1.5">
          <li>접수 : <FishmongerLink /> 계정으로 메시지</li>
          <li>반품 주소 : 충청남도 태안군 근흥면 신진부두길 35-14 금복수산</li>
        </ul>
        <p>
          활어, 선어, 냉장·냉동 수산물은 시간이 지나면 다시 판매하기 어려워, 단순 변심에 의한 교환·반품은 어렵습니다.
        </p>
        <p>
          아래 경우는 교환 또는 환불해 드립니다. 받으신 직후, 상품과 포장, 운송장이 보이게 사진을 찍어 <FishmongerLink /> 계정으로 메시지를 보내 주세요. 이때 배송비는 저희가 부담합니다.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>배송 중 파손된 경우</li>
          <li>주문과 다른 상품이 온 경우</li>
          <li>수량이 부족한 경우</li>
          <li>받으셨을 때 이미 변질된 경우</li>
        </ul>
        <p>아래 경우는 교환·반품이 어렵습니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>받으신 뒤 보관 중에 변질된 경우</li>
          <li>냉장·냉동 보관을 하지 않은 경우</li>
          <li>조리하거나 일부 드신 경우</li>
          <li>냉동 상품을 해동한 경우</li>
          <li><FishmongerLink /> 확인 없이 상품을 버리신 경우</li>
        </ul>
        <p>
          건조·훈제 상품 중 포장을 열지 않은 것은 받으신 날부터 7일 안에 <FishmongerLink />에게 메시지를 보내 반품을 신청하실 수 있습니다. 단순 변심이면 왕복 배송비는 고객님 부담입니다. 환불은 상품 확인 후 결제하신 수단으로 처리해 드립니다.
        </p>
      </section>

      <Link to="/" className="inline-block mt-8 text-sm text-ig-link hover:underline">홈으로 돌아가기</Link>
    </div>
  );
}

export function InfoPage() {
  const { slug } = useParams<{ slug: string }>();
  if (slug === 'shipping') return <ShippingGuide />;

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
