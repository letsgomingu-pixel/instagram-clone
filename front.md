# i am not a fishmonger — 프론트엔드 현황

> Instagram UI를 참고해 만든 개인 프로젝트의 프론트엔드. 원래 이름은 "Instagram 클론"이었으나 브랜드를 **"i am not a fishmonger"**로 변경했다(로고/타이틀/카피 전체 반영 완료, 컴포넌트·파일명만 `Instagram*`로 남아있음 — 아래 11장 참고).
> 이 문서는 실제 코드(`frontend/src`)를 기준으로 작성되었다. 개발 착수 전 작성된 기획 문서가 아니다.

---

## 1. 기술 스택

| 항목 | 실제 사용 |
|------|------|
| 프레임워크 | React 19 (Vite 8) |
| 언어 | TypeScript ~6.0 |
| 라우팅 | React Router v7 |
| 상태 관리 | React Context 2개 (`AuthContext`, `AppContext`) — Redux/Zustand 없음 |
| HTTP 클라이언트 | Axios |
| 스타일링 | Tailwind CSS v4 (CSS-first `@theme`, 별도 `tailwind.config.js` 없음) |
| 아이콘 | lucide-react + 직접 그린 SVG(`InstagramActionIcons.tsx`, `ReelsIcon.tsx`, `ExploreIcon.tsx`) |
| 이미지 업로드 | react-dropzone |
| 토스트 | react-hot-toast |
| 데이터 패칭 | `@tanstack/react-query`가 설치는 되어 있으나(Provider만 wrap) 실제 데이터는 대부분 `AppContext` + 직접 axios 호출로 관리됨 |
| 린트 | oxlint (ESLint 아님) |
| 테스트 | 없음 (`*.test.*` 파일 없음, 루트의 Playwright E2E는 `e2e/` 별도) |

`package.json` 스크립트: `dev`(vite), `build`(`tsc -b && vite build`), `lint`(oxlint), `preview`.

---

## 2. 프로젝트 구조 (실제)

```
frontend/
├── public/
│   ├── favicon.svg        # 빈 파일(0바이트, 미사용)
│   ├── icons.svg          # 소셜 아이콘 스프라이트
│   └── instagram.svg      # 실제 파비콘(index.html에서 참조), 보라색 카메라 글리프
├── src/
│   ├── api/                 # auth, posts, users, stories, reels, conversations,
│   │                         # notifications, settings, security, admin, health, client, index
│   ├── assets/
│   ├── components/
│   │   ├── admin/            # AdminLayout
│   │   ├── auth/              # LoginForm, SignupForm, ProtectedRoute, AdminRoute
│   │   ├── comment/           # CommentInput, CommentList
│   │   ├── common/            # Avatar, Button, Modal, Spinner, InstagramLogo, InstagramActionIcons, ...
│   │   ├── explore/           # ExploreGrid
│   │   ├── layout/            # Sidebar, Header(MobileHeader), BottomNav, MainLayout, SuggestionsPanel, SiteFooter, ...
│   │   ├── message/            # ChatPanel, ConversationList
│   │   ├── notification/       # NotificationItem
│   │   ├── post/               # PostCard, PostModal, CreatePost, PostActionIcons, ...
│   │   ├── profile/            # ProfileHeader, ProfileGrid, ProfileReelsGrid, ProfileTaggedGrid
│   │   ├── reels/               # CreateReel, ReelsViewer
│   │   ├── settings/            # SettingsLayout, SettingsNav, SettingsToggle
│   │   └── story/                # StoryBar, StoryViewer, StoryEditor, CreateStory, StoryOverlayLayer
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── AppContext.tsx
│   ├── hooks/
│   │   ├── useAuth.ts, useDebounce.ts, useInfiniteScroll.ts,
│   │   └── useMobileChrome.ts, useRequireAuth.ts, useUnreadBadges.ts
│   ├── pages/
│   │   ├── HomePage, LoginPage, SignupPage, ExplorePage(리다이렉트), SearchPage,
│   │   ├── ProfilePage, PostDetailPage, MessagesPage, NotificationsPage,
│   │   ├── ReelsPage, SuggestedUsersPage, EditProfilePage(리다이렉트), NotFoundPage
│   │   ├── admin/  (AdminDashboardPage, AdminLoginPage, AdminUsersPage, AdminPostsPage)
│   │   └── settings/ (SettingsIndexPage, SettingsEditProfilePage, SettingsNotificationsPage,
│   │                   SettingsPrivacyPage, SettingsSecurityPage, SettingsAccountPage)
│   ├── types/index.ts
│   ├── utils/ (cn, formatDate, media, messages, notifications, validateForm)
│   ├── App.tsx, main.tsx, index.css
├── index.html
├── package.json, vite.config.ts, tsconfig*.json
```

---

## 3. 라우팅 (`App.tsx`)

`BrowserRouter` 안에 `QueryClientProvider → AuthProvider → AppProvider → Toaster` 순으로 감싸져 있다.

| 경로 | 컴포넌트 | 레이아웃 | 접근 제어 |
|---|---|---|---|
| `/login` | LoginPage | 자체 | `GuestRoute` (로그인 상태면 이동) |
| `/signup` | SignupPage | 자체 | `GuestRoute` |
| `/admin/login` | AdminLoginPage | 자체(다크 테마) | `AdminGuestRoute` |
| `/admin`, `/admin/users`, `/admin/posts` | AdminDashboard/Users/PostsPage | `AdminLayout` | `AdminRoute` (`user.is_admin`) |
| `/` | HomePage | `MainLayout` | 공개 |
| `/explore` | ExplorePage | `MainLayout` | `/search`로 리다이렉트하는 껍데기(레거시 링크 보존용) |
| `/search` | SearchPage | `MainLayout` | 공개 |
| `/reels` | ReelsPage | `MainLayout` | 공개 |
| `/suggested` | SuggestedUsersPage | `MainLayout` | 공개 |
| `/profile/:username` | ProfilePage | `MainLayout` | 공개 |
| `/p/:postId` | PostDetailPage | `MainLayout` | 공개 |
| `/notifications` | NotificationsPage | `MainLayout` | 공개 라우트지만 페이지 내부에서 비로그인 시 `/login`으로 리다이렉트 |
| `/messages`, `/messages/:username` | MessagesPage | `MainLayout showSuggestions={false}` | `ProtectedRoute` |
| `/profile/edit` | EditProfilePage | `MainLayout showSuggestions={false}` | `/settings/edit`로 리다이렉트하는 껍데기 |
| `/settings/*` | SettingsLayout + 하위 페이지 | `MainLayout showSuggestions={false}` | `ProtectedRoute` |
| `*` | NotFoundPage | 없음 | 공개 |

가드 컴포넌트는 `components/auth/ProtectedRoute.tsx`(`ProtectedRoute`, `GuestRoute`)와 `components/auth/AdminRoute.tsx`(`AdminRoute`, `AdminGuestRoute`)에 있다.

---

## 4. 상태 관리

**AuthContext** — `user`, `isAuthenticated`, `isLoading`, `login/register/logout/updateUser`. 마운트 시 `localStorage`에 토큰이 있으면 `GET /auth/me`로 세션을 복원한다. axios 인터셉터가 401을 받으면 `window` 커스텀 이벤트(`auth:session-expired`)를 던지고, `AuthContext`가 이를 구독해 로그아웃 처리한다.

**AppContext** — 앱의 실질적인 클라이언트 데이터 저장소. `posts`, `explorePosts`, `reels`, `stories`, `suggestedUsers`와 각각의 로딩/페이지네이션 상태, 그리고 `selectedPost`/모달 오픈 상태들을 들고 있다. `toggleLike/toggleSave/toggleFollow` 등은 **낙관적 업데이트**로 구현되어 있어, 같은 게시물/유저가 등장하는 모든 리스트(피드, 탐색, 릴스, 프로필 그리드, 추천 목록 등)를 동시에 갱신하고 실패 시 롤백한다.

---

## 5. 페이지 요약

- **HomePage** `/` — StoryBar + 무한 스크롤 피드(PostCard 목록), 모바일에서는 SuggestedUsersStrip도 노출.
- **SearchPage** `/search` — 사용자명 검색(디바운스) + 검색어 없을 때 ExploreGrid(탐색 그리드) 표시.
- **ReelsPage** `/reels` — 세로 스냅 스크롤 릴스 뷰어, 좋아요/댓글/팔로우, "+ 릴스" 업로드.
- **ProfilePage** `/profile/:username` — 프로필 헤더 + 탭(게시물/릴스/저장됨(본인만)/태그됨).
- **PostDetailPage** `/p/:postId` — 퍼머링크, 단일 게시물을 PostModal로 오픈.
- **MessagesPage** `/messages(/:username)` — DM 목록 + 대화창, 4초 폴링.
- **NotificationsPage** `/notifications` — "회원님"/"팔로잉" 탭, 기간별 그룹핑(신규/오늘/이번 주/이전).
- **SuggestedUsersPage** `/suggested` — 추천 사용자 전체 목록.
- **관리자 4페이지** — 대시보드(통계 카드), 사용자 관리(비활성화/삭제), 게시물 관리(삭제), 별도 로그인.
- **설정 6페이지** — 계정, 프로필 편집(아바타 업로드 포함), 알림, 개인정보(공개 범위), 보안(비밀번호 변경, 로그인 세션 관리, **TOTP 2단계 인증** 설정/해제).
- **레거시 리다이렉트 2개**: `ExplorePage`(→`/search`), `EditProfilePage`(→`/settings/edit`) — 옛 링크 호환용 껍데기.

---

## 6. API 모듈 (`src/api/`)

| 파일 | 주요 함수 → 엔드포인트 |
|------|------------------------|
| `client.ts` | axios 인스턴스, 401 인터셉터, `Authorization: Bearer` 자동 첨부 |
| `auth.ts` | `login`→`POST /auth/login`, `register`→`POST /auth/register`, `getMe`→`GET /auth/me` |
| `posts.ts` | `getFeed`→`GET /posts/feed`, `getExplore`→`GET /posts/explore`, `getSavedPosts`→`GET /posts/saved`, `createPost`→`POST /posts`, `toggleLike`→`POST /posts/:id/like`, `toggleSave`→`POST /posts/:id/save`, `addComment`/`getPostComments`/`deleteComment`, `getPostLikes` |
| `users.ts` | `getUserProfile`, `updateProfile`, `uploadAvatar`, `checkUsername`, `getSuggestedUsers`, `followUser`/`unfollowUser`, `getUserPosts`/`getUserReels`/`getUserTaggedPosts`, `searchUsersApi` |
| `stories.ts` | `getStoriesFeed`, `createStory`, `markStoryViewed` |
| `reels.ts` | `getReelsFeed`, `toggleReelLike`, `viewReel`, `createReel` |
| `conversations.ts` | `getConversations`, `getMessages`, `sendMessage` |
| `notifications.ts` | `getNotifications`, `markNotificationRead` |
| `settings.ts` | `getMySettings`/`updateMySettings`, `changePassword` |
| `security.ts` | 로그인 세션 조회/해지/신뢰 설정, 2FA setup/enable/disable, 로그인 이메일 알림 토글 |
| `admin.ts` | 통계, 사용자/게시물 목록·삭제·상태변경 |
| `index.ts` | 위 모듈 대부분을 재export하는 배럴 (단, `security.ts`/`admin.ts`는 직접 import 필요) |

---

## 7. 커스텀 훅

| 훅 | 역할 |
|---|---|
| `useAuth` | `AuthContext`의 재export |
| `useDebounce` | 값 디바운스 |
| `useInfiniteScroll` | `IntersectionObserver` 기반 무한 스크롤 sentinel |
| `useMobileChrome` | 경로 → 모바일 헤더/하단 네비 표시 여부·variant 매핑 |
| `useRequireAuth` | 비로그인 사용자의 액션 시 `/login`으로 유도(`state:{from}`로 복귀 경로 저장) — 좋아요/댓글/팔로우 등 대부분의 인터랙션이 이걸로 게이팅됨 |
| `useUnreadBadges` | 대화/알림 안읽음 수 30초 폴링 |

---

## 8. 타입 (`src/types/index.ts`)

```typescript
interface User {
  id: number; username: string; email: string; full_name: string;
  bio?: string; website?: string; avatar_url?: string;
  post_count: number; follower_count: number; following_count: number;
  is_following?: boolean; is_own_profile?: boolean; is_admin?: boolean;
}

interface PostMedia { id: number; media_url: string; media_type: 'image' | 'video'; position: number; }

interface Post {
  id: number; user: User; image_url: string; caption?: string; location?: string;
  like_count: number; comment_count: number; is_liked: boolean; is_saved: boolean;
  created_at: string; comments?: Comment[]; tagged_users?: User[]; media?: PostMedia[];
}

interface Reel {
  id: number; user: User; thumbnail_url: string; video_url?: string; caption?: string;
  audio_name?: string; like_count: number; comment_count: number; view_count: number;
  is_liked: boolean; created_at: string;
}

interface Comment { id: number; user: User; content: string; created_at: string; }
interface Story { id: number; user: User; items: StoryItem[]; viewed: boolean; }
interface StoryItem { id: number; image_url: string; media_type: string; overlays?: StoryOverlay[]; created_at: string; }
interface StoryOverlay { id: string; type: 'text' | 'sticker'; content: string; x: number; y: number; scale?: number; rotation?: number; color?: string; font_size?: number; }

interface Message { id: number; sender_id: number; content: string; created_at: string; is_read: boolean; }
interface Conversation { id: number; participant: User; messages: Message[]; last_message: Message; unread_count: number; }

type NotificationType = 'like' | 'follow' | 'comment';
type NotificationTab = 'you' | 'following';
interface Notification {
  id: number; type: NotificationType; tab: NotificationTab; actor: User;
  target_username?: string; post_id?: number; post_image_url?: string;
  comment_preview?: string; created_at: string; is_read: boolean;
}

interface PaginatedResponse<T> { items: T[]; total: number; page: number; limit: number; next_page: number | null; }
```

그 외 `AdminStats`/`AdminUser`(admin.ts), `UserSettings`(settings.ts), `SecuritySummary`/`LoginSession`/`TwoFactorSetup`(security.ts)는 각 API 모듈 파일 안에 인라인으로 선언되어 있다.

---

## 9. 유틸리티 (`src/utils/`)

- **media.ts** — `resolveMediaUrl(url)`: 백엔드 상대 경로를 실제 로드 가능한 URL로 바꾸는 핵심 함수. `Avatar`, `MediaImage`, `PostMediaCarousel` 등 이미지/영상을 그리는 모든 컴포넌트가 이걸 거친다. **프로덕션에서 `localhost` 하드코딩 때문에 이미지가 전혀 안 뜨던 실제 장애를 고친 이후**, 현재는 같은 오리진(`window.location.origin`) 기준으로 상대 경로를 해석한다.
- **formatDate.ts** — 상대 시간("3시간 전"), 숫자 축약(1.2K/3M) 포맷터.
- **messages.ts** / **notifications.ts** — 채팅·알림 화면 전용 시간 포맷 및 알림 문구 생성/기간별 그룹핑.
- **validateForm.ts** — 이메일/사용자명/비밀번호 검증, 비밀번호 강도 판정.
- **cn.ts** — 클래스명 조인 헬퍼.

---

## 10. 디자인 시스템 (`src/index.css`)

Tailwind v4 CSS-first 설정(`@theme`), 별도 `tailwind.config.js` 없음.

```css
@theme {
  --font-instagram: "Fredoka", sans-serif;
  --color-ig-primary: #0095f6;
  --color-ig-primary-hover: #1877f2;
  --color-ig-secondary: #efefef;
  --color-ig-border: #dbdbdb;
  --color-ig-text: #262626;
  --color-ig-text-secondary: #8e8e8e;
  --color-ig-bg: #fafafa;
  --color-ig-red: #ed4956;
  --color-ig-link: #00376b;
}
```

- 본문 폰트는 시스템 폰트 스택, 로고(`.font-instagram`)만 Google Fonts **Fredoka**(500/600/700) 사용.
- 로고 컴포넌트(`InstagramLogo.tsx`)는 문자열 **"i am not a fishmonger"**를 렌더링한다(과거 "Instagram" + 필기체 "Grand Hotel" 폰트에서 교체됨). 브라우저 탭 제목도 동일하게 변경됨. 파비콘은 `/instagram.svg`(보라색 카메라 글리프, 실제 Instagram 로고 아님).
- `.story-ring`(오렌지→레드→핑크→퍼플 그라데이션), `.story-ring-viewed`(회색), `.feed-card`, safe-area 대응 클래스(`.mobile-header-safe` 등) 존재.

---

## 11. 남아있는 "Instagram" 표기

브랜드 리네이밍은 **사용자에게 보이는 텍스트 전부**(로고, 페이지 타이틀, 환영 카드, 로그인/회원가입 하단 문구, 404 페이지, 빈 채팅방 캡션, 관리자 콘솔 라벨 등)에 반영 완료. 다음은 화면에 노출되지 않는 내부 식별자라 의도적으로 그대로 두었다:

- 컴포넌트/파일명: `InstagramLogo.tsx`, `InstagramActionIcons.tsx`, `InstagramIcon`(export 이름)
- 코드 주석: `// Real Instagram's profile page is...` 등, 실제 Instagram UI와 비교하는 설명용 주석

---

## 12. 환경 변수 (`import.meta.env`)

| 변수 | 기본값(미설정 시) | 용도 |
|------|------|------|
| `VITE_API_BASE_URL` | `/api/v1` (동일 오리진 상대 경로) | axios `baseURL` |
| `VITE_MEDIA_BASE_URL` | `${window.location.origin}/media` | 미디어 URL 베이스 |

로컬 개발용 `frontend/.env.development`에는 `VITE_API_BASE_URL=/api/v1`, `VITE_MEDIA_BASE_URL=/media`가 설정되어 있어 Vite 프록시(`vite.config.ts`가 `/api`, `/media`를 `http://127.0.0.1:8001`로 프록시)를 탄다. **프로덕션에는 이 두 값이 의도적으로 설정되어 있지 않다** — 둘 다 비워둬야 코드의 기본값(상대 URL)이 적용되어 nginx 리버스 프록시를 통해 정상 동작한다. 과거 이 값이 `http://localhost:8000`으로 하드코딩되어 있어 실제 방문자 브라우저가 자기 자신에게 요청을 보내던 프로덕션 장애가 있었다(회원가입 "사용자명 사용 불가" 오표시, 이미지 미표시의 원인).

---

## 13. 모바일/반응형

`useMobileChrome(pathname)`이 경로별로 모바일 헤더 표시 여부·variant(`home`/`back-title`/`profile`/`title-only`/`none`)와 하단 네비 표시 여부를 결정한다. 데스크톱(`md:` 768px 이상)은 좌측 고정 `Sidebar`(245px, `lg:` 1024px 미만에서는 아이콘만)와 우측 `SuggestionsPanel`(explore/reels/messages/notifications/settings/suggested/profile 페이지에서는 숨김)을 보여준다. `/messages/:username`은 모바일에서 헤더/하단 네비를 완전히 숨기는 전체화면 채팅 모드로 특별 처리된다.

---

## 14. 특기 사항

- **동일 오리진 API 패턴**: 프론트가 백엔드 절대 URL을 모르는 구조. dev는 Vite 프록시, prod는 nginx `proxy_pass`가 `/api`, `/media`를 백엔드로 넘긴다.
- **낙관적 UI 전반**: 좋아요/저장/팔로우가 API 응답을 기다리지 않고 즉시 화면에 반영되고, 실패 시 롤백 + 토스트.
- **게스트 모드**: 비로그인 사용자도 피드/탐색/릴스/프로필을 읽기 전용으로 볼 수 있고, 인터랙션 시도 시 `useRequireAuth`가 로그인 페이지로 유도(복귀 경로 저장).
- **2FA/보안 설정**: TOTP 기반 2단계 인증 설정·해제, 로그인 세션 목록/신뢰 기기 관리가 설정 페이지에 구현되어 있음.
- **관리자 콘솔**: `/admin/*`는 메인 사이트와 별개의 다크 테마 레이아웃 + 자체 로그인 페이지를 가진 미니 앱. 인증은 메인 사이트와 동일한 JWT를 쓰되 `user.is_admin`으로 게이팅.
- **테스트 없음**: 단위/통합 테스트 프레임워크 미설정. 루트 `e2e/`에 Playwright 스펙이 별도로 존재(`npm run e2e`).
