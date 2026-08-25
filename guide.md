# Instagram 클론 — 전체 프로젝트 가이드

## 1. 프로젝트 소개

React + FastAPI + SQLite 기술 스택으로 Instagram의 핵심 기능을 구현하는 풀스택 웹 애플리케이션입니다.

### 구현 기능
- ✅ 회원가입 / 로그인 / JWT 인증
- ✅ 게시물 업로드 / 삭제 / 피드
- ✅ 좋아요 / 댓글
- ✅ 팔로우 / 언팔로우
- ✅ 사용자 프로필 / 프로필 편집
- ✅ 탐색 / 사용자 검색
- ✅ 스토리 (24시간 만료)
- ✅ 게시물 저장
- ✅ 반응형 UI (모바일 / 데스크톱)

---

## 2. 기술 스택

```
┌─────────────────────────────────────────────────────┐
│                    Client (Browser)                  │
│              React 18 + TypeScript + Vite            │
│              Tailwind CSS + TanStack Query           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST (JSON + multipart)
                       │ Authorization: Bearer JWT
┌──────────────────────▼──────────────────────────────┐
│                  FastAPI Server                      │
│         Python 3.11 + SQLAlchemy + Pydantic          │
│              JWT Auth + Pillow (이미지)              │
└──────────────────────┬──────────────────────────────┘
                       │ SQLAlchemy ORM
┌──────────────────────▼──────────────────────────────┐
│                   SQLite 3                           │
│              instagram.db + media/                   │
└─────────────────────────────────────────────────────┘
```

---

## 3. 프로젝트 디렉토리 구조

```
my_instagram/
├── frontend/          # React 프론트엔드
├── backend/           # FastAPI 백엔드
├── docs/              # 명세서 (선택)
│   ├── front.md
│   ├── backend.md
│   └── db.md
├── guide.md           # 이 파일
├── .gitignore
└── README.md
```

---

## 4. 개발 환경 설정

### 4.1 사전 요구사항

| 도구 | 최소 버전 | 확인 명령 |
|------|-----------|-----------|
| Node.js | 18+ | `node -v` |
| Python | 3.11+ | `python --version` |
| Git | 2.x | `git --version` |

### 4.2 원클릭 실행 (권장)

```bash
# 방법 1: 더블클릭
start.bat

# 방법 2: 터미널
npm start
```

자동 실행 항목:
1. 백엔드 Python venv 생성 + 패키지 설치
2. 프론트엔드 npm 패키지 설치
3. 백엔드(8000) + 프론트엔드(5173) 동시 실행
4. 브라우저 자동 열기

### 4.3 저장소 클론

```bash
git clone <repository-url>
cd my_instagram
```

### 4.4 백엔드 설정 (개별 실행)

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 SECRET_KEY 수정

# DB 마이그레이션
alembic upgrade head

# 시드 데이터 (선택)
python scripts/seed.py

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

서버 확인: http://localhost:8000/docs (Swagger UI)

### 4.5 프론트엔드 설정 (개별 실행)

```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.development

# 개발 서버 실행
npm run dev
```

앱 확인: http://localhost:5173

---

## 5. 개발 워크플로우

### 5.1 권장 개발 순서

```
Phase 1: 기반 구축 (1-2일)
├── 백엔드 프로젝트 셋업 + DB 스키마
├── 프론트엔드 프로젝트 셋업 + 라우팅
└── 인증 API + 로그인/회원가입 UI

Phase 2: 핵심 기능 (3-4일)
├── 게시물 CRUD API + CreatePost UI
├── 홈 피드 API + PostCard 컴포넌트
├── 좋아요/댓글 API + UI
└── 프로필 페이지

Phase 3: 소셜 기능 (2일)
├── 팔로우/언팔로우
├── 탐색/검색
└── 저장 기능

Phase 4: 부가 기능 (1-2일)
├── 스토리
├── 반응형 polish
└── 테스트 + 버그 수정
```

### 5.2 Git 브랜치 전략

```
main          ← 안정 버전
└── develop   ← 개발 통합
    ├── feature/auth
    ├── feature/posts
    ├── feature/profile
    └── feature/stories
```

커밋 메시지 규칙:
```
feat: 게시물 좋아요 API 구현
fix: 피드 페이지네이션 버그 수정
style: PostCard 반응형 레이아웃
docs: API 명세서 업데이트
```

---

## 6. API 통신 흐름

### 6.1 인증 흐름

```
[Client]                    [Server]
   │                           │
   │── POST /auth/register ───►│  사용자 생성 + JWT 발급
   │◄── { access_token } ──────│
   │                           │
   │  localStorage.setItem     │
   │  ('token', access_token)  │
   │                           │
   │── GET /posts/feed ────────►│  Authorization: Bearer {token}
   │◄── { items: [...] } ──────│
   │                           │
   │── 401 Unauthorized ───────│  토큰 만료
   │  → /login 리다이렉트      │
```

### 6.2 게시물 업로드 흐름

```
[Client]                         [Server]
   │                                │
   │  1. 이미지 선택 (react-dropzone)│
   │  2. 미리보기 표시               │
   │  3. 캡션 입력                   │
   │                                │
   │── POST /posts/ (multipart) ───►│
   │   FormData:                    │  4. Pillow로 이미지 검증
   │   - image: File                │  5. UUID 파일명으로 저장
   │   - caption: string            │  6. DB INSERT
   │◄── { id, image_url, ... } ────│
   │                                │
   │  7. 피드 캐시 invalidate       │
   │  8. 홈으로 이동                  │
```

---

## 7. 환경별 설정

### 개발 환경
| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/v1 |
| Swagger Docs | http://localhost:8000/docs |
| Media Files | http://localhost:8000/media/ |

### `.gitignore` 필수 항목
```gitignore
# Backend
backend/venv/
backend/.env
backend/instagram.db
backend/media/
backend/__pycache__/

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env.local

# IDE
.vscode/
.idea/
```

---

## 8. 테스트 계정

시드 데이터 실행 후 사용 가능:

| 사용자명 | 비밀번호 | 설명 |
|----------|----------|------|
| demo | demo1234 | 데모 계정 (게시물 10개) |
| alice | demo1234 | 팔로우 관계 테스트 |
| bob | demo1234 | 팔로우 관계 테스트 |

---

## 9. 주요 명령어 모음

### 백엔드
```bash
# 서버 실행
uvicorn app.main:app --reload --port 8000

# 테스트
pytest -v

# DB 마이그레이션
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1

# 시드 데이터
python scripts/seed.py
```

### 프론트엔드
```bash
# 개발 서버
npm run dev

# 빌드
npm run build

# 린트
npm run lint

# 타입 체크
npm run type-check
```

---

## 10. 트러블슈팅

### CORS 오류
```
Access to XMLHttpRequest blocked by CORS policy
```
→ `backend/app/main.py`에서 `ALLOWED_ORIGINS`에 프론트엔드 URL 추가

### SQLite 잠금 오류
```
database is locked
```
→ WAL 모드 확인, `check_same_thread=False` 설정 확인

### 이미지 업로드 실패
```
413 Request Entity Too Large
```
→ `MAX_UPLOAD_SIZE_MB` 설정 확인, nginx 사용 시 `client_max_body_size` 설정

### JWT 401 오류
- 토큰 만료: `/auth/refresh` 호출 또는 재로그인
- `SECRET_KEY` 변경 시 기존 토큰 무효화됨

### 프론트엔드 API 연결 실패
- `.env.development`의 `VITE_API_BASE_URL` 확인
- 백엔드 서버 실행 상태 확인

---

## 11. 배포 가이드 (선택)

### 백엔드 (Docker)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 프론트엔드 (Vercel / Netlify)
```bash
npm run build
# dist/ 폴더 배포
# 환경 변수: VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

---

## 12. 참고 문서

| 문서 | 설명 |
|------|------|
| [front.md](./front.md) | 프론트엔드 상세 명세 |
| [backend.md](./backend.md) | 백엔드 API 명세 |
| [db.md](./db.md) | 데이터베이스 설계 |

### 외부 참고
- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [React Router v6](https://reactrouter.com/)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)

---

## 13. 라이선스

MIT License — 학습 및 포트폴리오 목적으로 자유롭게 사용 가능합니다.
