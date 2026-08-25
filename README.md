# Instagram Clone

React + FastAPI + SQLite 기반 Instagram 클론 프로젝트입니다.

## 실행 방법

프로젝트 루트에서 **한 줄**만 입력하세요:

```bash
npm run dev
```

자동으로 처리되는 작업:
1. 백엔드 Python 패키지 설치 (최초 1회 venv 생성)
2. 프론트엔드 npm 패키지 설치
3. 백엔드 + 프론트엔드 서버 동시 실행
4. 브라우저 자동 열기

> **필수:** [Node.js 18+](https://nodejs.org) · [Python 3.11+](https://python.org)

Windows에서는 `start.bat` 더블클릭으로도 동일하게 실행됩니다.

---

## 접속 URL

| 서비스 | URL |
|--------|-----|
| 프론트엔드 | http://localhost:5173 |
| 백엔드 API | http://localhost:8000 |
| Swagger Docs | http://localhost:8000/docs |

---

## 기타 명령어

```bash
npm run setup   # 패키지만 설치 (서버 실행 X)
npm start       # npm run dev 와 동일
```

---

## 프로젝트 구조

```
my_instagram/
├── package.json      ← npm run dev (루트에서 실행)
├── scripts/
│   ├── setup.js      # 패키지 설치
│   └── dev.js        # 서버 실행
├── frontend/         # React + Vite
├── backend/          # FastAPI + SQLite
└── start.bat         # Windows 더블클릭 실행
```

---

## 테스트 계정

모든 페이지(홈, 탐색, 검색, 프로필, 게시물 작성 등)를 확인하려면 아래 계정으로 로그인하세요.

| 항목 | 값 |
|------|-----|
| 이메일 | letsgomingu@gmail.com |
| 비밀번호 | 12345 |
| 사용자명 | letsgomingu |

로그인 페이지(`/login`)에서 **이메일 또는 사용자명** + 비밀번호로 로그인할 수 있습니다.

---

## 구현 현황

### 프론트엔드 ✅
- Instagram UI 완전 구현 (홈, 탐색, 검색, 프로필, 스토리)
- 반응형 레이아웃 (모바일 / 데스크톱)
- Mock 데이터 기반 인터랙션

### 백엔드 🔧
- FastAPI 기본 구조 + SQLAlchemy 모델
- Health check API (`GET /api/v1/health`)

---

## 기술 스택

| Frontend | Backend |
|----------|---------|
| React 19, TypeScript, Vite | FastAPI, SQLAlchemy 2.0 |
| Tailwind CSS 4 | SQLite |
| TanStack Query | JWT (예정) |
