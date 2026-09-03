# i am not a fishmonger — 데이터베이스 현황

> **DBMS: PostgreSQL** (자체 호스팅, 프로덕션 EC2 서버 내 동일 인스턴스에 설치 — RDS 아님). SQLite에서 마이그레이션 완료. 이 문서는 실제 SQLAlchemy 모델(`backend/app/models/`)과 Alembic 마이그레이션(`backend/alembic/versions/`)을 기준으로 작성되었다.
>
> 이 저장소를 그대로 clone한 로컬 체크아웃 자체는 여전히 `sqlite:///./instagram.db`가 기본값이다(`backend/.env.example`, `app/config.py`의 기본값). 프로덕션은 `deploy/setup-postgres.sh`가 만들어준 `postgresql+psycopg2://...` URL을 서버의 (git 미포함) `backend/.env`에 넣어서 사용한다. 마이그레이션은 두 방언 모두에서 동일하게 동작하도록 작성되어 있다(Alembic이 SQLite에서만 batch mode를 사용).

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| DBMS | PostgreSQL(프로덕션, 자체 호스팅) / SQLite(이 체크아웃의 로컬 기본값) |
| 드라이버 | `psycopg2-binary` |
| ORM | SQLAlchemy 2.0 (`DeclarativeBase`, `Mapped`/`mapped_column` 스타일) |
| 마이그레이션 | Alembic, 헤드 리비전 `006_post_media` |
| 프로덕션 DB/롤 이름 | `instagram` / `instagram` (`deploy/setup-postgres.sh` 기본값) |
| 테이블 수 | **18개** |

### 1.1 테이블 목록

| # | 테이블 | 추가된 마이그레이션 |
|---|---|---|
| 1 | `users` | 001 |
| 2 | `posts` | 001 |
| 3 | `post_media` | 006 |
| 4 | `comments` | 001 |
| 5 | `likes` | 001 |
| 6 | `follows` | 001 |
| 7 | `saved_posts` | 001 |
| 8 | `stories` | 001 |
| 9 | `story_items` | 001 (media_type/overlays 컬럼은 002) |
| 10 | `story_views` | 001 |
| 11 | `reels` | 001 (video_url 컬럼은 003) |
| 12 | `reel_likes` | 001 |
| 13 | `post_tags` | 001 |
| 14 | `conversations` | 001 |
| 15 | `messages` | 001 |
| 16 | `notifications` | 001 |
| 17 | `user_settings` | 003 (보안 컬럼은 004) |
| 18 | `login_sessions` | 004 |

별도의 "관리자" 테이블은 없다 — 관리자 여부는 `users.is_admin`(마이그레이션 005) 불리언 컬럼 하나로 표현되고, "신뢰 기기"는 계정 단위가 아니라 `login_sessions.is_trusted`(세션 단위)로 표현된다.

---

## 2. 테이블 상세

모든 테이블 공통: `id`(Integer, PK, 인덱스), 대부분 `created_at TIMESTAMPTZ NOT NULL server_default=now()`.

### `users`
| 컬럼 | 타입 | Null | 기본값 |
|---|---|---|---|
| id | Integer | N | PK |
| username | String(30) | N | UNIQUE, 인덱스 |
| email | String(255) | N | UNIQUE, 인덱스 |
| password_hash | String(255) | N | |
| full_name | String(100) | N | |
| bio | Text | Y | |
| website | String(255) | Y | |
| avatar_url | String(500) | Y | |
| is_active | Boolean | N | ORM 기본값 `True` (⚠ DB server_default 없음, 아래 8장 참고) |
| is_admin | Boolean | N | `server_default=false` (마이그레이션 005) |
| created_at | TIMESTAMPTZ | N | `now()` |
| updated_at | TIMESTAMPTZ | Y | `onupdate=now()` |

관계: posts, comments, likes, reels, reel_likes, tagged_in_posts, story_views, sent_messages, notifications_received/sent, settings(1:1), login_sessions — 전부 `cascade="all, delete-orphan"`.

### `posts`
| 컬럼 | 타입 | Null | 기본값 |
|---|---|---|---|
| id | Integer | N | PK |
| user_id | Integer | N | FK→users.id ON DELETE CASCADE |
| image_url | String(500) | N | 레거시 커버 이미지(캐러셀 도입 후에도 유지) |
| caption | Text | Y | |
| location | String(255) | Y | |
| like_count | Integer | N | ORM 기본값 0 (캐시) |
| comment_count | Integer | N | ORM 기본값 0 (캐시) |
| created_at / updated_at | TIMESTAMPTZ | | `now()` / `onupdate=now()` |

### `post_media` (마이그레이션 006, 캐러셀/영상 게시물)
| 컬럼 | 타입 | Null | 기본값 |
|---|---|---|---|
| id | Integer | N | PK |
| post_id | Integer | N | FK→posts.id CASCADE |
| media_url | String(500) | N | |
| media_type | String(10) | N | `server_default="image"` |
| position | Integer | N | `server_default="0"` |
| created_at | TIMESTAMPTZ | N | `now()` |

게시물당 최대 10개, `position` 순서. 마이그레이션 006이 기존 `posts.image_url`을 `post_media`에 1행씩 백필했다.

### `comments`
`id`, `post_id`(FK CASCADE), `user_id`(FK CASCADE), `content`(Text, NOT NULL), `created_at`.

### `likes`
`id`, `user_id`(FK CASCADE), `post_id`(FK CASCADE), `created_at`. **`UNIQUE(user_id, post_id)`** — 사용자당 게시물당 좋아요 1개.

### `follows`
`id`, `follower_id`/`following_id`(둘 다 FK→users.id CASCADE), `created_at`. **`UNIQUE(follower_id, following_id)`**, **`CHECK(follower_id != following_id)`**(자기 자신 팔로우 금지).

### `saved_posts`
`id`, `user_id`(FK CASCADE), `post_id`(FK CASCADE), `created_at`. **`UNIQUE(user_id, post_id)`**.

### `stories`
`id`, `user_id`(FK CASCADE), `expires_at`(TIMESTAMPTZ, 인덱스), `created_at`. 관계: `items`, `views`(둘 다 cascade delete-orphan).

### `story_items`
`id`, `story_id`(FK CASCADE), `image_url`, `media_type`(String(10), `server_default="image"`, 마이그레이션 002), `overlays`(Text, nullable, JSON 직렬화 문자열, 마이그레이션 002), `created_at`.

### `story_views`
`id`, `user_id`(FK CASCADE), `story_id`(FK CASCADE), `viewed_at`. **`UNIQUE(user_id, story_id)`**.

### `reels`
`id`, `user_id`(FK CASCADE), `thumbnail_url`, `video_url`(nullable, 마이그레이션 003), `caption`, `audio_name`, `like_count`/`comment_count`/`view_count`(ORM 기본값 0, 캐시), `created_at`.

> `reels.comment_count` 컬럼은 존재하지만 `comments` 테이블에는 `reel_id` 컬럼이 없다 — 릴스 댓글을 저장할 관계형 테이블이 스키마에 없다(모델 인벤토리 시점 기준 알려진 불일치). `view_count`도 `story_views`처럼 사용자별 기록 테이블 없이 집계 숫자만 증가한다.

### `reel_likes`
`id`, `user_id`(FK CASCADE), `reel_id`(FK CASCADE), `created_at`. **`UNIQUE(user_id, reel_id)`**.

### `post_tags`
`id`, `post_id`(FK CASCADE), `user_id`(FK CASCADE), `created_at`. **`UNIQUE(post_id, user_id)`** — 게시물당 동일 사용자 태그 1회.

### `conversations`
`id`, `user1_id`/`user2_id`(FK CASCADE), `updated_at`(`now()`, `onupdate=now()`). **`UNIQUE(user1_id, user2_id)`**, **`CHECK(user1_id < user2_id)`** — 항상 작은 id를 user1로 정규화(앱 레벨에서도 `conversation_pair()` 헬퍼로 정렬해서 삽입).

### `messages`
`id`, `conversation_id`(FK CASCADE), `sender_id`(FK CASCADE), `content`(Text NOT NULL), `is_read`(ORM 기본값 False), `created_at`.

### `notifications`
`id`, `recipient_id`/`actor_id`(FK CASCADE), `type`(String(20): "like"/"comment"/"follow"), `tab`(String(20), ORM 기본값 "you"), `post_id`(FK→posts.id, **ON DELETE SET NULL** — 게시물이 삭제돼도 알림 자체는 남고 링크만 끊어짐), `comment_preview`(Text, nullable), `is_read`(ORM 기본값 False), `created_at`.

### `user_settings` (1:1, PK=FK)
| 컬럼 | 타입 | 기본값 |
|---|---|---|
| user_id | Integer | **PK이자 FK**→users.id CASCADE |
| notify_likes / notify_comments / notify_follows / notify_mentions | Boolean | `server_default=true` |
| is_private | Boolean | `server_default=false` |
| show_activity_status / allow_story_replies | Boolean | `server_default=true` |
| comments_privacy / mentions_privacy | String(20) | `server_default="everyone"` (앱 레벨 enum: everyone/followers/off, DB CHECK 없음) |
| login_email_alerts | Boolean | `server_default=true` (마이그레이션 004) |
| two_factor_enabled | Boolean | `server_default=false` (마이그레이션 004) |
| two_factor_secret | String(64) | nullable, TOTP secret (마이그레이션 004) |
| updated_at | TIMESTAMPTZ | `now()` / `onupdate=now()` |

### `login_sessions` (마이그레이션 004)
`id`, `user_id`(FK CASCADE), `ip_address`(String(45)), `user_agent`(String(500)), `device_name`(String(100), User-Agent에서 파싱), `location`(String(120), nullable — 현재 코드상 항상 "Unknown"으로 채워짐), `is_trusted`(`server_default=false`), `created_at`, `last_active_at`. 명시적 인덱스 `idx_login_sessions_user_id`.

---

## 3. 관계 요약

- **User는 거의 모든 것의 루트**: 삭제되면 게시물/댓글/좋아요/릴스/스토리 조회기록/보낸 메시지/받거나 보낸 알림/설정/로그인세션이 전부 CASCADE로 함께 삭제된다.
- **Post 삭제** → comments/likes/tags/post_media CASCADE 삭제. 단, 그 게시물을 참조하던 **notification은 삭제되지 않고 `post_id`만 NULL**이 된다.
- **Story 삭제** → items/views CASCADE. **Reel 삭제** → reel_likes CASCADE. **Conversation 삭제** → messages CASCADE.
- 팔로우/좋아요/저장/스토리조회/릴스좋아요/게시물태그/대화는 모두 "쌍(pair) 유일성"을 UNIQUE 제약으로 DB가 직접 보장한다(멱등 토글 API의 기반).

---

## 4. Alembic 마이그레이션 히스토리

체인: `001_initial_schema_v2` → `002_story_media_overlays` → `003_user_settings_reel_video` → `004_user_security` → `005_admin_role` → `006_post_media`(헤드).

| # | 리비전 | 내용 |
|---|---|---|
| 001 | `initial_schema_v2` | 15개 기본 테이블 전체 생성(FK, unique/check 제약, 인덱스 포함). `down_revision=None`(루트). |
| 002 | `story_media_overlays` | `story_items`에 `media_type`, `overlays` 추가 — 영상 스토리 + 텍스트/스티커 오버레이 지원. |
| 003 | `user_settings_reel_video` | `user_settings` 테이블 신설(알림/공개범위 설정), `reels.video_url` 추가. |
| 004 | `user_security` | `user_settings`에 `login_email_alerts`/`two_factor_enabled`/`two_factor_secret` 추가, `login_sessions` 테이블 신설. |
| 005 | `admin_role` | `users.is_admin` 추가. |
| 006 | `post_media` | `post_media` 테이블 신설 + 기존 `posts.image_url`을 1행씩 백필하는 데이터 마이그레이션 포함(헤드). |

`alembic/env.py`는 SQLite에서만 `render_as_batch=True`를 켠다 — 002~005의 `batch_alter_table` 블록은 SQLite에서는 테이블 재생성 방식으로, PostgreSQL에서는 평범한 `ALTER TABLE ADD COLUMN`으로 동작해 결과는 동일하다.

> **불리언 기본값 표기법**: `user_settings`/`login_sessions`/`users.is_admin`의 불리언 컬럼들은 모두 처음부터 `sa.text("true")`/`sa.text("false")` 형태로 작성되어 있어 PostgreSQL에서도 문제없이 적용된다. 반면 001에서 만들어진 `users.is_active`, `messages.is_read`, `notifications.is_read`는 **DB server_default가 아예 없고** ORM의 Python 레벨 `default=`에만 의존한다 — 앱을 거치지 않는 직접 INSERT를 한다면 NOT NULL 위반이 날 수 있는 잠재적 포인트다.

---

## 5. 엔진 설정 (`backend/app/database.py`)

```python
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.is_sqlite else {},
    echo=False,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if settings.is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
```

`is_sqlite`(=`database_url.startswith("sqlite")`)가 거짓이면(PostgreSQL) `check_same_thread` 인자와 `PRAGMA` 리스너가 완전히 스킵된다 — 코드는 남아있지만 프로덕션에서는 실행되지 않는 죽은 분기다. 별도 커넥션 풀 설정(`pool_size` 등)은 없어 SQLAlchemy 기본 `QueuePool`(size 5, overflow 10)을 그대로 쓴다.

프로덕션 `DATABASE_URL` 형식: `postgresql+psycopg2://instagram:<비밀번호>@localhost:5432/instagram` — `deploy/setup-postgres.sh`가 롤/DB를 생성하고 이 값을 1회 출력한다(재실행해도 비밀번호는 바뀌지 않음). 자세한 절차는 `guide.md` 참고.

---

## 6. 카운터 캐싱 (비정규화 컬럼)

| 컬럼 | 갱신 시점 |
|---|---|
| `posts.like_count` | `POST /posts/{id}/like` 토글 시 즉시 증감 |
| `posts.comment_count` | 댓글 작성/삭제 시 즉시 증감 |
| `reels.like_count` | `POST /reels/{id}/like` 토글 시 |
| `reels.view_count` | `POST /reels/{id}/view` 시 증가만 |
| `reels.comment_count` | 컬럼은 있으나 릴스 댓글을 저장하는 테이블이 없음(위 `reels` 절 참고) |

**별도 집계 배치/트리거 없음** — 전부 요청 처리 트랜잭션 안에서 직접 증감(`max(0, count-1)`로 음수 방지). `users.follower_count`/`following_count`/`post_count`는 비정규화 컬럼 자체가 없고, 매번 `follows`/`posts` 테이블을 카운트해서 계산한다.

---

## 7. 데이터 무결성 규칙 정리

**UNIQUE**: `users.username`, `users.email`, `likes(user_id,post_id)`, `reel_likes(user_id,reel_id)`, `saved_posts(user_id,post_id)`, `follows(follower_id,following_id)`, `story_views(user_id,story_id)`, `post_tags(post_id,user_id)`, `conversations(user1_id,user2_id)`.

**CHECK**: `follows`의 `follower_id != following_id`, `conversations`의 `user1_id < user2_id`.

**앱 레벨에서만 강제**(DB 제약 없음): `user_settings.comments_privacy`/`mentions_privacy`의 3값 enum, `notifications.type`/`tab`의 허용값, 각종 `media_type` 필드의 허용값("image"/"video").

**FK 삭제 정책**: 대부분 `ON DELETE CASCADE`. 유일한 예외는 `notifications.post_id → posts.id`가 `ON DELETE SET NULL`인 것.

---

## 8. 시드 데이터 (`backend/scripts/seed.py`)

```bash
cd backend
python -m scripts.seed          # users 테이블이 비어있을 때만 실행
python -m scripts.seed --reset  # 전체 삭제 후 재시드
```

내부적으로 `init_db()`(Alembic upgrade head)를 먼저 호출하므로 빈 DB에 바로 실행해도 안전하다. 생성 내용: 사용자 6명(`letsgomingu` 포함, bcrypt 해시, pravatar.cc 아바타), 팔로우 3건, 게시물 9개(+태그), 댓글 6개, 좋아요/저장 일부, 릴스 6개, 스토리 6개(아이템 1~3개씩) + 조회기록, 대화 4개 + 메시지 다수(`user1_id < user2_id` 제약을 만족하도록 정렬하는 `conversation_pair()` 헬퍼 사용), 알림 14건.

별도로 `app/config.py`의 `SEED_DEMO_USERS=true`(로컬 기본값)는 **매 서버 시작마다** `admin`/`pass123`, `letsgomingu`/`12345` 두 계정만 자동 생성/복구한다(이 시드 스크립트와는 별개 경로) — 공개 도메인에 배포할 때는 반드시 `false`로 둬야 한다(`guide.md` 8장 참고).

---

## 9. 알려진 스키마 이슈 (문서화 목적)

- `users.is_active`, `messages.is_read`, `notifications.is_read` — DB server_default 없음, ORM 기본값에만 의존.
- `reels.comment_count` 컬럼은 있지만 릴스 댓글을 저장할 테이블/컬럼이 스키마에 없음.
- `reels.view_count`는 `story_views`와 달리 사용자별 조회 기록 없이 집계 숫자만 관리 — 중복 조회 방지 로직 없음.
- `comments_privacy`/`mentions_privacy`/`notifications.type`/각종 `media_type`은 DB CHECK나 PostgreSQL ENUM이 아닌 평범한 문자열 컬럼 — 값 유효성은 전적으로 애플리케이션 코드에 의존.
