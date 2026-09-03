# i am not a fishmonger — 백엔드 현황

> FastAPI + SQLAlchemy 백엔드. **PostgreSQL로 전환 완료**(자체 호스팅, 프로덕션 EC2 서버). 이 문서는 실제 코드(`backend/app`)를 기준으로 작성되었다. 개발 착수 전 SQLite 기획 문서가 아니다.

---

## 1. 기술 스택 / requirements.txt

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
email-validator>=2.0.0
pyotp>=2.9.0
psycopg2-binary>=2.9.9
boto3>=1.34.0
```

전부 최소 버전(`>=`)만 고정, 락파일 없음. `psycopg2-binary`/`boto3`는 PostgreSQL·S3 전환을 위해 추가된 것. `pyproject.toml` 없음, `requirements.txt`가 전부.

---

## 2. 디렉토리 구조

```
backend/
├── .env.example                 # 로컬 개발 기본값 (sqlite)
├── .env.production.example      # 프로덕션 템플릿 (postgres+psycopg2, S3 대비)
├── alembic.ini
├── requirements.txt
├── alembic/versions/  (001~006, 6장 참고)
├── scripts/  (seed.py, ensure_admin.py, init_db.py, migrate.py,
│              refresh_post_images.py, verify_schema.py, verify_seed.py, make_test_video.py, ...)
├── seed_assets/ (posts/, stories/, reels/ 데모 이미지)
├── tests/test_api.py
└── app/
    ├── main.py, config.py, database.py, db_init.py, dependencies.py
    ├── models/    (16개 모델 클래스, db.md 참고)
    ├── routers/   (auth, health, posts, reels, search, social, stories, users, admin)
    ├── schemas/   (Pydantic DTO)
    ├── services/  (비즈니스 로직)
    └── utils/     (datetime_fmt, media, pagination, security)
```

---

## 3. 앱 구성 (`app/main.py`)

- 모듈 로드 시점(FastAPI 인스턴스 생성 **이전**)에 `init_db()`(Alembic `upgrade head` 실행)와 `ensure_media_dirs()`를 호출. 별도 `@app.on_event("startup")` 훅은 사용하지 않는다.
- `settings.seed_demo_users`가 참이면 `ensure_admin_user()` / `ensure_seed_test_user()`도 같은 시점에 실행되어 데모 계정을 만들거나 복구한다.
- `FastAPI(title="Instagram Clone API", version="1.0.0")`.
- **CORS**: `allow_origins=settings.origins_list`(`ALLOWED_ORIGINS` 콤마 구분), `allow_credentials=True`, 메서드/헤더 전체 허용.
- **정적 파일**: `/media` → `StaticFiles(directory=settings.media_root)` (로컬 스토리지 모드에서만 의미 있음, S3 모드에서는 CDN URL을 직접 반환).
- 모든 라우터는 `/api/v1` 프리픽스 아래 등록됨: `health`(프리픽스 없음), `auth`→`/auth`, `users`→`/users`, `posts`→`/posts`, `stories`→`/stories`, `reels`→`/reels`, `social.conversations_router`→`/conversations`, `social.notifications_router`→`/notifications`, `search`→`/search`, `admin`→`/admin`.
- `GET /` → `{"message": "Instagram Clone API", "docs": "/docs"}`. Swagger `/docs`, ReDoc `/redoc`.

---

## 4. 엔드포인트 전체 목록 (`/api/v1` + 각 프리픽스)

### `health`
- `GET /health` — 공개, liveness.

### `/auth`
- `POST /auth/login` — 공개. 이메일 또는 사용자명으로 조회, bcrypt 검증, `is_active` 확인, 2FA 활성 사용자는 `totp_code` 검증(누락 시 403 + `requires_2fa`). 로그인 세션 기록 후 JWT 발급.
- `POST /auth/register` — 공개. 사용자 생성 + 기본 `UserSettings` 생성 + 로그인 세션 기록.
- `GET /auth/me` — **인증 필요**.

### `/users`
- `GET /users/check-username` — 공개.
- `GET /users/suggested` — 선택적 인증. 팔로우 안 한 사용자 중 게시물/팔로워 수 기반 랭킹 + 한글 추천 사유("맞팔로우 N명", "인기 계정" 등).
- `PUT /users/me` — 인증 필요. full_name/bio/website 수정.
- `POST /users/me/avatar` — 인증 필요.
- `GET /users/me/settings`, `PUT /users/me/settings` — 인증 필요.
- `PUT /users/me/password` — 인증 필요.
- `GET /users/me/security` — 인증 필요. 2FA 상태·로그인 알림 설정·세션 수 요약.
- `GET /users/me/login-sessions` — 인증 필요.
- `DELETE /users/me/login-sessions/{id}` — 인증 필요(현재 세션은 해지 불가).
- `PATCH /users/me/login-sessions/{id}` — 인증 필요. 신뢰 기기 토글.
- `PUT /users/me/security/login-email-alerts` — 인증 필요.
- `POST /users/me/security/2fa/setup` — 인증 필요. TOTP secret + otpauth URL 발급.
- `POST /users/me/security/2fa/enable` — 인증 필요. 코드 검증 후 활성화.
- `DELETE /users/me/security/2fa` — 인증 필요. 비밀번호 + 코드 필요.
- `GET /users/{username}` — 선택적 인증. 공개 프로필.
- `POST /users/{user_id}/follow`, `DELETE /users/{user_id}/follow` — 인증 필요.
- `GET /users/{username}/posts`, `/reels`, `/tagged` — 선택적 인증, 페이지네이션.

### `/posts`
- `GET /posts/feed` — **인증 필요**. 홈 피드(9장 참고).
- `GET /posts/explore` — 선택적 인증. 전체 게시물, 최신순.
- `GET /posts/saved` — 인증 필요.
- `GET /posts/{id}` — 선택적 인증.
- `POST /posts` — 인증 필요. `image`(단일) + `files`(다중) multipart, 최대 10개, `tagged_usernames`(JSON 또는 콤마구분).
- `POST /posts/{id}/like`, `POST /posts/{id}/save` — 인증 필요, 토글.
- `GET /posts/{id}/likes`, `GET /posts/{id}/comments` — 선택적 인증.
- `POST /posts/{id}/comments` — 인증 필요.
- `DELETE /posts/{id}/comments/{comment_id}` — 인증 필요(댓글 작성자 또는 게시물 소유자만).

### `/stories`
- `GET /stories/feed` — 인증 필요. 팔로우 중인 사용자 + 본인의 활성(24시간 이내) 스토리, 아이템별 오버레이·조회 여부 포함.
- `POST /stories` — 인증 필요. 이미지/영상 + 선택적 오버레이 JSON. 기존 활성 스토리가 있으면 아이템 추가, 없으면 새로 시작.
- `POST /stories/{id}/view` — 인증 필요(멱등).

### `/reels`
- `GET /reels/feed` — 선택적 인증.
- `POST /reels` — 인증 필요. 영상 + 선택적 썸네일(없으면 회색 플레이스홀더 자동 생성).
- `POST /reels/{id}/like` — 인증 필요.
- `POST /reels/{id}/view` — 선택적 인증.

### `/conversations`
- `GET /conversations` — 인증 필요.
- `GET /conversations/{username}/messages` — 인증 필요. 없으면 대화 생성, 읽지 않은 수신 메시지 자동 읽음 처리.
- `POST /conversations/{username}/messages` — 인증 필요(자기 자신에게는 불가).

### `/notifications`
- `GET /notifications?tab=you|following` — 인증 필요.
- `PATCH /notifications/{id}/read` — 인증 필요.

### `/search`
- `GET /search/users` — 인증 필요(선택적 인증 아님). 사용자명/전체 이름 부분 일치.

### `/admin` (전부 관리자 권한 필요)
- `GET /admin/stats` — 사용자/게시물/댓글/좋아요 총계 + 최근 7일 신규.
- `GET /admin/users`, `PATCH /admin/users/{id}/status`(활성/비활성), `DELETE /admin/users/{id}`
- `GET /admin/posts`, `DELETE /admin/posts/{id}`
- 관리자 본인/다른 관리자 계정은 비활성화·삭제 불가.

---

## 5. 인증/보안 (`app/dependencies.py`, `app/utils/security.py`)

- **비밀번호**: `bcrypt` 직접 사용(`hashpw`/`checkpw`), `passlib`는 requirements에만 있고 실제로는 안 씀.
- **JWT**: `python-jose`, 알고리즘 `HS256`(설정 가능), payload `{sub, username, exp, type:"access", sid}`. `sid`는 로그인 시 생성된 `LoginSession.id`로, "현재 세션"을 식별하는 데 쓰임. 만료 `ACCESS_TOKEN_EXPIRE_MINUTES`(기본 60분).
- **2FA**: `pyotp` 기반 TOTP. `UserSettings.two_factor_enabled`/`two_factor_secret`에 저장(User가 아님). 로그인 시 활성화되어 있으면 코드 필수.
- **로그인 세션**: 로그인/가입마다 `LoginSession` 기록(IP, User-Agent 파싱한 device_name, 신뢰 여부). 자기 자신은 해지 불가.
- **관리자**: 별도 로그인 플로우 없음 — 동일한 `/auth/login`을 쓰되 `User.is_admin` 플래그로 `AdminUser` 의존성이 403 처리. 의존성: `CurrentUser`(401), `OptionalUser`(비로그인 시 None), `AdminUser`(403), `CurrentSessionId`.

---

## 6. 파일 업로드 (`app/utils/media.py`)

- 이미지 허용: `image/jpeg`, `image/png`, `image/webp`. 영상 허용: `video/mp4`, `video/webm`, `video/quicktime`.
- 이미지는 Pillow로 JPEG(품질 85)로 재인코딩(메타데이터 제거 겸 정규화), 파일명 `uuid4().hex + ".jpg"`.
- 영상은 재인코딩 없이 그대로 저장(트랜스코딩 미지원 — 알려진 제약).
- 업로드 크기 상한 `MAX_UPLOAD_SIZE_MB`(기본 10MB).
- **스토리지 백엔드**(`STORAGE_BACKEND` 설정으로 전환):
  - `local`(기본) — `MEDIA_ROOT/<avatars|posts|stories|reels>/<파일명>`에 저장, `/media/...`로 서빙.
  - `s3` — boto3로 `AWS_S3_BUCKET`에 업로드, `MEDIA_CDN_BASE_URL`(CloudFront) 기준 URL 반환. 버킷/CDN URL 미설정 시 500. 프리사인 업로드 없이 FastAPI 프로세스를 그대로 경유함(대용량 업로드 시 병목 가능 — 알려진 개선 여지).

---

## 7. 서비스 레이어 (`app/services/`)

| 파일 | 역할 |
|---|---|
| `posts.py` | PostOut/알림 DTO 조립(N+1 방지 배치 헬퍼), 홈 피드 알고리즘, 댓글/좋아요 목록·삭제 |
| `users.py` | 프로필 DTO 조립, 추천 사용자 랭킹, 검색, 팔로우 헬퍼 |
| `notifications.py` | 팔로우/좋아요/댓글 알림 생성(수신자 알림 설정 확인 후 생성) |
| `conversations.py` | `(user1_id < user2_id)` 정규화된 대화 페어링, 조회/생성/전송, 읽음 처리 |
| `stories_reels.py` | 스토리 피드(24시간 TTL, 오버레이 JSON 파싱), 릴스 피드/생성 |
| `security.py` | User-Agent → 기기명 파싱, 클라이언트 IP 추출, 로그인 세션 CRUD, 2FA setup/enable/disable |
| `settings.py` | `UserSettings` get-or-create, 부분 업데이트, 알림 허용 여부 조회(설정 없으면 기본 허용) |
| `admin.py` | 통계 집계, 관리자용 사용자/게시물 목록·상태변경·삭제(관리자 보호 로직 포함) |
| `admin_bootstrap.py` | `ensure_admin_user()`(`admin`/`pass123`), `ensure_seed_test_user()`(`letsgomingu`/`12345`) — `SEED_DEMO_USERS=true`일 때 매 시작마다 실행되어 계정을 생성/복구 |

---

## 8. 설정 (`app/config.py`, pydantic-settings)

| 설정 | 환경변수 | 기본값 |
|---|---|---|
| `database_url` | `DATABASE_URL` | `sqlite:///./instagram.db` |
| `secret_key` | `SECRET_KEY` | 개발용 placeholder |
| `algorithm` | `ALGORITHM` | `HS256` |
| `access_token_expire_minutes` | `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `media_root` | `MEDIA_ROOT` | `./media` |
| `max_upload_size_mb` | `MAX_UPLOAD_SIZE_MB` | `10` |
| `allowed_origins` | `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000` |
| `seed_demo_users` | `SEED_DEMO_USERS` | `True`(운영에서는 반드시 `false`) |
| `storage_backend` | `STORAGE_BACKEND` | `local` (`s3`도 가능) |
| `aws_region` | `AWS_REGION` | `ap-northeast-2` |
| `aws_s3_bucket` | `AWS_S3_BUCKET` | `""` |
| `media_cdn_base_url` | `MEDIA_CDN_BASE_URL` | `""` |

계산 프로퍼티: `origins_list`(콤마 분리), `is_sqlite`(`database_url.startswith("sqlite")`).

> 이 저장소의 `.env.example`/`.env.production.example`는 여전히 `DATABASE_URL=sqlite:///...`를 기본값으로 보여준다. **실제 프로덕션 `DATABASE_URL`은 `deploy/setup-postgres.sh`가 생성해 서버의 (git에 커밋되지 않는) `backend/.env`에 직접 써넣는 값**이다 — 아래 9장 참고.

---

## 9. 핵심 비즈니스 로직

### 홈 피드 (`services/posts.py::get_home_feed_posts`)
팔로잉 우선 노출: `CASE WHEN user_id IN (팔로잉 ∪ 본인) THEN 0 ELSE 1 END` 우선순위 컬럼으로 정렬한 뒤 `created_at DESC`, 표준 `offset/limit` 페이지네이션. `next_page = page+1 if page*limit < total else None`.

> **과거 버그**: 이전 구현은 전체 게시물을 파이썬으로 읽어와 모듈로 연산으로 "페이지를 순환"시켰고, `next_page` 판정도 `total > 0`(게시물이 하나라도 있으면 항상 참)이었다. 그 결과 무한 스크롤이 끝나지 않고 같은 게시물이 계속 중복 노출되는 문제가 있었다(게시물이 적을수록 심각). `/posts/explore`와 동일한 offset/limit 방식으로 수정 완료.

### 알림 생성 (`services/notifications.py`)
- 팔로우 → 대상에게 알림(`tab="you"`), `notify_follows` 설정으로 게이팅, 자기 팔로우는 라우터에서 차단.
- 좋아요/댓글 → 게시물 소유자에게 알림(`tab="you"`) **+** 행위자(actor)의 팔로워 전원에게 알림(`tab="following"`) — 이게 알림 페이지의 "회원님"/"팔로잉" 탭을 나누는 기준. 설정 row가 없으면 기본 허용.

### 카운터 캐싱
`Post.like_count`/`comment_count`, `Reel.like_count`/`comment_count`/`view_count`는 별도 집계 없이 좋아요/댓글/조회 발생 시점에 같은 트랜잭션에서 직접 증감(삭제 시 `max(0, count-1)`로 음수 방지). DB에서 자동 재계산되지 않으므로, 만약 `likes`/`comments` 테이블을 수동으로 건드리면 카운터가 어긋날 수 있음.

### 캐러셀/멀티미디어 게시물
`Post.image_url`은 레거시 단일 커버 URL로 남아있고, `PostMedia`(마이그레이션 006)가 게시물당 최대 10개의 순서 있는 미디어(이미지/영상)를 담당. `build_post_out`은 `media` 로우가 있으면 `media[0].media_url`을 커버로 우선 사용한다.

### 스토리
`Story`는 24시간 TTL(`STORY_TTL_HOURS=24`). TTL 내 추가 업로드는 새 `Story`를 만들지 않고 기존 활성 스토리에 `StoryItem`을 추가하며 `expires_at`을 갱신한다.

---

## 10. 실행

로컬 개발:
```bash
cd backend
python3 -m venv venv          # Python 3.10+ 필요 (PEP 604 `X | None` 타입 힌트 사용)
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```
`app/main.py`가 모듈 로드 시점에 `init_db()`(Alembic `upgrade head`)를 실행하므로 별도의 수동 마이그레이션 명령이 필요 없다(원한다면 `alembic upgrade head`를 직접 실행해도 동일하게 동작).

시드 데이터:
```bash
python -m scripts.seed           # users 테이블이 비어있을 때만 시드
python -m scripts.seed --reset   # 전체 초기화 후 재시드
```

프로덕션 배포/PostgreSQL 설정은 `guide.md` 참고. DB 스키마 상세는 `db.md` 참고.
