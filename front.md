# Instagram 클론 — 프론트엔드 명세서

## 1. 개요

| 항목 | 내용 |
|------|------|
| 프레임워크 | React 18+ (Vite) |
| 언어 | TypeScript |
| 상태 관리 | React Context + TanStack Query |
| 라우팅 | React Router v6 |
| HTTP 클라이언트 | Axios |
| 스타일링 | Tailwind CSS |
| UI 컴포넌트 | Headless UI / Radix UI (모달, 드롭다운) |
| 이미지 처리 | react-dropzone, lazy loading |
| 빌드 도구 | Vite |

---

## 2. 프로젝트 구조

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── api/                 # API 호출 함수
│   │   ├── auth.ts
│   │   ├── posts.ts
│   │   ├── users.ts
│   │   ├── stories.ts
│   │   ├── comments.ts
│   │   └── notifications.ts
│   ├── components/
│   │   ├── layout/          # Header, Sidebar, BottomNav
│   │   ├── auth/            # LoginForm, SignupForm
│   │   ├── post/            # PostCard, PostModal, CreatePost
│   │   ├── story/           # StoryBar, StoryViewer
│   │   ├── profile/         # ProfileHeader, ProfileGrid
│   │   ├── comment/         # CommentList, CommentInput
│   │   └── common/          # Avatar, Button, Modal, Spinner
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useInfiniteScroll.ts
│   │   └── useDebounce.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── ExplorePage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── PostDetailPage.tsx
│   │   ├── EditProfilePage.tsx
│   │   ├── SearchPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatDate.ts
│   │   └── validateForm.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 3. 페이지 명세

### 3.1 인증 페이지

#### `/login` — 로그인
- 이메일/사용자명 + 비밀번호 입력
- 클라이언트 유효성 검사 (빈 값, 형식)
- 로그인 성공 시 JWT 저장 → `/` 리다이렉트
- "계정이 없으신가요? 가입하기" 링크

#### `/signup` — 회원가입
- 입력 필드: 이메일, 사용자명, 전체 이름, 비밀번호
- 실시간 사용자명 중복 확인 (debounce 500ms)
- 비밀번호 강도 표시 (최소 8자)
- 가입 성공 시 자동 로그인 → `/` 리다이렉트

### 3.2 메인 페이지

#### `/` — 홈 피드
- **스토리 바**: 팔로우 중인 사용자 + 본인 스토리 (가로 스크롤)
- **게시물 피드**: 팔로우한 사용자의 게시물 (무한 스크롤)
- 각 PostCard 구성:
  - 작성자 아바타 + 사용자명 (프로필 링크)
  - 게시물 이미지 (더블탭 좋아요)
  - 좋아요 / 댓글 / 공유 / 저장 버튼
  - 좋아요 수, 댓글 미리보기 (최대 2개)
  - 작성 시간 (상대 시간: "3시간 전")
- 피드 끝: "모든 게시물을 확인했습니다" 메시지

#### `/explore` — 탐색
- Masonry 그리드 레이아웃 (인기/최신 게시물)
- 호버 시 좋아요 수 / 댓글 수 오버레이
- 클릭 시 PostModal 열림

#### `/search` — 검색
- 검색 입력창 (사용자명 기준)
- debounce 300ms 후 API 호출
- 검색 결과: 아바타 + 사용자명 + 전체 이름
- 팔로우/언팔로우 버튼 (로그인 사용자 기준)

### 3.3 프로필 페이지

#### `/profile/:username` — 사용자 프로필
- **헤더**: 아바타, 게시물/팔로워/팔로잉 수, 소개(bio), 웹사이트
- **액션 버튼**:
  - 본인: "프로필 편집" / "로그아웃"
  - 타인: "팔로우" / "언팔로우" / "메시지"(선택)
- **탭**: 게시물 그리드 / 저장됨(본인만)
- 게시물 그리드: 3열, 클릭 시 PostModal

#### `/profile/edit` — 프로필 편집
- 수정 가능: 전체 이름, 소개, 웹사이트, 프로필 사진
- 이미지 업로드: 미리보기 + 크롭(선택)
- 저장 / 취소 버튼

### 3.4 게시물

#### PostModal (오버레이)
- 좌: 이미지 / 우: 댓글 패널 (데스크톱)
- 모바일: 전체 화면, 댓글 아래
- 댓글 목록 + 댓글 입력
- 좋아요 토글, 삭제(본인 게시물)

#### CreatePostModal
- 이미지 드래그&드롭 또는 파일 선택
- 캡션 입력 (최대 2,200자)
- 위치 태그(선택)
- "공유" 버튼 → 업로드 진행률 표시

### 3.5 스토리

#### StoryViewer (전체 화면)
- 5초 자동 진행 (프로gress bar)
- 좌/우 탭: 이전/다음 스토리
- 상단: 작성자 정보 + 시간
- 하단: DM 답장 입력(선택)

---

## 4. 레이아웃 컴포넌트

### Header (데스크톱, ≥768px)
```
[Instagram 로고]  [검색바]  [홈][탐색][만들기][프로필]
```

### BottomNav (모바일, <768px)
```
[홈] [탐색] [+] [알림] [프로필]
```

### Sidebar (데스크톱)
- Instagram 로고
- 네비게이션 메뉴 (아이콘 + 텍스트)
- 현재 사용자 아바타 + 사용자명

---

## 5. API 연동 명세

### Base URL
```
개발: http://localhost:8000/api/v1
```

### 인증 헤더
```typescript
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### 주요 API 호출

| 기능 | Method | Endpoint | Hook/함수 |
|------|--------|----------|-----------|
| 로그인 | POST | `/auth/login` | `useLogin()` |
| 회원가입 | POST | `/auth/register` | `useRegister()` |
| 피드 조회 | GET | `/posts/feed?page=&limit=` | `useFeed()` |
| 게시물 생성 | POST | `/posts/` (multipart) | `useCreatePost()` |
| 좋아요 토글 | POST | `/posts/{id}/like` | `useToggleLike()` |
| 댓글 목록 | GET | `/posts/{id}/comments` | `useComments()` |
| 댓글 작성 | POST | `/posts/{id}/comments` | `useAddComment()` |
| 프로필 조회 | GET | `/users/{username}` | `useProfile()` |
| 팔로우 | POST | `/users/{id}/follow` | `useFollow()` |
| 스토리 목록 | GET | `/stories/feed` | `useStories()` |
| 사용자 검색 | GET | `/users/search?q=` | `useSearch()` |

### TanStack Query 설정
```typescript
// 피드: 무한 스크롤
useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam = 1 }) => fetchFeed(pageParam),
  getNextPageParam: (lastPage) => lastPage.next_page,
});

// 낙관적 업데이트: 좋아요
onMutate: async (postId) => {
  // 캐시에서 like_count + 1, is_liked = true
}
```

---

## 6. TypeScript 타입 정의

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  bio?: string;
  website?: string;
  avatar_url?: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  is_following?: boolean;
  is_own_profile?: boolean;
}

interface Post {
  id: number;
  user: User;
  image_url: string;
  caption?: string;
  location?: string;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_saved: boolean;
  created_at: string;
}

interface Comment {
  id: number;
  user: User;
  content: string;
  created_at: string;
}

interface Story {
  id: number;
  user: User;
  items: StoryItem[];
  viewed: boolean;
}

interface StoryItem {
  id: number;
  image_url: string;
  created_at: string;
}
```

---

## 7. UI/UX 요구사항

### 반응형 브레이크포인트
| 이름 | 너비 | 레이아웃 |
|------|------|----------|
| mobile | < 768px | BottomNav, 단일 컬럼 |
| tablet | 768–1024px | Sidebar 축소 (아이콘만) |
| desktop | > 1024px | Sidebar + 중앙 피드 + 우측 추천 |

### 인터랙션
- **더블탭 좋아요**: 게시물 이미지 더블탭 → 하트 애니메이션 + API 호출
- **무한 스크롤**: Intersection Observer, 하단 200px 전 preload
- **스켈레톤 UI**: 로딩 중 Placeholder 표시
- **토스트 알림**: 성공/에러 메시지 (react-hot-toast)
- **낙관적 UI**: 좋아요, 팔로우 즉시 반영 후 실패 시 롤백

### 접근성
- 모든 이미지에 `alt` 텍스트
- 버튼에 `aria-label`
- 키보드 네비게이션 (Tab, Enter, Escape)
- 색상 대비 WCAG AA 준수

---

## 8. 환경 변수

```env
# .env.development
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_MEDIA_BASE_URL=http://localhost:8000/media
```

---

## 9. 개발 우선순위

| 단계 | 기능 | 예상 기간 |
|------|------|-----------|
| 1 | 프로젝트 셋업, 라우팅, 레이아웃 | 1일 |
| 2 | 로그인/회원가입 | 1일 |
| 3 | 홈 피드 + PostCard | 2일 |
| 4 | 게시물 생성/삭제 | 1일 |
| 5 | 좋아요/댓글 | 1일 |
| 6 | 프로필 페이지 | 1일 |
| 7 | 팔로우/언팔로우 | 0.5일 |
| 8 | 탐색/검색 | 1일 |
| 9 | 스토리 | - |
| 10 | 반응형 + polish | 1일 |

---

## 10. 품질 기준

- [ ] TypeScript strict mode, `any` 사용 금지
- [ ] ESLint + Prettier 설정
- [ ] 주요 컴포넌트 Storybook 문서화 (선택)
- [ ] Lighthouse Performance ≥ 80
- [ ] 모든 API 에러 사용자 친화적 메시지 표시
- [ ] 401 응답 시 자동 로그아웃 + `/login` 리다이렉트
