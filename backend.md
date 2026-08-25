# Instagram 클론 — 백엔드 개발 명세서 (v2)

> **기준:** 현재 구현된 프론트엔드(`frontend/src`) UI·타입·Mock 데이터  
> **DB:** 개발·프로덕션 모두 **SQLite**  
> **원칙:** 화면에 존재하는 기능만 API·DB로 구현한다. UI만 있고 저장/조회가 없는 설정 화면은 백엔드 범위에서 제외한다.

---

## 1. 문서 목적

| 항목 | 내용 |
|------|------|
| 대상 | FastAPI 백엔드 1차 완성 (프론트 Mock → API 연동 가능 상태) |
| 프론트 기준일 | 2026-08-15 기준 라우트·컴포넌트·`types/index.ts` |
| API Base | `/api/v1` (`frontend/src/api/client.ts`와 동일) |
| DB 파일 | SQLite 단일 파일 (환경별 경로만 분리) |
| 상세 DB DDL | `db.md`와 함께 관리 (본 문서 §5에서 프론트 대응 테이블만 정의) |

---

## 2. 프론트엔드 기능 ↔ 백엔드 매핑

### 2.1 구현 대상 (In Scope)

| 프론트 화면/기능 | 라우트·컴포넌트 | 필요 API | DB 테이블 |
|-----------------|----------------|----------|-----------|
| 로그인 | `/login` | `POST /auth/login` | `users` |
| 회원가입 | `/signup` | `POST /auth/register`, `GET /users/check-username` | `users` |
| 세션 유지 | `AuthContext` | `GET /auth/me` | `users` |
| 로그아웃 | 설정 > 계정 | 클라이언트 토큰 삭제 (서버 stateless) | — |
| 홈 피드 | `/` `HomePage` | `GET /posts/feed` | `posts`, `follows`, `likes`, `saved_posts` |
| 무한 스크롤 | `useInfiniteScroll` | 피드 `page`/`limit` 페이지네이션 | — |
| 스토리 바·뷰어 | `StoryBar`, `StoryViewer` | `GET /stories/feed`, `POST /stories/{id}/view` | `stories`, `story_items`, `story_views` |
| 스토리 작성 | `CreateStoryModal`, `StoryEditor` | `POST /stories` (multipart) | `stories`, `story_items` |
| 게시물 카드·모달 | `PostCard`, `PostModal` | 피드/상세 응답에 포함 | `posts`, `comments`, `likes`, `saved_posts`, `post_tags` |
| 좋아요·저장 | `toggleLike`, `toggleSave` | `POST /posts/{id}/like`, `POST /posts/{id}/save` | `likes`, `saved_posts` |
| 댓글 조회·작성 | `CommentList`, `CommentInput` | `GET/POST /posts/{id}/comments` | `comments` |
| 게시물 작성 | `CreatePostModal` | `POST /posts` (multipart) | `posts` |
| 게시물 상세 | `/p/:postId` | `GET /posts/{id}` | `posts` |
| 태그 표시 | `TaggedUsers` | 게시물 응답 `tagged_users[]` | `post_tags` |
| 탐색 | `/explore` | `GET /posts/explore` | `posts` |
| 검색 | `/search` | `GET /search/users?q=` | `users` |
| 추천 사용자 | `SuggestionsPanel` | `GET /users/suggested` | `users`, `follows` |
| 프로필 | `/profile/:username` | `GET /users/{username}` | `users`, `follows` |
| 프로필 게시물 탭 | `ProfileGrid` | `GET /users/{username}/posts` | `posts` |
| 프로필 릴스 탭 | `ProfileReelsGrid` | `GET /users/{username}/reels` | `reels`, `reel_likes` |
| 프로필 저장 탭 | (본인만) | `GET /posts/saved` | `saved_posts` |
| 프로필 태그됨 탭 | `ProfileTaggedGrid` | `GET /users/{username}/tagged` | `post_tags`, `posts` |
| 팔로우/언팔로우 | 프로필·검색·알림 | `POST/DELETE /users/{id}/follow` | `follows` |
| 프로필 편집 | `/settings/edit` | `PUT /users/me`, `POST /users/me/avatar` | `users` |
| 설정 (알림·개인정보·비밀번호·보안) | `/settings/*` | `GET/PUT /users/me/settings`, `PUT /users/me/password`, `/users/me/security/*` | `user_settings`, `login_sessions` |
| 릴스 업로드 | `CreateReelModal`, `/reels` | `POST /reels` (multipart) | `reels` |
| 릴스 피드 | `/reels` `ReelsPage` | `GET /reels/feed` | `reels`, `reel_likes` |
| 릴스 뷰어·좋아요 | `ReelsViewer` | `POST /reels/{id}/like`, `POST /reels/{id}/view` | `reel_likes`, `reels.view_count` |
| 메시지 목록 | `/messages` | `GET /conversations` | `conversations`, `messages` |
| 1:1 채팅 | `/messages/:username` | `GET/POST /conversations/{username}/messages` | `conversations`, `messages` |
| 알림 (회원님·팔로잉 탭) | `/notifications` | `GET /notifications?tab=`, `PATCH /notifications/{id}/read` | `notifications` |
| 미디어 URL | 이미지 전반 | `GET /media/*` 정적 서빙 | 파일시스템 `media/` |

### 2.2 구현 제외 (Out of Scope)

프론트에 UI는 있으나 **DB/API가 필요 없거나**, **아직 동작이 Mock·로컬 state만**인 항목:

| 항목 | 이유 |
|------|------|
| 계정 비활성화·삭제 | 문구만 존재, 버튼·플로우 없음 |
| 프로필「보관함」버튼 | 동작 미구현 |
| 릴스 **업로드** UI | In Scope (`POST /reels`) |
| 해시태그·게시물 검색 | `/search`는 **사용자 검색만** |
| Refresh Token | 프론트 미사용 |
| WebSocket / 실시간 DM | REST 폴링 또는 요청 시 갱신으로 1차 구현 |
| 게시물·댓글·릴스 **삭제** | UI 없음 |
| 팔로워/팔로잉 **목록 모달** | 통계 숫자만 표시, 목록 화면 없음 |
| 알림 **일괄 읽음** | UI 없음 (`PATCH /notifications/read-all` 미구현) |
| 댓글 **목록 전용 GET** | `PostModal`은 게시물 응답의 `comments[]`만 사용 |

---

## 3. 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | FastAPI 0.110+ |
| 언어 | Python 3.11+ |
| ORM | SQLAlchemy 2.0 |
| DB | **SQLite 3** (dev·prod 공통) |
| 마이그레이션 | Alembic (`alembic upgrade head`) |
| 인증 | JWT (`python-jose`) + bcrypt |
| 업로드 | `python-multipart` + Pillow (이미지) + 원본 저장 (동영상) |
| 검증 | Pydantic v2 |
| API 문서 | FastAPI `/docs` |
| CORS | `fastapi.middleware.cors` |

---

## 4. SQLite 환경 (개발·프로덕션)

개발과 프로덕션 모두 SQLite를 사용한다. **엔진·ORM 코드는 동일**하고, **파일 경로와 SECRET_KEY만** 환경별로 분리한다.

### 4.1 `.env` 예시

**개발 (`backend/.env`)**
```env
APP_ENV=development
DATABASE_URL=sqlite:///./instagram.db
SECRET_KEY=dev-secret-key-change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MEDIA_ROOT=./media
MAX_UPLOAD_SIZE_MB=10
ALLOWED_ORIGINS=http://localhost:5173
```

**프로덕션 (`backend/.env.production`)**
```env
APP_ENV=production
DATABASE_URL=sqlite:///./data/instagram.db
SECRET_KEY=<strong-random-secret>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
MEDIA_ROOT=./data/media
MAX_UPLOAD_SIZE_MB=10
ALLOWED_ORIGINS=https://your-domain.com
```

### 4.2 SQLite 운영 설정

`database.py`에 이미 적용된 설정을 유지한다:

```python
connect_args={"check_same_thread": False}
PRAGMA journal_mode=WAL
PRAGMA foreign_keys=ON
```

**프로덕션 주의**
- `data/` 디렉터리는 배포 시 영속 볼륨에 마운트
- 정기 백업: `sqlite3 instagram.db ".backup backup/instagram_YYYYMMDD.db"`
- 동시 쓰기가 많지 않은 규모 전제 (Instagram 클론 학습·데모용)

---

## 5. 데이터베이스 스키마

**15개 테이블** 전체 정의·ERD·쿼리는 `db.md` v2를 단일 기준으로 한다. 본 절은 API 구현 시 참고용 요약이다.

| 테이블 | 용도 | 주요 API |
|--------|------|----------|
| `users` | 계정·프로필 | auth, users |
| `posts` | 피드 게시물 | posts, users/{username}/posts |
| `comments` | 게시물 댓글 | POST `/posts/{id}/comments` |
| `likes` | 게시물 좋아요 | POST `/posts/{id}/like` |
| `saved_posts` | 저장됨 탭 | GET `/posts/saved`, POST `/posts/{id}/save` |
| `follows` | 팔로우 | POST/DELETE `/users/{id}/follow` |
| `post_tags` | 사용자 태그 | Post 응답 `tagged_users[]`, GET `/users/{username}/tagged` |
| `stories` | 스토리 그룹 (24h) | GET `/stories/feed`, POST `/stories` |
| `story_items` | 스토리 슬라이드 (이미지·동영상·오버레이) | Story 응답 `items[]`, POST `/stories` |
| `story_views` | 스토리 조회 | POST `/stories/{id}/view` → `Story.viewed` |
| `user_settings` | 알림·개인정보 설정 | GET/PUT `/users/me/settings` |
| `reels` | 릴스 | GET `/reels/feed`, POST `/reels`, GET `/users/{username}/reels` |
| `reel_likes` | 릴스 좋아요 | POST `/reels/{id}/like` |
| `conversations` | 1:1 대화 | GET/POST `/conversations/{username}/messages` |
| `messages` | DM 메시지 | conversations API |
| `notifications` | 알림 (`tab`: you/following) | GET `/notifications?tab=` |

### 5.1 `notifications` — 알림 (API 연동 핵심)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK | |
| `recipient_id` | FK → users | 알림 수신자 (`NotificationsPage` 로그인 사용자) |
| `actor_id` | FK → users | 행위자 |
| `type` | VARCHAR(20) | `like` \| `follow` \| `comment` |
| `tab` | VARCHAR(20) | `you` \| `following` |
| `post_id` | FK NULL | like/comment 시 |
| `comment_preview` | TEXT NULL | comment 시 |
| `is_read` | BOOLEAN DEFAULT FALSE | |
| `created_at` | DATETIME | |

**응답 전용 computed 필드 (DB 컬럼 없음)**
| API 필드 | 출처 |
|----------|------|
| `post_image_url` | `JOIN posts ON post_id` |
| `target_username` | `JOIN posts → users.username` (게시물 작성자, **팔로잉 탭** 문구용) |

**알림 생성 규칙 (서버)**
| 이벤트 | `type` | `tab` | `recipient_id` | `post_id` |
|--------|--------|-------|----------------|-----------|
| 내 게시물 좋아요 | `like` | `you` | 게시물 작성자 | 해당 post |
| 내 게시물 댓글 | `comment` | `you` | 게시물 작성자 | 해당 post |
| 나를 팔로우 | `follow` | `you` | 팔로우 대상 | NULL |
| 팔로우 중인 사람이 **타인** 게시물 좋아요 | `like` | `following` | 나 (팔로워) | 해당 post |
| 팔로우 중인 사람이 **타인** 게시물 댓글 | `comment` | `following` | 나 (팔로워) | 해당 post |

- `tab=following` 알림은 `actor`가 내가 팔로우하는 사용자이고, 게시물 작성자가 나 또는 actor가 **아닐** 때 생성
- 본인에게 알림 생성하지 않음 (`actor_id ≠ recipient_id`)

### 5.2 `story_items` — 스토리 슬라이드 (마이그레이션 `002_story_media_overlays`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | INTEGER PK | |
| `story_id` | FK → stories | 24h 스토리 그룹 |
| `image_url` | VARCHAR | 미디어 URL (`/media/stories/…`) — 이미지·동영상 공통 필드명 |
| `media_type` | VARCHAR(10) DEFAULT `'image'` | `image` \| `video` |
| `overlays` | TEXT NULL | JSON 배열 — `StoryOverlay[]` (텍스트·스티커 편집) |
| `created_at` | DATETIME | 슬라이드 추가 시각 |

**오버레이 JSON 요소 (`StoryOverlay`)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 클라이언트 생성 UUID |
| `type` | string | `text` \| `sticker` |
| `content` | string | 텍스트 내용 또는 이모지 |
| `x`, `y` | number (0–100) | 슬라이드 기준 위치(%) |
| `scale` | number | 기본 `1.0` |
| `rotation` | number | 기본 `0.0` (도) |
| `color` | string \| null | 텍스트 색상 (hex, text 전용) |
| `font_size` | int \| null | 텍스트 크기 px (text 전용) |

---

## 6. 프로젝트 구조

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py          # get_db, get_current_user, get_optional_user
│   ├── models/
│   │   ├── user.py, post.py, comment.py, like.py, follow.py, saved_post.py
│   │   ├── story.py
│   │   ├── reel.py              # + reel_like.py
│   │   ├── post_tag.py
│   │   ├── conversation.py, message.py
│   │   └── notification.py
│   ├── schemas/                 # 프론트 types/index.ts와 필드명 일치
│   ├── routers/
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── posts.py
│   │   ├── comments.py          # posts 하위 include 가능
│   │   ├── stories.py
│   │   ├── reels.py
│   │   ├── conversations.py
│   │   ├── notifications.py
│   │   └── search.py
│   ├── services/                # 피드·알림 생성·카운터 갱신
│   └── utils/
│       ├── security.py
│       └── pagination.py
├── media/
│   ├── avatars/
│   ├── posts/
│   ├── stories/
│   └── reels/
├── scripts/
│   └── seed.py                  # mockData.ts와 동일 계정·샘플 데이터
├── alembic/                     # `001_initial_schema_v2`, `002_story_media_overlays`
├── requirements.txt
└── .env
```

---

## 7. API 명세

공통:
- Base URL: `/api/v1` (예: `GET /api/v1/posts/feed`)
- 인증 헤더: `Authorization: Bearer {access_token}`
- 페이지네이션: `page` (1부터), `limit` (기본 10, 최대 30) → `PaginatedResponse<T>` (`types/index.ts`)
- 응답 날짜: ISO 8601 UTC (`2026-08-15T10:00:00Z`)
- **User 응답**은 프론트 `User` 타입 필드 포함 (`is_own_profile`, `is_following`은 요청 사용자 기준 computed)

### 7.0 엔드포인트 총览 (검증 결과: 46개)

| # | Method | Path | Auth | DB 테이블 | 프론트 사용처 |
|---|--------|------|------|-----------|---------------|
| 1 | POST | `/auth/register` | ❌ | `users` | `SignupForm` |
| 2 | POST | `/auth/login` | ❌ | `users` | `LoginForm` |
| 3 | GET | `/auth/me` | ✅ | `users` | `AuthContext` 세션 |
| 4 | GET | `/users/{username}` | 선택 | `users`, `follows` | `ProfilePage` |
| 5 | PUT | `/users/me` | ✅ | `users` | `SettingsEditProfilePage` |
| 6 | POST | `/users/me/avatar` | ✅ | `users` | 프로필 사진 업로드 |
| 7 | GET | `/users/me/settings` | ✅ | `user_settings` | 설정 조회 |
| 8 | PUT | `/users/me/settings` | ✅ | `user_settings` | 설정 저장 |
| 9 | PUT | `/users/me/password` | ✅ | `users` | 비밀번호 변경 |
| 10 | GET | `/users/me/security` | ✅ | `user_settings`, `login_sessions` | 보안 요약 |
| 11 | GET | `/users/me/login-sessions` | ✅ | `login_sessions` | 로그인 활동 |
| 12 | DELETE | `/users/me/login-sessions/{id}` | ✅ | `login_sessions` | 세션 종료 |
| 13 | PATCH | `/users/me/login-sessions/{id}` | ✅ | `login_sessions` | 저장된 로그인 |
| 14 | PUT | `/users/me/security/login-email-alerts` | ✅ | `user_settings` | 로그인 이메일 알림 |
| 15 | POST | `/users/me/security/2fa/setup` | ✅ | `user_settings` | 2FA 설정 시작 |
| 16 | POST | `/users/me/security/2fa/enable` | ✅ | `user_settings` | 2FA 활성화 |
| 17 | DELETE | `/users/me/security/2fa` | ✅ | `user_settings` | 2FA 비활성화 |
| 18 | GET | `/users/check-username` | ❌ | `users` | `SignupForm` 중복 확인 |
| 19 | GET | `/users/suggested` | ✅ | `users`, `follows` | `SuggestionsPanel` |
| 20 | POST | `/users/{user_id}/follow` | ✅ | `follows`, `notifications` | 프로필·검색·알림 |
| 21 | DELETE | `/users/{user_id}/follow` | ✅ | `follows` | 팔로우 토글 |
| 22 | GET | `/users/{username}/posts` | 선택 | `posts`, `likes`, `saved_posts`, `post_tags` | 프로필 게시물 탭 |
| 23 | GET | `/users/{username}/reels` | 선택 | `reels`, `reel_likes` | 프로필 릴스 탭 |
| 24 | GET | `/users/{username}/tagged` | 선택 | `post_tags`, `posts` | 프로필 태그됨 탭 |
| 25 | GET | `/posts/feed` | ✅ | `posts`, `follows`, `likes`, `saved_posts`, `post_tags`, `comments` | `HomePage` |
| 26 | GET | `/posts/explore` | 선택 | `posts`, `likes`, `saved_posts` | `ExplorePage` |
| 27 | GET | `/posts/saved` | ✅ | `saved_posts`, `posts` | 프로필 저장됨 탭 |
| 28 | GET | `/posts/{post_id}` | 선택 | `posts` + joins | `/p/:postId` `PostDetailPage` |
| 29 | POST | `/posts` | ✅ | `posts`, `post_tags` | `CreatePostModal` |
| 30 | POST | `/posts/{post_id}/like` | ✅ | `likes`, `posts`, `notifications` | `PostCard`, `PostModal` |
| 31 | POST | `/posts/{post_id}/save` | ✅ | `saved_posts` | `PostCard`, `PostModal` |
| 32 | POST | `/posts/{post_id}/comments` | ✅ | `comments`, `posts`, `notifications` | `CommentInput` |
| 33 | GET | `/stories/feed` | ✅ | `stories`, `story_items`, `story_views`, `follows` | `StoryBar` |
| 34 | POST | `/stories` | ✅ | `stories`, `story_items` | `CreateStoryModal` |
| 35 | POST | `/stories/{story_id}/view` | ✅ | `story_views` | `StoryViewer` |
| 36 | GET | `/reels/feed` | 선택 | `reels`, `reel_likes` | `ReelsPage` |
| 37 | POST | `/reels` | ✅ | `reels` | `CreateReelModal` |
| 38 | POST | `/reels/{reel_id}/like` | ✅ | `reel_likes`, `reels` | `ReelsPage`, `ReelsViewer` |
| 39 | POST | `/reels/{reel_id}/view` | ✅ | `reels.view_count` | 릴스 활성 슬라이드 |
| 40 | GET | `/conversations` | ✅ | `conversations`, `messages`, `users` | `MessagesPage` 목록 |
| 41 | GET | `/conversations/{username}/messages` | ✅ | `messages` | `ChatPanel` |
| 42 | POST | `/conversations/{username}/messages` | ✅ | `conversations`, `messages` | `ChatPanel` 전송 |
| 43 | GET | `/notifications?tab=` | ✅ | `notifications`, `users`, `posts` | `NotificationsPage` |
| 44 | PATCH | `/notifications/{id}/read` | ✅ | `notifications` | `NotificationItem` |
| 45 | GET | `/search/users?q=` | ✅ | `users`, `follows` | `SearchPage` |
| 46 | GET | `/health` | ❌ | — | 헬스체크 |

> **제거됨 (프론트 미사용):** `GET /posts/{id}/comments` (게시물 응답에 `comments[]` 포함), `PATCH /notifications/read-all` (일괄 읽음 UI 없음)

---

### 7.1 인증 `/auth`

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/auth/register` | ❌ | 회원가입 + JWT |
| POST | `/auth/login` | ❌ | **이메일 또는 username** + password (+ 2FA 시 `totp_code`) |
| GET | `/auth/me` | ✅ | 현재 사용자 |

#### POST `/auth/login`
```json
// Request
{ "username": "letsgomingu@gmail.com", "password": "12345", "totp_code": "123456" }

// Response 200
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { /* User */ }
}
```

- `username` 필드에 **email 또는 username** 모두 허용 (프론트 `AuthCredentials.username`과 동일)
- 2FA 활성화 시 `totp_code` 없으면 `403` `{ "detail": { "message": "2FA required", "requires_2fa": true } }`
- 로그인·회원가입 시 `login_sessions` 기록, JWT `sid` 클레임에 세션 ID 포함
- 성공 시 프론트가 `localStorage.token`, `localStorage.userId` 저장

#### POST `/auth/register`
```json
// Request — RegisterData
{
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "password": "securepass123"
}
```

검증 (프론트 `validateForm.ts`와 동일):
- email 형식
- username 3~30자, `[a-zA-Z0-9._]`
- password **최소 8자** (회원가입 UI 기준)
- full_name 필수

> 시드 테스트 계정 `12345`는 5자리이나 **신규 가입만 8자 규칙** 적용.

---

### 7.2 사용자 `/users`

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/users/{username}` | 선택 | 프로필 |
| PUT | `/users/me` | ✅ | full_name, bio, website |
| POST | `/users/me/avatar` | ✅ | multipart avatar |
| GET | `/users/me/settings` | ✅ | 알림·개인정보 설정 조회 |
| PUT | `/users/me/settings` | ✅ | 설정 부분 업데이트 |
| PUT | `/users/me/password` | ✅ | `{ "current_password", "new_password" }` (신규 8자+) → `204` |
| GET | `/users/me/security` | ✅ | 로그인 이메일 알림·2FA·세션 요약 |
| GET | `/users/me/login-sessions` | ✅ | 로그인 활동 목록 (`is_current`, `is_trusted`) |
| DELETE | `/users/me/login-sessions/{session_id}` | ✅ | 다른 기기 세션 종료 (현재 세션 불가) → `204` |
| PATCH | `/users/me/login-sessions/{session_id}` | ✅ | `{ "is_trusted": true }` — 저장된 로그인 |
| PUT | `/users/me/security/login-email-alerts` | ✅ | `{ "enabled": true }` |
| POST | `/users/me/security/2fa/setup` | ✅ | TOTP secret·otpauth URL 반환 |
| POST | `/users/me/security/2fa/enable` | ✅ | `{ "code": "123456" }` — 2FA 활성화 |
| DELETE | `/users/me/security/2fa` | ✅ | `{ "password", "code" }` — 2FA 비활성화 |
| GET | `/users/check-username?username=` | ❌ | `{ "available": true }` |
| GET | `/users/suggested` | ✅ | 추천 사용자 — `SuggestedUser` (`reason`은 computed) |
| POST | `/users/{user_id}/follow` | ✅ | 팔로우 → `notifications` (`type=follow`, `tab=you`) |
| DELETE | `/users/{user_id}/follow` | ✅ | 언팔로우 |
| GET | `/users/{username}/posts` | 선택 | `PaginatedResponse<Post>` — 프로필 게시물 탭 |
| GET | `/users/{username}/reels` | 선택 | `PaginatedResponse<Reel>` — 프로필 릴스 탭 |
| GET | `/users/{username}/tagged` | 선택 | `PaginatedResponse<Post>` — `post_tags` JOIN |

#### GET `/users/suggested` — `reason` 생성 규칙 (DB 컬럼 없음)
| `reason` 예시 | 로직 |
|---------------|------|
| `회원님을 위한 추천` | 기본값 |
| `{username}님 외 N명이 팔로우합니다` | 공통 팔로워 수 기반 (선택) |
| `인기 계정` | follower_count 상위 |

#### `UserSettings` (`user_settings` 테이블, 1:1 with users)

| 필드 | 타입 | 기본값 | UI |
|------|------|--------|-----|
| `notify_likes` | bool | true | 설정 > 알림 |
| `notify_comments` | bool | true | 설정 > 알림 |
| `notify_follows` | bool | true | 설정 > 알림 |
| `notify_mentions` | bool | true | 설정 > 알림 |
| `is_private` | bool | false | 설정 > 개인정보 |
| `show_activity_status` | bool | true | 설정 > 개인정보 |
| `allow_story_replies` | bool | true | 설정 > 개인정보 |
| `comments_privacy` | enum | `everyone` | `everyone` \| `followers` \| `off` |
| `mentions_privacy` | enum | `everyone` | `everyone` \| `followers` \| `off` |

- 회원가입 시 기본 `user_settings` 행 자동 생성
- 알림 생성 시 수신자 설정(`notify_*`)을 확인해 비활성 유형은 `notifications` insert 생략

---

### 7.3 게시물 `/posts`

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/posts/feed` | ✅ | `PaginatedResponse<Post>` — 팔로잉+본인, `created_at DESC` |
| GET | `/posts/explore` | 선택 | `PaginatedResponse<Post>` — 전체 공개 게시물 |
| GET | `/posts/saved` | ✅ | `PaginatedResponse<Post>` — 저장됨 탭 (본인만) |
| GET | `/posts/{post_id}` | 선택 | 상세 + `comments[]` (최근 20개), `/p/:postId` |
| POST | `/posts` | ✅ | 게시물 생성 (multipart) |
| POST | `/posts/{post_id}/like` | ✅ | 좋아요 토글 → `{ "is_liked", "like_count" }` + 알림 |
| POST | `/posts/{post_id}/save` | ✅ | 저장 토글 → `{ "is_saved" }` |

#### Post 응답 (`Post` 타입)
```json
{
  "id": 1,
  "user": { /* User 요약 */ },
  "image_url": "/media/posts/uuid.jpg",
  "caption": "...",
  "location": "서울",
  "like_count": 1243,
  "comment_count": 89,
  "is_liked": true,
  "is_saved": false,
  "created_at": "2026-08-15T07:00:00Z",
  "comments": [ /* GET /posts/{id}·피드: 최근 20개; Comment 타입 */ ],
  "tagged_users": [ /* User 요약 배열 */ ]
}
```

#### POST `/posts` (multipart)
```
image: File (required, jpeg/png/webp, max 10MB)
caption: string (optional, max 2200)
location: string (optional)
tagged_usernames: string (optional, JSON array — UI 미구현, API만 지원)
```

---

### 7.4 댓글 `/posts/{post_id}/comments`

| Method | Path | Auth | DB | 설명 |
|--------|------|------|-----|------|
| POST | `/posts/{post_id}/comments` | ✅ | `comments`, `posts.comment_count`, `notifications` | `{ "content" }` → `Comment` 응답 |

- 댓글 **목록 조회 전용 GET 없음** — `GET /posts/{post_id}`·피드 Post 응답의 `comments[]` 사용 (`PostModal`, `CommentList`)
- `tab=you` 알림: 게시물 작성자에게 / `tab=following` 알림: 게시물 작성자·actor 모두 팔로워인 사용자에게 (§5.1)

---

### 7.5 스토리 `/stories`

| Method | Path | Auth | DB | 설명 |
|--------|------|------|-----|------|
| GET | `/stories/feed` | ✅ | `stories`, `story_items`, `story_views`, `follows` | 팔로잉+본인, 미만료만 |
| POST | `/stories` | ✅ | `stories`, `story_items` | 스토리 슬라이드 추가 (multipart) |
| POST | `/stories/{story_id}/view` | ✅ | `story_views` | `{ "viewed": true }` |

#### Story 응답 (`Story` 타입)
```json
{
  "id": 1,
  "user": { /* User */ },
  "items": [
    {
      "id": 1,
      "image_url": "/media/stories/uuid.jpg",
      "media_type": "image",
      "overlays": [
        {
          "id": "overlay-abc",
          "type": "text",
          "content": "텍스트",
          "x": 50,
          "y": 50,
          "scale": 1,
          "rotation": 0,
          "color": "#ffffff",
          "font_size": 28
        },
        {
          "id": "overlay-def",
          "type": "sticker",
          "content": "🔥",
          "x": 50,
          "y": 40,
          "scale": 1,
          "rotation": 0
        }
      ],
      "created_at": "2026-08-16T03:00:00Z"
    }
  ],
  "viewed": false
}
```

- `expires_at < now` 인 스토리는 feed에서 제외
- `image_url` 필드는 이미지·동영상 모두에 사용 (동영상 URL도 동일 필드)
- `overlays`가 없으면 빈 배열 `[]` 반환

#### POST `/stories` (multipart)

```
media: File (required)
  - image: jpeg, png, webp
  - video: mp4, webm, mov (quicktime)
  - max 10MB (MEDIA_ROOT/stories/)
overlays: string (optional, JSON array — StoryOverlay[])
```

**동작 규칙**
- 24h 이내 기존 `stories` 그룹이 있으면 `story_items`에 슬라이드 **추가**, `expires_at` 갱신
- 없으면 새 `stories` 행 생성 후 첫 슬라이드 추가
- `media_type`은 Content-Type으로 자동 판별 (`image/*` → `image`, `video/*` → `video`)
- `overlays` JSON 파싱 실패 또는 배열이 아니면 `400`

**응답:** `201 Created` + 갱신된 `StoryOut` (해당 사용자 스토리 그룹 전체)

**프론트:** `CreateStoryModal` → `StoryEditor` (텍스트·스티커 편집) → `storiesApi.createStory(FormData)`

---

### 7.6 릴스 `/reels`

| Method | Path | Auth | DB | 설명 |
|--------|------|------|-----|------|
| GET | `/reels/feed` | 선택 | `reels`, `reel_likes` | `PaginatedResponse<Reel>` — `/reels` 페이지 |
| POST | `/reels` | ✅ | `reels` | 릴스 업로드 (multipart) |
| POST | `/reels/{reel_id}/like` | ✅ | `reel_likes`, `reels.like_count` | `{ "is_liked", "like_count" }` |
| POST | `/reels/{reel_id}/view` | ✅ | `reels.view_count` | view_count +1 |

#### POST `/reels` (multipart)
```
video: File (required) — mp4, webm, mov
thumbnail: File (optional) — jpeg, png, webp (없으면 placeholder 생성)
caption: string (optional)
audio_name: string (optional, 기본: Original audio · {username})
```

**응답:** `201 Created` + `ReelOut` (`video_url`, `thumbnail_url` 포함)

> 프로필 릴스 탭: `GET /users/{username}/reels` (§7.2)

#### Reel 응답
```json
{
  "id": 1,
  "user": { /* User */ },
  "thumbnail_url": "/media/reels/uuid.jpg",
  "video_url": "/media/reels/uuid.mp4",
  "caption": "...",
  "audio_name": "Original audio · letsgomingu",
  "like_count": 8420,
  "comment_count": 124,
  "view_count": 45200,
  "is_liked": true,
  "created_at": "..."
}
```

- `video_url`은 업로드 릴스에만 존재 (시드 데이터는 thumbnail만)
- `comment_count`는 DB 시드·표시용 (릴스 댓글 UI 없음)

---

### 7.7 메시지 `/conversations`

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/conversations` | ✅ | 대화 목록 |
| GET | `/conversations/{username}/messages` | ✅ | 특정 사용자와 메시지 |
| POST | `/conversations/{username}/messages` | ✅ | `{ "content": "..." }` |

#### Conversation 응답
```json
{
  "id": 1,
  "participant": { /* User */ },
  "messages": [ /* Message[] */ ],
  "last_message": { /* Message */ },
  "unread_count": 1
}
```

#### Message
```json
{
  "id": 1,
  "sender_id": 2,
  "content": "안녕하세요",
  "created_at": "...",
  "is_read": false
}
```

- `{username}` 대화 없으면 **자동 생성** (프론트 `getOrCreateConversation`과 동일)
- GET messages 시 해당 대화의 미읽음 → `is_read=true` 처리

---

### 7.8 알림 `/notifications`

| Method | Path | Auth | DB | 설명 |
|--------|------|------|-----|------|
| GET | `/notifications?tab=you` | ✅ | `notifications`, `users`, `posts` | `tab`: `you` \| `following` — `NotificationsPage` 양 탭 |
| PATCH | `/notifications/{id}/read` | ✅ | `notifications.is_read` | `{ "is_read": true }` |

#### Notification 응답
```json
{
  "id": 1,
  "type": "like",
  "tab": "following",
  "actor": { /* User */ },
  "target_username": "bob_lee",
  "post_id": 2,
  "post_image_url": "/media/posts/2.jpg",
  "comment_preview": null,
  "created_at": "...",
  "is_read": false
}
```

- `post_image_url`: `JOIN posts.image_url`
- `target_username`: `JOIN posts → users.username` — **팔로잉 탭**에서 `getNotificationMessage()` 문구용 (`you` 탭은 null)
- 기간 그룹(새로운 알림/오늘/…)은 **프론트** `groupNotificationsByPeriod()`에서 계산

---

### 7.9 검색 `/search`

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/search/users?q=` | ✅ | username·full_name LIKE 검색 |

---

### 7.10 헬스

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/health` | `{ "status": "ok" }` — `health.router` prefix `/api/v1` |

---

## 8. 인증·보안

### JWT Payload
```json
{ "sub": "1", "username": "letsgomingu", "sid": "12", "exp": 1690000000, "type": "access" }
```

### 의존성
- `get_current_user` — 필수 인증, 401
- `get_optional_user` — 비로그인 허용 (explore, 프로필 조회 등)

### 파일 업로드
- MIME: `image/jpeg`, `image/png`, `image/webp`
- Pillow 재인코딩
- 저장명: UUID + 확장자
- `app.mount("/media", StaticFiles(directory=MEDIA_ROOT))`

---

## 9. 핵심 비즈니스 로직

### 홈 피드
```python
# follower_ids + self → posts ORDER BY created_at DESC
# 각 post에 is_liked, is_saved, tagged_users attach
```

### Explore
```python
# 전체 posts, like_count DESC 또는 created_at DESC (프론트는 순서만 일관되면 됨)
```

### 카운터 캐싱
- `posts.like_count`, `comment_count` / `reels.like_count`, `view_count`
- like·comment·view 이벤트 시 ±1 (트랜잭션 내)

### 팔로우
- 자기 자신 팔로우 → 400
- UNIQUE(follower_id, following_id)

### 알림
- like / comment / follow 액션 후 `notifications` insert (§5.1 `tab` 규칙)
- `tab=following`: actor가 내 팔로잉이고, 게시물 owner ∉ {me, actor}일 때 팔로워(recipient)에게 저장
- 본인에게 알림 생성하지 않음
- 응답 시 `target_username` = `posts.user_id → users.username` (computed)

---

## 10. 시드 데이터

`scripts/seed.py`는 프론트 `mockData.ts`·`mockMessages.ts`·`mockNotifications.ts`와 **동일한 테스트 계정·관계**를 DB에 넣는다.

**필수 시드**
| 항목 | 값 |
|------|-----|
| 테스트 계정 | `letsgomingu@gmail.com` / `letsgomingu` / `12345` |
| 샘플 사용자 | alice_kim, bob_lee, sarah_park, mike_jung, emma_cho |
| 게시물 | 9개 + tagged_users 관계 |
| 릴스 | 6개 |
| 스토리 | 6명 분 스토리·items |
| 팔로우·좋아요·댓글·저장 | Mock와 유사 분포 |
| 대화·메시지 | initialConversations |
| 알림 | `initialNotifications` — `you`·`following` 탭 (14건) |

실행:
```bash
cd backend
python scripts/seed.py
```

---

## 11. 프론트엔드 연동 체크리스트

연동 시 수정할 프론트 파일:

| 파일 | 작업 |
|------|------|
| `api/auth.ts` | Mock → `api.post('/auth/login')` 등 |
| `api/posts.ts`, `users.ts`, `comments.ts`, `stories.ts`, `notifications.ts` | stub → 실 API |
| `contexts/AppContext.tsx` | 초기 state를 React Query + API로 교체 |
| `data/mockMessages.ts` | MessagesPage API 연동 |
| `data/mockNotifications.ts` | NotificationsPage API 연동 |
| `pages/ProfilePage.tsx` | reels/tagged API |
| `pages/ReelsPage.tsx` | `/reels/feed` |
| `components/post/CreatePost.tsx` | `POST /posts` multipart |
| `components/story/CreateStory.tsx` | `POST /stories` multipart (`media`, `overlays`) |

환경 변수:
```env
# frontend/.env.development
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 12. 개발 우선순위

| 단계 | 범위 | 산출물 |
|------|------|--------|
| **1** | SQLite·config·models·seed(테스트 계정) | DB + `letsgomingu` 로그인 |
| **2** | Auth + Users (프로필·팔로우·check-username) | `/login`, `/signup`, `/profile/:username` |
| **3** | Posts (CRUD·like·save·feed·explore·comments·tags) | 홈·탐색·게시물 모달·작성 |
| **4** | Stories (feed·create·view) | 스토리 바·작성·뷰어 (이미지·동영상·오버레이) |
| **5** | Reels (feed·profile·like·view) | `/reels`, 프로필 릴스 탭 |
| **6** | Conversations + Messages | `/messages` |
| **7** | Notifications | `/notifications` |
| **8** | Search + Suggested | `/search`, 홈 추천 패널 |
| **9** | pytest (핵심 API) | auth, posts, follow, messages |

---

## 13. 테스트 (최소)

in-memory SQLite (`sqlite:///:memory:`) + `TestClient`

- [ ] login (email / username)
- [ ] register + duplicate username
- [ ] feed pagination
- [ ] toggle like / save
- [ ] follow / unfollow
- [ ] create post (multipart)
- [ ] create story (image multipart)
- [ ] create story with overlays (text·sticker JSON)
- [ ] create story (video multipart)
- [ ] tagged posts on profile
- [ ] send message + unread_count
- [ ] notification on like

---

## 14. 실행

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/seed.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### `requirements.txt` (최소)
```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
alembic>=1.13.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
bcrypt>=4.0.0
python-multipart>=0.0.9
pydantic-settings>=2.0.0
pillow>=10.0.0
pytest>=8.0.0
httpx>=0.27.0
```

---

## 15. `db.md` 동기화

상세 DDL·ERD·쿼리 패턴·프론트 타입 매핑은 **`db.md` v2**에 정의되어 있으며, 본 문서 §5와 **15개 테이블·컬럼명이 일치**한다.  
스키마 변경 시 `backend.md`와 `db.md`를 함께 수정한다.

---

## 16. API 명세 검증 요약 (2026-08-16)

프론트 소스·15개 DB 테이블·`types/index.ts` 대조 결과:

| 구분 | 결과 |
|------|------|
| **추가 엔드포인트** | `POST /stories` — 이미지·동영상 업로드 + 텍스트·스티커 오버레이 (`CreateStoryModal`) |
| **스키마 변경** | Alembic `002_story_media_overlays`: `story_items.media_type`, `story_items.overlays` |
| **제거·통합** | `GET /posts/{id}/comments` 제거 (Post 응답 embed), `PATCH /notifications/read-all` 제거 (UI 없음) |
| **명세 보완** | `StoryItem.media_type`, `StoryItem.overlays`, `StoryOverlay` 타입, multipart 필드 `media`·`overlays` |
| **Out of Scope 수정** | 스토리 업로드를 In Scope로 이동. 릴스 업로드만 제외 |
| **DB 매칭** | 34개 엔드포인트 모두 §5 테이블·JOIN으로 표현 가능 |

---

## 부록: 프론트 타입 ↔ API 필드 대조

| TypeScript (`types/index.ts`) | API/DB |
|------------------------------|--------|
| `User.post_count` | COUNT(posts) |
| `User.is_following` | EXISTS(follows) |
| `Post.tagged_users` | JOIN post_tags |
| `Reel.thumbnail_url` | reels.thumbnail_url |
| `Story.viewed` | EXISTS(story_views) |
| `StoryItem.media_type` | `story_items.media_type` (`image` \| `video`) |
| `StoryItem.overlays` | `story_items.overlays` JSON → `StoryOverlay[]` |
| `StoryOverlay.*` | 오버레이 JSON 필드 (§5.2) |
| `Conversation.unread_count` | COUNT(messages WHERE is_read=false AND sender≠me) |
| `Notification.tab` | notifications.tab |
| `Notification.target_username` | JOIN posts → users.username (computed) |
| `Notification.post_image_url` | JOIN posts.image_url (computed) |
| `SuggestedUser.reason` | API computed (DB 컬럼 없음) |
