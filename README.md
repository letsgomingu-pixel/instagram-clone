# i am not a fishmonger

React + FastAPI 풀스택 개인 프로젝트입니다. Instagram UI를 참고해 만들었고, 브랜드는 **"i am not a fishmonger"**로 변경되었습니다.

**프로덕션:** https://iamnotafishmonger.com (AWS EC2 · nginx · PostgreSQL)

---

## 빠른 시작

프로젝트 루트에서 **한 줄**만 입력하세요:

```bash
npm run dev
```

자동으로 처리되는 작업:
1. 백엔드 Python 패키지 설치 (최초 1회 venv 생성)
2. 프론트엔드 npm 패키지 설치
3. 백엔드 + 프론트엔드 서버 동시 실행
4. 브라우저 자동 열기

> **필수:** [Node.js 18+](https://nodejs.org) (권장 20+) · [Python 3.10+](https://python.org)

Windows에서는 `start.bat` 또는 `start.ps1` 더블클릭으로도 동일하게 실행됩니다.

---

## 접속 URL (로컬)

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:5173 |
| 백엔드 API | http://localhost:8001 |
| Swagger Docs | http://localhost:8001/docs |

Vite가 `/api`, `/media`를 백엔드(`127.0.0.1:8001`)로 프록시하므로 CORS 설정 없이 바로 통신됩니다.

---

## 기타 명령어

```bash
npm run setup   # 패키지만 설치 (서버 실행 X)
npm start       # npm run dev 와 동일
npm run build   # 프론트엔드 프로덕션 빌드
npm run e2e     # Playwright E2E 테스트
```

---

## 프로젝트 구조

```
.
├── backend/          # FastAPI + SQLAlchemy + Alembic
├── frontend/         # React 19 + Vite 8 + Tailwind CSS v4
├── deploy/           # EC2 배포 스크립트 (nginx, systemd, PostgreSQL)
├── e2e/              # Playwright E2E 테스트
├── scripts/          # setup.js, dev.js
├── guide.md          # 프로젝트 전체 가이드 (배포·환경변수·트러블슈팅)
├── front.md          # 프론트엔드 상세 문서
├── backend.md        # 백엔드 API 상세 문서
├── db.md             # DB 스키마 상세 문서
└── package.json
```

---

## 테스트 계정 (로컬 개발 전용)

앱 시작 시 데모 계정이 자동으로 생성·복구됩니다. (`SEED_DEMO_USERS=true`, 프로덕션에서는 `false`)

| 계정 | 아이디 | 비밀번호 | 비고 |
|------|--------|----------|------|
| 일반 사용자 | `letsgomingu` (이메일 `letsgomingu@gmail.com`) | `12345` | |
| 관리자 | `admin` (이메일 `admin@instagram.local`) | `pass123` | `/admin` 접근 |

로그인 페이지(`/login`)에서 **이메일 또는 사용자명** + 비밀번호로 로그인할 수 있습니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router v7, Axios |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, JWT, bcrypt, pyotp (2FA) |
| DB (로컬) | SQLite (`sqlite:///./instagram.db`) |
| DB (프로덕션) | PostgreSQL (EC2 자체 호스팅) |
| 배포 | nginx + systemd + Let's Encrypt (certbot) |
| 미디어 | 로컬 디스크 (S3 + CloudFront 전환 코드 준비됨) |

---

## 주요 기능

- 피드, 탐색, 검색, 프로필, 게시물·릴스·스토리
- 좋아요, 댓글, 팔로우, DM, 알림
- 다중 이미지 캐러셀 업로드
- 모바일·데스크톱 반응형 UI
- 설정(프로필, 알림, 개인정보, 보안·2FA)
- 관리자 대시보드 (`/admin`)

---

## 문서

| 문서 | 내용 |
|------|------|
| [guide.md](./guide.md) | 로컬 개발, 환경 변수, 프로덕션 배포, 트러블슈팅 |
| [front.md](./front.md) | 프론트엔드 라우팅, 컴포넌트, API 모듈 |
| [backend.md](./backend.md) | 백엔드 엔드포인트, 인증, 비즈니스 로직 |
| [db.md](./db.md) | DB 스키마, 마이그레이션 히스토리 |
| [deploy/README.md](./deploy/README.md) | 배포 가이드 |
| [deploy/POSTGRES_AND_S3.md](./deploy/POSTGRES_AND_S3.md) | PostgreSQL / S3 전환 절차 |

---

## 저장소

https://github.com/letsgomingu-pixel/instagram-clone
