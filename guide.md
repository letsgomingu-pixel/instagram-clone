# i am not a fishmonger — 프로젝트 가이드

> React + FastAPI + PostgreSQL 풀스택 개인 프로젝트. Instagram UI를 참고해 만들었고, 브랜드는 **"i am not a fishmonger"**로 변경됨. **실제로 `https://iamnotafishmonger.com`에 배포되어 운영 중**이다(AWS EC2, Amazon Linux 2023). 이 문서는 저장소의 실제 스크립트/설정을 기준으로 작성되었다.

---

## 1. 기술 스택

```
Client:  React 19 + TypeScript + Vite 8 + Tailwind CSS v4
Server:  FastAPI + SQLAlchemy 2.0 + Alembic
DB:      PostgreSQL (자체 호스팅, EC2 동일 인스턴스)
Media:   로컬 디스크(기본) — S3 + CloudFront로 전환 가능(코드는 준비됨, 미적용 시 로컬 유지)
Proxy:   nginx (정적 파일 서빙 + /api, /media 리버스 프록시)
Process: systemd (instagram-backend.service, uvicorn 단일 워커)
HTTPS:   Let's Encrypt (certbot --nginx)
```

---

## 2. 디렉토리 구조

```
.
├── backend/         # FastAPI 앱 (상세: backend.md)
├── frontend/         # React 앱 (상세: front.md)
├── deploy/           # 배포 스크립트 · nginx/systemd 설정
│   ├── deploy.sh
│   ├── setup-postgres.sh
│   ├── nginx.iamnotafishmonger.conf
│   ├── instagram-backend.service
│   ├── README.md
│   └── POSTGRES_AND_S3.md
├── e2e/              # Playwright E2E 테스트
├── scripts/          # 로컬 원클릭 실행용 (setup.js, dev.js)
├── front.md / backend.md / db.md / guide.md   # 현황 문서 (이 파일들)
├── start.bat / start.ps1   # Windows용 원클릭 실행
└── package.json      # 루트: setup/dev/e2e 스크립트
```

---

## 3. 로컬 개발 환경 설정

### 3.1 사전 요구사항
- Node.js 18+ (권장 20+)
- Python 3.10+ (백엔드가 `X | None` 형태의 PEP 604 타입 힌트를 쓰기 때문에 3.9 이하에서는 동작하지 않음)

### 3.2 백엔드
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```
- `.env` 기본값은 SQLite(`sqlite:///./instagram.db`), `SEED_DEMO_USERS=true`.
- 앱이 시작될 때 자동으로 `alembic upgrade head`를 실행하므로 마이그레이션을 따로 돌릴 필요는 없다.
- `SEED_DEMO_USERS=true`이면 시작할 때마다 데모 계정(`admin`/`pass123`, `letsgomingu`/`12345`)이 자동으로 만들어지거나 복구된다. 더 풍부한 목데이터가 필요하면:
  ```bash
  python -m scripts.seed          # 비어있을 때만
  python -m scripts.seed --reset  # 초기화 후 재시드
  ```

### 3.3 프론트엔드
```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```
`vite.config.ts`가 `/api`, `/media`를 `http://127.0.0.1:8001`(백엔드)로 프록시하므로 CORS 설정 없이 바로 통신된다. 프로덕션 빌드는 `npm run build`(`tsc -b && vite build`, 결과물 `frontend/dist`).

### 3.4 원클릭 실행 (루트에서)
```bash
npm run setup   # node scripts/setup.js
npm run dev      # node scripts/dev.js — 백엔드+프론트를 함께 기동
```
Windows는 `start.bat`/`start.ps1`으로 동일하게 실행 가능.

---

## 4. 환경 변수

### 백엔드 (`backend/.env`)
| 변수 | 로컬 기본값 | 프로덕션 |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./instagram.db` | `postgresql+psycopg2://instagram:<pw>@localhost:5432/instagram` |
| `SECRET_KEY` | placeholder | `openssl rand -hex 32`로 배포 스크립트가 자동 생성 |
| `ALGORITHM` | `HS256` | 동일 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | 동일 |
| `MEDIA_ROOT` | `./media` | 동일(로컬 스토리지 사용 시) |
| `MAX_UPLOAD_SIZE_MB` | `10` | 동일 |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | `https://iamnotafishmonger.com,https://www.iamnotafishmonger.com` |
| `SEED_DEMO_USERS` | `true` | **`false`(필수)** — 켜두면 `admin/pass123`처럼 공개적으로 알려진 계정이 실서버에도 자동 생성됨 |
| `STORAGE_BACKEND` | `local` | `local`(기본) 또는 `s3`(선택, 아래 6장) |
| `AWS_REGION` / `AWS_S3_BUCKET` / `MEDIA_CDN_BASE_URL` | 비어있음 | S3 사용 시에만 설정 |

### 프론트엔드
로컬 개발(`frontend/.env.development`, 커밋됨): `VITE_API_BASE_URL=/api/v1`, `VITE_MEDIA_BASE_URL=/media` (Vite 프록시 경유).

**프로덕션은 이 두 변수를 설정하지 않는다.** 코드 기본값이 `window.location.origin` 기준 상대 경로라서, 값을 비워둬야 nginx 리버스 프록시를 통해 정상 동작한다. 과거 이 값이 `localhost`로 하드코딩되어 있어 실사용자 브라우저가 자기 자신에게 요청을 보내던 프로덕션 장애(회원가입 실패, 이미지 미표시)가 있었으므로, 프로덕션 빌드에 `VITE_*` 값을 넣지 않는 것 자체가 의도된 설정이다.

---

## 5. 테스트 계정

로컬 개발 전용(프로덕션은 `SEED_DEMO_USERS=false`로 비활성화):

| 계정 | 아이디 | 비밀번호 | 비고 |
|---|---|---|---|
| 일반 사용자 | `letsgomingu` (이메일 `letsgomingu@gmail.com`) | `12345` | 매 시작마다 자동 복구됨 |
| 관리자 | `admin` (이메일 `admin@instagram.local`) | `pass123` | `is_admin=true`, `/admin` 접근 가능 |

---

## 6. 프로덕션 배포 (실제 운영 절차)

도메인 `iamnotafishmonger.com` / `www.iamnotafishmonger.com`, AWS EC2(Amazon Linux 2023) 위에 배포되어 있다. 배포는 Docker나 Vercel이 아니라 **EC2에 직접 nginx + systemd + PostgreSQL을 설치**하는 방식이다.

### 6.1 최초 배포
```bash
# 서버에서
curl -fsSL https://raw.githubusercontent.com/letsgomingu-pixel/instagram-clone/main/deploy/deploy.sh -o deploy.sh
sudo bash deploy.sh
```
`deploy.sh`가 하는 일(재실행해도 안전하도록 설계됨):
1. OS 감지(Debian/Ubuntu vs Amazon Linux/RHEL) 후 nginx, Python, git, certbot 등 시스템 패키지 설치
2. Node.js 20+ 미설치 시 nodejs.org에서 직접 받아 설치(프론트 빌드용, 런타임에는 불필요)
3. Python 3.10+ 인터프리터 탐색(AL2023 기본 python3는 3.9라 부적합)
4. 저장소 클론 또는 `git pull --ff-only`
5. 백엔드 venv 생성 + `pip install -r requirements.txt`
6. `backend/.env`가 없으면 `.env.production.example`을 복사하고 `SECRET_KEY`를 자동 생성
7. 프론트엔드 `npm install && npm run build`
8. systemd 유닛(`instagram-backend.service`) 설치/재시작, nginx가 읽을 수 있도록 `frontend/dist` 권한 조정
9. **nginx 설정 — 덮어쓰기 방지 로직 포함**: 대상 파일에 이미 `ssl_certificate`가 있으면(=certbot이 이미 HTTPS를 구성했으면) 건드리지 않고, 없을 때만 HTTP 전용 템플릿을 덮어쓴다. *(예전 버전은 매번 무조건 덮어써서, 재배포할 때마다 certbot이 구성해둔 HTTPS가 조용히 사라지는 버그가 있었다 — 지금은 고쳐졌다.)*
10. 방화벽 설정(Debian: ufw, RHEL+firewalld: firewall-cmd, 그 외는 AWS 보안그룹에 위임)

### 6.2 HTTPS 설정 (최초 1회)
```bash
sudo certbot --nginx -d iamnotafishmonger.com -d www.iamnotafishmonger.com \
    --agree-tos -m YOUR_EMAIL@example.com --redirect
```
certbot이 nginx 설정 파일을 직접 수정해 443 서버 블록과 HTTP→HTTPS 리다이렉트를 추가한다. 자동 갱신 타이머는 certbot이 알아서 등록하며, `sudo certbot renew --dry-run`으로 확인 가능. AWS 보안 그룹에서 80/443 포트를 열어두는 것은 별도 확인 필요(ufw/firewalld와는 무관).

### 6.3 PostgreSQL 설정 (완료됨)
```bash
sudo git pull origin main
sudo bash deploy/setup-postgres.sh
```
`setup-postgres.sh`가 하는 일: PostgreSQL 설치(RHEL 계열은 15/16 패키지 순서로 시도), systemd 유닛이 없으면 직접 생성, `pg_hba.conf`의 로컬 접속 인증을 `ident`→`md5`로 수정(그대로면 비밀번호 인증이 실패함), 롤/DB(`instagram`/`instagram`)를 멱등하게 생성하고 `DATABASE_URL`을 1회 출력:
```
DATABASE_URL=postgresql+psycopg2://instagram:<생성된 비밀번호>@localhost:5432/instagram
```
이 값을 서버의 `backend/.env`에 붙여넣고:
```bash
cd /var/www/iamnotafishmonger/backend
venv/bin/pip install -r requirements.txt
venv/bin/python -m alembic upgrade head
sudo systemctl restart instagram-backend
```
기존 SQLite 데이터는 자동 이전되지 않는다(마이그레이션이 새 DB에 빈 테이블만 만듦) — 개인 프로젝트 규모라 회원가입을 다시 받는 쪽을 택함. SQLite보다 동시 쓰기에 강하므로, 이제 `instagram-backend.service`의 `--workers 1` 제한을 올릴 수 있다(선택 사항, 유닛 파일 수정 후 `daemon-reload` + 재시작).

### 6.4 S3 + CloudFront (선택, 미적용 상태)
코드(`STORAGE_BACKEND=s3`, `boto3`)는 준비되어 있으나 현재는 `local`(EC2 로컬 디스크) 그대로 사용 중이다. 필요해지면 `deploy/POSTGRES_AND_S3.md`의 Part 2를 따라 S3 버킷 + CloudFront 배포(OAC) + EC2 IAM 역할(액세스 키 없이 인스턴스 역할로 인증)을 만들고 `.env`에 `STORAGE_BACKEND=s3`, `AWS_S3_BUCKET`, `MEDIA_CDN_BASE_URL`을 채우면 된다. 프론트엔드는 API가 반환하는 URL을 그대로 렌더링하므로 수정 불필요.

### 6.5 재배포(코드 업데이트)
```bash
cd /var/www/iamnotafishmonger
sudo bash deploy/deploy.sh
```
`deploy.sh`가 내부적으로 `git pull --ff-only`부터 다시 수행하므로 이 한 줄이면 충분하다. DB나 업로드된 미디어는 절대 건드리지 않고, HTTPS 설정도 (6.1의 9번 항목 덕에) 안전하게 보존된다.

### 6.6 서버 구성 요약
| 항목 | 값 |
|---|---|
| 배포 경로 | `/var/www/iamnotafishmonger` |
| 백엔드 프로세스 | systemd `instagram-backend.service` → `uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1` (루프백만 리스닝, 외부에 직접 노출 안 됨) |
| 프론트엔드 서빙 | nginx가 `frontend/dist`를 정적 파일로 직접 서빙 (별도 Node 프로세스 없음) |
| nginx 라우팅 | `/` → 정적 파일(`try_files ... /index.html`, SPA fallback), `/media/`·`/api,/docs,/redoc,/openapi.json` → `127.0.0.1:8001`로 프록시 |
| 저장소 원격 | `https://github.com/letsgomingu-pixel/instagram-clone.git`, 브랜치 `main` |

---

## 7. 트러블슈팅

| 증상 | 확인할 것 |
|---|---|
| 브라우저에서 아예 접속 안 됨 | AWS 보안 그룹에 80/443이 열려 있는지, DNS가 이 서버를 가리키는지 |
| 502 Bad Gateway | `sudo systemctl status instagram-backend`, `sudo journalctl -u instagram-backend -f`. 백엔드는 멀쩡한데 502라면 SELinux일 가능성 — `sudo setsebool -P httpd_can_network_connect 1`(deploy.sh가 SELinux enforcing이면 자동 적용하지만, 수동 적용도 가능) |
| API는 되는데 화면이 이상함 | `frontend/dist`가 오래됐을 수 있음 — `cd frontend && npm run build` 재실행 |
| certbot 발급 실패 | 80번 포트가 외부에서 실제로 열려 있는지 먼저 확인(인증서 발급 자체가 HTTP-01 challenge로 80번을 씀) |
| 재배포 후 HTTPS가 풀림 | 이제 발생하지 않아야 함(6.1의 nginx 덮어쓰기 방지 로직) — 그래도 발생하면 `sudo certbot --nginx -d ... --redirect`로 즉시 복구 가능 |
| 로그인/회원가입은 되는데 이미지가 안 뜸 | 프론트 `VITE_API_BASE_URL`/`VITE_MEDIA_BASE_URL`이 프로덕션 빌드에 하드코딩되지 않았는지 확인(4장 참고) |

---

## 8. 참고 문서

- `front.md` — 프론트엔드 상세(라우팅, 컴포넌트, API 모듈, 타입, 디자인 시스템)
- `backend.md` — 백엔드 상세(전체 엔드포인트, 인증, 비즈니스 로직)
- `db.md` — DB 스키마 상세(전체 테이블, 마이그레이션 히스토리, 제약조건)
- `deploy/README.md` — 배포 가이드(한글, 이 문서 6장의 원본)
- `deploy/POSTGRES_AND_S3.md` — PostgreSQL/S3 전환 절차 상세
