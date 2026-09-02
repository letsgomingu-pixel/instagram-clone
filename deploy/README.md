# iamnotafishmonger.com 배포 가이드

이 폴더는 `instagram-clone` 프로젝트를 실제 서버(EC2로 추정, IP 52.78.54.32)에 배포하기 위한
설정 파일과 스크립트입니다. **서버에 접속해서** 아래 순서대로 실행하면 됩니다.

DNS는 이미 `iamnotafishmonger.com` → `52.78.54.32` 로 연결되어 있는 것을 확인했습니다.

---

## 0. 시작 전에 — 미리 알아둘 것

- **데모 계정 보안**: 원래 코드는 서버가 켜질 때마다 `admin/pass123`, `letsgomingu/12345` 계정을
  자동 생성/초기화합니다. 실제 도메인에 그대로 올리면 누구나 그 계정으로 로그인할 수 있어서
  위험합니다. `backend/app/config.py`에 `seed_demo_users` 옵션을 추가해서 프로덕션 환경변수
  파일(`.env.production.example`)에서는 기본값을 `false`로 꺼두도록 고쳤습니다. 이 저장소를
  그대로 clone/pull 하면 이 수정사항이 함께 적용됩니다.
- **데이터베이스**: SQLite 그대로 사용합니다 (별도 DB 서버 설치 불필요). 개인 프로젝트 규모에는
  충분하지만, 동시 접속자가 많아지면 PostgreSQL로 옮기는 걸 고려하세요.
- **AWS 보안 그룹**: 서버 방화벽(ufw)만 열어서는 부족합니다. AWS 콘솔 → EC2 → 보안 그룹에서
  인바운드 규칙에 **80번(HTTP), 443번(HTTPS)** 포트가 0.0.0.0/0으로 열려 있는지 꼭 확인하세요.
  이게 안 열려 있으면 스크립트가 다 성공해도 외부에서 사이트에 접속이 안 됩니다.
- **서버 환경**: Ubuntu/Debian(`apt-get`)과 Amazon Linux/RHEL 계열(`dnf`/`yum`)을 `deploy.sh`가
  자동으로 감지해서 알맞은 명령을 씁니다. 프롬프트가 `ec2-user@...`라면 Amazon Linux입니다.

---

## 1. 서버 접속

평소 쓰시는 방법(터미널의 `ssh`, PuTTY, 또는 AWS 콘솔의 EC2 Instance Connect)으로
서버에 접속하세요.

## 2. 이 배포 스크립트 받기

레포를 아직 서버에 내려받지 않았다면, 배포 스크립트만 먼저 받아서 실행하면
스크립트가 알아서 전체 레포를 clone합니다.

```bash
curl -fsSL https://raw.githubusercontent.com/letsgomingu-pixel/instagram-clone/main/deploy/deploy.sh -o deploy.sh
sudo bash deploy.sh
```

> 이 명령이 안 되면(예: 아직 GitHub에 push 전이라면), 레포를 먼저 서버로 클론한 뒤
> `deploy/deploy.sh`를 그 안에서 바로 실행하세요:
> ```bash
> git clone https://github.com/letsgomingu-pixel/instagram-clone.git /var/www/iamnotafishmonger
> cd /var/www/iamnotafishmonger
> sudo bash deploy/deploy.sh
> ```

## 3. 스크립트가 자동으로 하는 일

`deploy.sh` 한 번 실행으로 아래가 전부 처리됩니다.

1. 필요한 시스템 패키지 설치: nginx, python3, Node.js 20, certbot, git
2. `/var/www/iamnotafishmonger` 에 레포 clone (이미 있으면 `git pull`)
3. 백엔드: Python 가상환경 생성 + `requirements.txt` 설치
4. 백엔드: `.env` 파일 생성 (없을 때만) + `SECRET_KEY` 랜덤 생성
5. 프론트엔드: `npm install` + 프로덕션 빌드 (`npm run build` → `frontend/dist`)
6. 백엔드를 systemd 서비스(`instagram-backend`)로 등록해서 항상 켜져 있고, 서버 재부팅 시
   자동 시작되도록 설정 (127.0.0.1:8001 에서만 대기 — 외부에 직접 노출 안 됨)
7. nginx를 리버스 프록시로 설정: `/` 는 프론트엔드 정적 파일, `/api`·`/media`·`/docs` 는
   백엔드로 전달
8. 방화벽 설정: Ubuntu는 ufw에서 80/443 허용, Amazon Linux는 보통 로컬 방화벽이 아예 꺼져
   있으므로(정상) AWS 보안 그룹만 확인하면 됩니다

재실행해도 안전합니다 — DB나 업로드된 미디어 파일은 건드리지 않습니다. 코드를
수정하고 `git pull` 한 뒤 다시 `sudo bash deploy/deploy.sh` 하면 재빌드·재시작됩니다.

## 4. HTTPS(SSL) 적용

DNS가 이미 연결되어 있고 80번 포트가 외부에서 열려 있는 걸 확인했다면, 아래 명령
하나로 Let's Encrypt 무료 인증서를 발급받고 nginx 설정도 자동으로 https로 바꿔줍니다.

```bash
sudo certbot --nginx -d iamnotafishmonger.com -d www.iamnotafishmonger.com \
    --agree-tos -m 본인이메일@example.com --redirect
```

인증서는 90일마다 만료되는데, certbot이 설치할 때 자동 갱신 타이머도 같이 등록하므로
따로 신경 쓸 필요는 없습니다. 갱신이 잘 되는지 한 번 확인하고 싶다면:

```bash
sudo certbot renew --dry-run
```

## 5. 배포 확인

```bash
# 백엔드가 떠 있는지
sudo systemctl status instagram-backend
curl http://127.0.0.1:8001/api/v1/health

# nginx 설정이 유효한지
sudo nginx -t

# 실시간 로그
sudo journalctl -u instagram-backend -f
```

브라우저로 `https://iamnotafishmonger.com` 접속해서 로그인/피드/스토리 등이 잘
동작하는지 확인하세요. (데모 계정 시딩을 꺼뒀으므로, 실제 사용할 계정은
회원가입 페이지에서 새로 만들어야 합니다.)

## 6. 문제가 생기면

| 증상 | 확인할 것 |
|---|---|
| 브라우저에서 아예 접속 안 됨 | AWS 보안 그룹에 80/443 열려 있는지, DNS가 이 서버 IP를 가리키는지 |
| 502 Bad Gateway | `sudo systemctl status instagram-backend` 로 백엔드가 죽어있는지 확인, `journalctl -u instagram-backend` 로 에러 로그 확인. Amazon Linux/RHEL이고 백엔드는 멀쩡한데 계속 502라면 SELinux 때문일 수 있음 — `sudo setsebool -P httpd_can_network_connect 1` (deploy.sh가 SELinux enforcing이면 자동으로 적용하지만, 안 됐다면 수동 실행) |
| API 호출은 되는데 화면이 이상함 | `frontend/dist` 가 최신 빌드인지 (`npm run build` 다시) |
| certbot 발급 실패 | 80번 포트가 실제로 외부에서 열려 있는지 먼저 확인 (`curl http://iamnotafishmonger.com` 외부에서) |

## 7. 이 폴더의 파일들

- `deploy.sh` — 전체 배포 자동화 스크립트 (서버에서 `sudo bash deploy.sh` 로 실행)
- `nginx.iamnotafishmonger.conf` — nginx 리버스 프록시 설정 (deploy.sh가 자동 설치함)
- `instagram-backend.service` — 백엔드용 systemd 서비스 유닛 (deploy.sh가 자동 설치함)
- `../backend/.env.production.example` — 프로덕션용 환경변수 템플릿 (deploy.sh가 자동으로 `.env`로 복사)
