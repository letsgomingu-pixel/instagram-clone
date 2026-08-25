# Instagram 클론 — 데이터베이스 설계 명세서 (v2)

> **동기화 기준:** `backend.md` v2 · 프론트엔드 `frontend/src/types/index.ts`  
> **DBMS:** 개발·프로덕션 모두 **SQLite 3**

---

## 1. 개요

| 항목 | 내용 |
|------|------|
| DBMS | SQLite 3 |
| ORM | SQLAlchemy 2.0 |
| 마이그레이션 | Alembic (권장) |
| 개발 DB | `./instagram.db` (`DATABASE_URL=sqlite:///./instagram.db`) |
| 프로덕션 DB | `./data/instagram.db` |
| 미디어 | `./media/` (개발), `./data/media/` (프로덕션) |
| 문자 인코딩 | UTF-8 |
| 테이블 수 | **16개** |

### 1.1 테이블 목록

| # | 테이블 | 프론트 대응 |
|---|--------|-------------|
| 1 | `users` | `User`, 인증·프로필 |
| 2 | `posts` | `Post` |
| 3 | `comments` | `Comment` |
| 4 | `likes` | `Post.is_liked` |
| 5 | `follows` | `User.is_following`, 팔로우 |
| 6 | `saved_posts` | `Post.is_saved`, 저장됨 탭 |
| 7 | `stories` | `Story` |
| 8 | `story_items` | `StoryItem`, `StoryOverlay` (JSON in `overlays`) |
| 9 | `story_views` | `Story.viewed` |
| 10 | `reels` | `Reel` |
| 11 | `reel_likes` | `Reel.is_liked` |
| 12 | `post_tags` | `Post.tagged_users`, 태그됨 탭 |
| 13 | `conversations` | `Conversation` |
| 14 | `messages` | `Message` |
| 15 | `notifications` | `Notification` |
| 16 | `user_settings` | 설정 (알림·개인정보·보안) |
| 17 | `login_sessions` | 로그인 활동·저장된 로그인 |

---

## 2. ERD (Entity Relationship Diagram)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    users    │       │    posts    │       │  comments   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │──┐    │ id (PK)     │
│ username    │  │    │ user_id(FK) │◄─┘    │ post_id(FK) │
│ email       │  └───►│ image_url   │       │ user_id(FK) │
│ password_hash│      │ caption     │       │ content     │
│ full_name   │       │ location    │       │ created_at  │
│ bio         │       │ like_count  │       └─────────────┘
│ website     │       │ comment_count│
│ avatar_url  │       │ created_at  │
│ is_active   │       └──────┬──────┘
│ created_at  │              │
└──────┬──────┘              │
       │         ┌───────────┼───────────┐
       │         │           │           │
       │    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
       │    │  likes  │ │post_tags│ │saved_posts│
       │    ├─────────┤ ├─────────┤ ├───────────┤
       │    │user_id  │ │post_id  │ │ user_id   │
       │    │post_id  │ │user_id  │ │ post_id   │
       │    └─────────┘ └─────────┘ └───────────┘
       │
       │    ┌─────────────┐       ┌─────────────┐
       └───►│   follows   │       │   stories   │
            ├─────────────┤       ├─────────────┤
            │ follower_id │       │ id (PK)     │──┐
            │ following_id│       │ user_id(FK) │  │
            └─────────────┘       │ expires_at  │  │
                                  └─────────────┘  │
                                         │         │
                                  ┌──────▼──────┐  │
                                  │ story_items │  │
                                  ├─────────────┤  │
                                  │ story_id(FK)│  │
                                  │ image_url   │  │
                                  │ media_type  │  │
                                  │ overlays    │  │
                                  └─────────────┘  │
                                                   │
┌─────────────┐       ┌─────────────┐    ┌───────▼──────┐
│    reels    │       │ reel_likes  │    │ story_views  │
├─────────────┤       ├─────────────┤    ├──────────────┤
│ id (PK)     │──┐    │ user_id(FK) │    │ user_id (FK) │
│ user_id(FK) │  └───►│ reel_id(FK) │    │ story_id(FK)│
│ thumbnail_url│      └─────────────┘    │ viewed_at    │
│ caption     │                          └──────────────┘
│ audio_name  │
│ like_count  │       ┌─────────────┐       ┌─────────────┐
│ comment_count│      │conversations│       │  messages   │
│ view_count  │       ├─────────────┤       ├─────────────┤
│ created_at  │       │ id (PK)     │──┐    │ id (PK)     │
└─────────────┘       │ user1_id(FK)│  └───►│ conv_id(FK)│
                      │ user2_id(FK)│       │ sender_id   │
                      │ updated_at  │       │ content     │
                      └─────────────┘       │ is_read     │
                                            │ created_at  │
                                            └─────────────┘

┌─────────────────────────────────────────────────────────┐
│                     notifications                        │
├─────────────────────────────────────────────────────────┤
│ id (PK) │ recipient_id(FK) │ actor_id(FK) │ type       │
│ tab │ post_id(FK, NULL) │ comment_preview │ is_read    │
│ created_at                                               │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 테이블 상세 명세

### 3.1 `users` — 사용자

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 사용자 ID |
| `username` | VARCHAR(30) | UNIQUE, NOT NULL | 사용자명 (@handle) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt 해시 |
| `full_name` | VARCHAR(100) | NOT NULL | 표시 이름 |
| `bio` | TEXT | NULL | 자기소개 (최대 150자) |
| `website` | VARCHAR(255) | NULL | 웹사이트 URL |
| `avatar_url` | VARCHAR(500) | NULL | 프로필 사진 경로 |
| `is_active` | BOOLEAN | DEFAULT TRUE | 계정 활성 상태 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 가입일 |
| `updated_at` | DATETIME | NULL | 수정일 |

**인덱스**
```sql
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

---

### 3.2 `posts` — 게시물

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 게시물 ID |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 작성자 |
| `image_url` | VARCHAR(500) | NOT NULL | 이미지 파일 경로 |
| `caption` | TEXT | NULL | 캡션 (최대 2,200자) |
| `location` | VARCHAR(255) | NULL | 위치 태그 |
| `like_count` | INTEGER | DEFAULT 0 | 좋아요 수 (캐시) |
| `comment_count` | INTEGER | DEFAULT 0 | 댓글 수 (캐시) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 작성일 |
| `updated_at` | DATETIME | NULL | 수정일 |

**인덱스**
```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

**외래키**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### 3.3 `comments` — 댓글

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 댓글 ID |
| `post_id` | INTEGER | FK → posts.id, NOT NULL | 게시물 |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 작성자 |
| `content` | TEXT | NOT NULL | 댓글 내용 (최대 1,000자) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 작성일 |

**인덱스**
```sql
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
```

**외래키**
```sql
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### 3.4 `likes` — 게시물 좋아요

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 좋아요 ID |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 좋아요한 사용자 |
| `post_id` | INTEGER | FK → posts.id, NOT NULL | 게시물 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 좋아요 일시 |

**제약**
```sql
UNIQUE (user_id, post_id)
```

**인덱스**
```sql
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
```

---

### 3.5 `follows` — 팔로우 관계

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 관계 ID |
| `follower_id` | INTEGER | FK → users.id, NOT NULL | 팔로우하는 사용자 |
| `following_id` | INTEGER | FK → users.id, NOT NULL | 팔로우 대상 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 팔로우 일시 |

**제약**
```sql
UNIQUE (follower_id, following_id)
CHECK (follower_id != following_id)
```

**인덱스**
```sql
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
```

---

### 3.6 `saved_posts` — 저장된 게시물

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 저장 ID |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 저장한 사용자 |
| `post_id` | INTEGER | FK → posts.id, NOT NULL | 게시물 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 저장 일시 |

**제약**
```sql
UNIQUE (user_id, post_id)
```

---

### 3.7 `stories` — 스토리

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 스토리 ID |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 작성자 |
| `expires_at` | DATETIME | NOT NULL | 만료 시간 (생성 + 24h) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**인덱스**
```sql
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expires_at ON stories(expires_at);
```

---

### 3.8 `story_items` — 스토리 아이템 (개별 슬라이드)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 아이템 ID |
| `story_id` | INTEGER | FK → stories.id, NOT NULL | 스토리 |
| `image_url` | VARCHAR(500) | NOT NULL | 미디어 경로 (`/media/stories/…`) — 이미지·동영상 공통 |
| `media_type` | VARCHAR(10) | NOT NULL, DEFAULT `'image'` | `image` \| `video` |
| `overlays` | TEXT | NULL | 텍스트·스티커 오버레이 JSON 배열 (`StoryOverlay[]`) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성일 |

**`overlays` JSON 요소 (`StoryOverlay`)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | 클라이언트 생성 ID |
| `type` | string | `text` \| `sticker` |
| `content` | string | 텍스트 또는 이모지 |
| `x`, `y` | number | 슬라이드 기준 위치 0–100 (%) |
| `scale` | number | 기본 `1.0` |
| `rotation` | number | 기본 `0.0` (도) |
| `color` | string \| null | 텍스트 색상 hex (`type=text` 전용) |
| `font_size` | int \| null | 텍스트 크기 px (`type=text` 전용) |

**예시**
```json
[
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
]
```

**외래키**
```sql
FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
```

> **마이그레이션:** `002_story_media_overlays` — `media_type`, `overlays` 컬럼 추가 (`backend.md` §5.2, §7.5)

---

### 3.9 `story_views` — 스토리 조회 기록

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 조회 ID |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 조회한 사용자 |
| `story_id` | INTEGER | FK → stories.id, NOT NULL | 스토리 |
| `viewed_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 조회 일시 |

**제약**
```sql
UNIQUE (user_id, story_id)
```

---

### 3.10 `reels` — 릴스

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 릴스 ID |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 작성자 |
| `thumbnail_url` | VARCHAR(500) | NOT NULL | 썸네일 URL |
| `video_url` | VARCHAR(500) | NULL | 동영상 URL (`POST /reels` 업로드) |
| `caption` | TEXT | NULL | 캡션 |
| `audio_name` | VARCHAR(255) | NULL | 오디오 표시명 (`Reel.audio_name`) |
| `like_count` | INTEGER | DEFAULT 0 | 좋아요 수 (캐시) |
| `comment_count` | INTEGER | DEFAULT 0 | 댓글 수 (표시용, UI 없음) |
| `view_count` | INTEGER | DEFAULT 0 | 조회수 (캐시) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 작성일 |

**인덱스**
```sql
CREATE INDEX idx_reels_user_id ON reels(user_id);
CREATE INDEX idx_reels_created_at ON reels(created_at DESC);
```

**외래키**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### 3.11 `reel_likes` — 릴스 좋아요

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 좋아요 ID |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 좋아요한 사용자 |
| `reel_id` | INTEGER | FK → reels.id, NOT NULL | 릴스 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 좋아요 일시 |

**제약**
```sql
UNIQUE (user_id, reel_id)
```

**인덱스**
```sql
CREATE INDEX idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX idx_reel_likes_user_id ON reel_likes(user_id);
```

**외래키**
```sql
FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### 3.12 `post_tags` — 게시물 사용자 태그

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 태그 ID |
| `post_id` | INTEGER | FK → posts.id, NOT NULL | 게시물 |
| `user_id` | INTEGER | FK → users.id, NOT NULL | 태그된 사용자 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 태그 일시 |

**제약**
```sql
UNIQUE (post_id, user_id)
```

**인덱스**
```sql
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_user_id ON post_tags(user_id);
```

**외래키**
```sql
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### 3.13 `conversations` — 1:1 대화

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 대화 ID |
| `user1_id` | INTEGER | FK → users.id, NOT NULL | 참여자 1 (항상 `user1_id < user2_id`) |
| `user2_id` | INTEGER | FK → users.id, NOT NULL | 참여자 2 |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 마지막 메시지 시각 |

**제약**
```sql
UNIQUE (user1_id, user2_id)
CHECK (user1_id < user2_id)
```

**인덱스**
```sql
CREATE INDEX idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
```

**애플리케이션 규칙**
- 대화 생성·조회 시 두 user id를 정렬해 `(min_id, max_id)`로 저장·검색

---

### 3.14 `messages` — 메시지

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 메시지 ID |
| `conversation_id` | INTEGER | FK → conversations.id, NOT NULL | 대화 |
| `sender_id` | INTEGER | FK → users.id, NOT NULL | 발신자 |
| `content` | TEXT | NOT NULL | 메시지 내용 |
| `is_read` | BOOLEAN | DEFAULT FALSE | 읽음 여부 (`Message.is_read`) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 발신 시각 |

**인덱스**
```sql
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_unread ON messages(conversation_id, is_read);
```

**외래키**
```sql
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
```

---

### 3.15 `notifications` — 알림

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK, AUTOINCREMENT | 알림 ID |
| `recipient_id` | INTEGER | FK → users.id, NOT NULL | 수신자 |
| `actor_id` | INTEGER | FK → users.id, NOT NULL | 행위자 (`Notification.actor`) |
| `type` | VARCHAR(20) | NOT NULL | `like` \| `follow` \| `comment` |
| `tab` | VARCHAR(20) | DEFAULT 'you' | `you` \| `following` |
| `post_id` | INTEGER | FK → posts.id, NULL | like/comment 시 |
| `comment_preview` | TEXT | NULL | comment 시 미리보기 |
| `is_read` | BOOLEAN | DEFAULT FALSE | 읽음 여부 |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | 생성 시각 |

**인덱스**
```sql
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, tab, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read);
```

**외래키**
```sql
FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL
```

**알림 생성 규칙**
| 이벤트 | `type` | `recipient_id` | `post_id` |
|--------|--------|----------------|-----------|
| 게시물 좋아요 | `like` | 게시물 작성자 | 해당 post |
| 댓글 작성 | `comment` | 게시물 작성자 | 해당 post |
| 팔로우 | `follow` | 팔로우 대상 | NULL |

- `recipient_id == actor_id` 인 알림은 생성하지 않음
- `post_image_url`은 API 응답 시 `posts.image_url` JOIN으로 채움 (DB 컬럼 없음)

---

### 3.16 `user_settings` — 사용자 설정 (1:1)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `user_id` | INTEGER | PK, FK → users.id | 사용자 |
| `notify_likes` | BOOLEAN | DEFAULT TRUE | 좋아요 알림 |
| `notify_comments` | BOOLEAN | DEFAULT TRUE | 댓글 알림 |
| `notify_follows` | BOOLEAN | DEFAULT TRUE | 팔로우 알림 |
| `notify_mentions` | BOOLEAN | DEFAULT TRUE | 멘션 알림 |
| `is_private` | BOOLEAN | DEFAULT FALSE | 비공개 계정 |
| `show_activity_status` | BOOLEAN | DEFAULT TRUE | 활동 상태 표시 |
| `allow_story_replies` | BOOLEAN | DEFAULT TRUE | 스토리 답장 허용 |
| `comments_privacy` | VARCHAR(20) | DEFAULT `'everyone'` | `everyone` \| `followers` \| `off` |
| `mentions_privacy` | VARCHAR(20) | DEFAULT `'everyone'` | `everyone` \| `followers` \| `off` |
| `login_email_alerts` | BOOLEAN | DEFAULT TRUE | 새 기기 로그인 이메일 알림 |
| `two_factor_enabled` | BOOLEAN | DEFAULT FALSE | TOTP 2FA 활성화 |
| `two_factor_secret` | VARCHAR(64) | NULL | TOTP secret (활성화 전 setup 단계에도 임시 저장) |
| `updated_at` | DATETIME | NULL | 수정일 |

> **마이그레이션:** `003_user_settings_reel_video`, `004_user_security` (보안 컬럼)

---

### 3.17 `login_sessions` — 로그인 세션

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | INTEGER | PK | 세션 ID (JWT `sid`) |
| `user_id` | INTEGER | FK → users.id, INDEX | 사용자 |
| `ip_address` | VARCHAR(45) | NOT NULL | 클라이언트 IP |
| `user_agent` | VARCHAR(500) | NOT NULL | User-Agent |
| `device_name` | VARCHAR(100) | NOT NULL | 파싱된 기기명 |
| `location` | VARCHAR(120) | NULL | 위치 (현재 `Unknown`) |
| `is_trusted` | BOOLEAN | DEFAULT FALSE | 저장된 로그인 |
| `created_at` | DATETIME | NOT NULL | 최초 로그인 |
| `last_active_at` | DATETIME | NOT NULL | 마지막 활동 |

> **마이그레이션:** `004_user_security`

---

## 4. SQLAlchemy 모델 예시

> 실제 구현 파일: `backend/app/models/`. 아래는 v2 스키마 요약.

```python
# app/models/reel.py
class Reel(Base):
    __tablename__ = "reels"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    thumbnail_url: Mapped[str] = mapped_column(String(500))
    caption: Mapped[str | None] = mapped_column(Text)
    audio_name: Mapped[str | None] = mapped_column(String(255))
    like_count: Mapped[int] = mapped_column(default=0)
    comment_count: Mapped[int] = mapped_column(default=0)
    view_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class ReelLike(Base):
    __tablename__ = "reel_likes"
    __table_args__ = (UniqueConstraint("user_id", "reel_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    reel_id: Mapped[int] = mapped_column(ForeignKey("reels.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

```python
# app/models/post_tag.py
class PostTag(Base):
    __tablename__ = "post_tags"
    __table_args__ = (UniqueConstraint("post_id", "user_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

```python
# app/models/conversation.py
class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id"),
        CheckConstraint("user1_id < user2_id"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    user1_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    user2_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"))
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

```python
# app/models/notification.py
class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(20))  # like | follow | comment
    tab: Mapped[str] = mapped_column(String(20), default="you")
    post_id: Mapped[int | None] = mapped_column(ForeignKey("posts.id", ondelete="SET NULL"))
    comment_preview: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

---

## 5. 주요 쿼리 패턴

### 5.1 홈 피드
```sql
SELECT p.*, u.username, u.avatar_url
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.user_id IN (
    SELECT following_id FROM follows WHERE follower_id = :current_user_id
    UNION SELECT :current_user_id
)
ORDER BY p.created_at DESC
LIMIT :limit OFFSET :offset;
```

### 5.2 사용자 프로필 통계
```sql
SELECT
    u.*,
    (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
    (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS follower_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
    EXISTS(
        SELECT 1 FROM follows
        WHERE follower_id = :current_user_id AND following_id = u.id
    ) AS is_following
FROM users u
WHERE u.username = :username;
```

### 5.3 게시물 + 좋아요·저장·태그
```sql
-- is_liked, is_saved
SELECT p.*,
    EXISTS(SELECT 1 FROM likes WHERE user_id = :uid AND post_id = p.id) AS is_liked,
    EXISTS(SELECT 1 FROM saved_posts WHERE user_id = :uid AND post_id = p.id) AS is_saved
FROM posts p
WHERE p.id = :post_id;

-- tagged_users (별도 조회 또는 JSON aggregate)
SELECT u.id, u.username, u.full_name, u.avatar_url
FROM post_tags pt
JOIN users u ON pt.user_id = u.id
WHERE pt.post_id = :post_id;
```

### 5.4 프로필 태그됨 탭
```sql
SELECT p.*
FROM posts p
JOIN post_tags pt ON pt.post_id = p.id
WHERE pt.user_id = :profile_user_id
ORDER BY p.created_at DESC;
```

### 5.5 릴스 피드 / 프로필 릴스
```sql
SELECT r.*,
    EXISTS(SELECT 1 FROM reel_likes WHERE user_id = :uid AND reel_id = r.id) AS is_liked
FROM reels r
WHERE r.user_id = :username_user_id  -- 프로필: WHERE 필터
ORDER BY r.created_at DESC;
```

### 5.6 대화 목록 + unread_count
```sql
SELECT c.*,
    (SELECT COUNT(*) FROM messages m
     WHERE m.conversation_id = c.id
       AND m.is_read = FALSE
       AND m.sender_id != :current_user_id) AS unread_count
FROM conversations c
WHERE c.user1_id = :uid OR c.user2_id = :uid
ORDER BY c.updated_at DESC;
```

### 5.7 알림 목록
```sql
SELECT n.*,
    u_actor.username, u_actor.avatar_url,
    p.image_url AS post_image_url
FROM notifications n
JOIN users u_actor ON n.actor_id = u_actor.id
LEFT JOIN posts p ON n.post_id = p.id
WHERE n.recipient_id = :uid AND n.tab = :tab
ORDER BY n.created_at DESC;
```

### 5.8 만료 스토리 정리 (Startup/Cron)
```sql
DELETE FROM stories WHERE expires_at < datetime('now');
```

---

## 6. Alembic 마이그레이션

스키마 변경은 **`create_all()` 대신 Alembic** 으로 적용한다. 앱 시작·CLI·시드 모두 `upgrade head`를 사용한다.

### 적용 (일반)
```bash
cd backend
# 방법 1 — Alembic 직접
.\venv\Scripts\alembic.exe upgrade head

# 방법 2 — 래퍼 CLI
.\venv\Scripts\python.exe scripts\migrate.py upgrade

# 방법 3 — 초기화 + 시드
.\venv\Scripts\python.exe scripts\init_db.py --reset --seed
```

### 상태 확인
```bash
.\venv\Scripts\alembic.exe current
.\venv\Scripts\alembic.exe check    # 모델 ↔ 마이그레이션 일치 검증
.\venv\Scripts\python.exe scripts\verify_schema.py
.\venv\Scripts\python.exe scripts\verify_seed.py
```

### 전체 초기화
```bash
.\venv\Scripts\python.exe scripts\migrate.py reset --seed
# 또는
.\venv\Scripts\alembic.exe downgrade base
.\venv\Scripts\alembic.exe upgrade head
```

### `alembic/env.py` import 목록
```python
from app.database import Base
import app.models  # register all models

target_metadata = Base.metadata
```

### 현재 마이그레이션 버전
```
alembic/versions/
├── 001_initial_schema_v2.py      # 15 tables (users … notifications)
├── 002_story_media_overlays.py   # story_items.media_type, story_items.overlays
└── 003_user_settings_reel_video.py  # user_settings, reels.video_url
└── 004_user_security.py             # login_sessions, user_settings 보안 컬럼
```

새 스키마 변경 시:
```bash
.\venv\Scripts\alembic.exe revision --autogenerate -m "describe change"
.\venv\Scripts\alembic.exe upgrade head
```

---

## 7. 시드 데이터

`scripts/seed.py`는 프론트 `mockData.ts` · `mockMessages.ts` · `mockNotifications.ts`와 동일 구조를 DB에 넣는다.

| 항목 | 내용 |
|------|------|
| 테스트 계정 | `letsgomingu@gmail.com` / `letsgomingu` / `12345` |
| 샘플 사용자 | alice_kim, bob_lee, sarah_park, mike_jung, emma_cho |
| 게시물 | 9개 + `post_tags` (letsgomingu 태그 3건) |
| 릴스 | 6개 + `reel_likes` |
| 스토리 | 6명 × story_items |
| 팔로우·좋아요·댓글·저장 | Mock 분포 |
| 대화·메시지 | `initialConversations` 4건 |
| 알림 | `initialNotifications` (`you` 탭 위주) |

```bash
cd backend
python scripts/seed.py
```

---

## 8. 성능·SQLite 설정

### 카운터 캐싱
| 테이블 | 캐시 컬럼 | 갱신 이벤트 |
|--------|-----------|-------------|
| `posts` | `like_count`, `comment_count` | like, comment |
| `reels` | `like_count`, `view_count` | reel_like, view |

### SQLite PRAGMA (`database.py`)
```python
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()
```

### 페이지네이션
- 1차: `LIMIT :limit OFFSET :offset` (프론트 `page`/`limit`)
- 확장: cursor 기반 (`WHERE created_at < :cursor`)

---

## 9. 데이터 무결성 규칙

| 규칙 | 구현 |
|------|------|
| 사용자명·이메일 중복 방지 | UNIQUE |
| 자기 팔로우 방지 | CHECK + 앱 검증 |
| 중복 좋아요(게시물·릴스) | UNIQUE (user_id, post_id/reel_id) |
| 중복 태그 | UNIQUE (post_id, user_id) |
| 대화 쌍 중복 방지 | UNIQUE (user1_id, user2_id), user1_id < user2_id |
| 게시물·릴스·스토리 삭제 | ON DELETE CASCADE |
| 알림의 post 삭제 | post_id SET NULL |
| 스토리 24h 만료 | expires_at + startup cleanup |
| 본인 알림 미생성 | 앱 레벨 (like/comment/follow handler) |

---

## 10. 백업 및 유지보수

```bash
# 개발 DB 백업
sqlite3 instagram.db ".backup backup/instagram_dev_$(date +%Y%m%d).db"

# 프로덕션 DB 백업
sqlite3 data/instagram.db ".backup backup/instagram_prod_$(date +%Y%m%d).db"

# VACUUM
sqlite3 instagram.db "VACUUM;"
```

---

## 11. 프론트 타입 ↔ DB 매핑

| TypeScript | DB / 쿼리 |
|------------|-------------|
| `User.post_count` | `COUNT(posts)` |
| `User.follower_count` | `COUNT(follows WHERE following_id=)` |
| `User.following_count` | `COUNT(follows WHERE follower_id=)` |
| `User.is_following` | `EXISTS(follows)` |
| `Post.is_liked` | `EXISTS(likes)` |
| `Post.is_saved` | `EXISTS(saved_posts)` |
| `Post.tagged_users[]` | `JOIN post_tags → users` |
| `Reel.is_liked` | `EXISTS(reel_likes)` |
| `Reel.view_count` | `reels.view_count` |
| `Story.viewed` | `EXISTS(story_views)` |
| `StoryItem.image_url` | `story_items.image_url` (이미지·동영상 URL) |
| `StoryItem.media_type` | `story_items.media_type` (`image` \| `video`) |
| `StoryItem.overlays` | `story_items.overlays` JSON → `StoryOverlay[]` |
| `StoryOverlay.*` | `overlays` JSON 필드 (§3.8) |
| `Conversation.unread_count` | `COUNT(messages WHERE is_read=0 AND sender≠me)` |
| `Message.is_read` | `messages.is_read` |
| `Notification.type` | `notifications.type` |
| `Notification.tab` | `notifications.tab` |
| `Notification.post_image_url` | `JOIN posts.image_url` (computed) |
| `Notification.target_username` | `JOIN posts → users.username` (팔로잉 탭, computed) |
| `Notification.actor` | `JOIN users ON actor_id` |

---

## 12. 문서 동기화

| 문서 | 역할 |
|------|------|
| `db.md` (본 문서) | 테이블·ERD·쿼리·무결성 |
| `backend.md` | API 엔드포인트·비즈니스 로직·구현 우선순위 |

스키마 변경 시 **두 문서를 함께 수정**한다.
