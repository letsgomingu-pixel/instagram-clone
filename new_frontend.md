# i am not a fishmonger — 프론트엔드 디자인 명세서

> 수산물 전문 **도·소매 이커머스** 브랜드. Instagram 클론 UI에서 완전히 벗어나, 바다·항구·어시장을 연상시키는 독창적 상업 플랫폼 비주얼을 목표로 한다.  
> **기능은 그대로**, **프론트엔드 디자인·카피만** 변경한다.

---

## 1. 브랜드 아이덴티티

| 항목 | 내용 |
|------|------|
| 서비스명 | **i am not a fishmonger** |
| 콘셉트 | B2B/B2C 수산물 도·소매 거래 플ataform (어류·해산물 카탈로그, 입고 소식, 현장 영상, 거래처 네트워크) |
| 톤앤매너 | 신선함, 신뢰, 전문성 — 유머러스한 이름과 대비되는 **차분하고 깔끔한** 해양 UI |
| 차별점 | Instagram 그라데이션·카메라 아이콘·소셜 미디어 카피 **전면 제거** |

### 로고
- 워드마크: `i am not a fishmonger` — **DM Serif Display** (세리프, 프리미엄 수산 브랜드)
- 심볼: 파도 + 물고기 실루엣 SVG (`BrandIcon`)
- 컬러: 딥 네이비(`#0B2E3D`) + 오션 틸(`#0A7EA4`)

### 타이포그래피
| 용도 | 폰트 |
|------|------|
| 로고·헤드라인 | DM Serif Display |
| 본문·UI | Outfit |
| fallback | system-ui, sans-serif |

---

## 2. 색상 팔레트 (Ocean)

Tailwind v4 `@theme` 토큰 (`ig-*` 이름은 **하위 호환**용 유지, 값만 해양 테마로 교체).

| 토큰 | HEX | 이름 | 용도 |
|------|-----|------|------|
| `--color-ig-primary` | `#0A7EA4` | Ocean Teal | CTA, 활성 링크, 주요 버튼 |
| `--color-ig-primary-hover` | `#065A75` | Deep Teal | 버튼 hover |
| `--color-ig-secondary` | `#E8F6FA` | Sea Foam | 입력 배경, 보조 버튼 |
| `--color-ig-border` | `#B8D9E6` | Tide Line | 카드·구분선 |
| `--color-ig-text` | `#0B2E3D` | Deep Ocean | 본문 |
| `--color-ig-text-secondary` | `#5A8494` | Mist Gray | 부가 텍스트 |
| `--color-ig-bg` | `#F3FAFC` | Aqua Mist | 페이지 배경 |
| `--color-ig-red` | `#E07A5F` | Salmon Coral | 찜(좋아요), 경고 |
| `--color-ig-link` | `#087CA7` | Harbor Blue | 텍스트 링크 |

### 그라데이션
- **입고 링** (구 스토리 링): `#0077B6 → #00B4D8 → #48CAE4 → #90E0EF`
- **히어로/배경** (선택): `linear-gradient(180deg, #F3FAFC 0%, #E8F6FA 100%)`

### Instagram 대비
| Instagram | i am not a fishmonger |
|-----------|----------------------|
| `#0095f6` 블루 | `#0A7EA4` 오션 틸 |
| `#fafafa` 회색 배경 | `#F3FAFC` 아쿠아 미스트 |
| 핑크-오렌지 스토리 링 | 블루-민트 입고 링 |
| Fredoka 둥근 폰트 | DM Serif + Outfit |

---

## 3. 용어·텍스트 매핑

기능(URL·API)은 유지하고 **화면 라벨만** 이커머스 맥락으로 변경.

| Instagram 용어 | 수산 이커머스 용어 | 기능 (변경 없음) |
|----------------|-------------------|------------------|
| 피드 | **시장가** | 홈 게시물 목록 `/` |
| 스토리 | **오늘 입고** | 24h 입고 소식 |
| 릴스 | **현장영상** | 짧은 영상 `/reels` |
| 탐색 | **카탈로그** | 그리드 탐색 `/explore` |
| 검색 | **검색** | 상품·거래처 검색 |
| 만들기 | **등록** | 게시물/입고 등록 |
| 메시지 | **거래문의** | DM |
| 알림 | **알림** | 동일 |
| 프로필 | **거래처** | 업체 프로필 |
| 회원님을 위한 추천 | **추천 거래처** | suggested users |
| 좋아요 (UI) | **찜** (aria/토스트는 기존 유지 가능) | like API |
| 페이스북 로그인 | **제거** | — |
| 메타 푸터 | **수산 도매·이용약관 링크** | — |

### 인증 카피
- 로그인 placeholder: `거래처 ID, 이메일 또는 연락처`
- 가입 헤드: `신선한 수산물 거래를 시작하려면 가입하세요.`
- 환영 카드: `도매·소매 수산물 거래 플랫폼에 오신 것을 환영합니다`

---

## 4. 컴포넌트별 변경 사항

### 4.1 디자인 시스템 (`index.css`)
- `@theme` 색상 전면 교체
- `.story-ring` → 오션 그라데이션 (입고 링)
- `.story-ring-viewed` → `#B8D9E6`
- `.feed-card` → `border-radius: 12px`, 얕은 그림자, 흰색 카드
- `.font-instagram` → `.font-brand` (DM Serif)
- `body` 배경: 아쿠아 미스트 + 미세 그라데이션

### 4.2 로고 (`InstagramLogo.tsx`)
- 워드마크 + `BrandIcon` (파도/물고기)
- 카메라 SVG 제거

### 4.3 레이아웃
| 컴포넌트 | 변경 |
|----------|------|
| `Sidebar` | 네비 라벨 이커머스화, 흰색→`bg-white/95` + 해양 border |
| `BottomNav` | aria-label 용어 변경, 활성 ring → `ring-ig-primary` |
| `Header` / `MobileHeaderIconStrip` | 로고·타이틀 용어 |
| `MainLayout` | `bg-ig-bg` 그라데이션 |
| `SiteFooter` | 수산·도매 관련 링크 |
| `SuggestionsPanel` | 환영·추천 거래처 카피 |

### 4.4 인증
| 컴포넌트 | 변경 |
|----------|------|
| `LoginForm` | Facebook 버튼 제거, 카드 `rounded-xl`, placeholder |
| `SignupForm` | 가입 카피, 약관 문구 유지 |
| `LoginPage` / `SignupPage` | Meta 푸터 → 플랫폼 푸터 |

### 4.5 피드·콘텐츠
| 컴포넌트 | 변경 |
|----------|------|
| `StoryBar` | "내 스토리" → "오늘 입고" |
| `HomePage` | 빈 상태: "시장가에 등록된 상품이 없습니다" |
| `PostCard` | 토큰 색상만 (구조 동일) |
| `HeartSolidIcon` | 기본색 `#E07A5F` (Salmon) |

### 4.6 릴스·프로필·메시지
- 릴스 관련 UI 텍스트 → **현장영상**
- 스토리 편집/생성 → **입고 소식**
- `ChatPanel` → 거래 문의 카피

### 4.7 관리자
- Admin 테마: 기존 다크 유지 (변경 최소)

---

## 5. 레이아웃 개선안

### 5.1 홈 (시장가)
```
┌─────────────────────────────────────────┐
│  [로고]              ♥ 알림  ✉ 거래문의 │  ← 모바일 헤더 (오션 배경)
├─────────────────────────────────────────┤
│  ○ ○ ○ ○  오늘 입고 스크롤 (입고 링)     │
├─────────────────────────────────────────┤
│  추천 거래처 strip                       │
├─────────────────────────────────────────┤
│  ┌─ 상품 카드 (rounded-xl, shadow-sm) ─┐ │
│  │ 업체명 · 찜 · 거래문의              │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 5.2 데스크톱
- 좌측 사이드바 245px — 흰색 + 오른쪽 `border-ig-border`
- 중앙 피드 max-width 630px (유지)
- 우측 추천 거래처 320px

### 5.3 카드 스타일
- 모서리: `12px` (Instagram 8px보다 부드럽게 — 상품 카탈로그 느낌)
- 그림자: `0 1px 3px rgba(11, 46, 61, 0.08)`
- 이미지: aspect-ratio 유지, 상단 모서리만 radius (캐러셀)

### 5.4 접근성
- 대비: 본문 `#0B2E3D` on `#F3FAFC` — WCAG AA
- 포커스: `ring-2 ring-ig-primary ring-offset-2`

---

## 6. 파일 변경 체크리스트

### 필수 (Tier 1)
- [x] `frontend/src/index.css`
- [x] `frontend/index.html`
- [x] `frontend/public/brand-icon.svg`
- [x] `frontend/src/components/common/InstagramLogo.tsx`

### 레이아웃·인증 (Tier 2)
- [x] `Sidebar.tsx`, `BottomNav.tsx`, `Header.tsx`, `MobileHeaderIconStrip.tsx`
- [x] `LoginForm.tsx`, `SignupForm.tsx`, `LoginPage.tsx`, `SignupPage.tsx`
- [x] `SuggestionsPanel.tsx`, `SiteFooter.tsx`, `useMobileChrome.ts`

### 콘텐츠 카피 (Tier 3)
- [x] `StoryBar.tsx`, `HomePage.tsx`, `SuggestedUsersStrip.tsx`
- [x] `ChatPanel.tsx`, `ReelsPage.tsx`, `ProfileReelsGrid.tsx`
- [x] `CreateStory.tsx`, `CreateReel.tsx`, `StoryEditor.tsx`
- [x] `App.tsx` (toast 색상)

### 자동 반영 (Tier 4)
- `ig-*` Tailwind 클래스를 쓰는 ~65개 파일 — `@theme` 값 변경으로 일괄 색상 전환

---

## 7. 구현 원칙

1. **API·라우트·상태 로직 변경 금지** — 디자인·카피만
2. **컴포넌트 파일명** (`InstagramLogo` 등) — 리팩터링 범위 축소를 위해 유지 가능
3. **프로덕션 빌드** — `VITE_*` 환경변수 규칙 유지 (guide.md)
4. **향후 확장** — `sea-*` 토큰 alias 추가 가능 (현재는 `ig-*` 값 교체)

---

## 8. 참고

- 프로젝트 가이드: `guide.md`
- 프론트 상세(기능): `front.md`
- 배포: `deploy/GITHUB_ACTIONS.md`
