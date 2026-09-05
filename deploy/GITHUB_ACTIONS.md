# GitHub Actions 자동 배포 설정

`main` 브랜치에 push하면 EC2 서버에서 `deploy/redeploy.sh`가 실행됩니다.

## 사전 조건

1. 서버에 최초 1회 `sudo bash deploy/deploy.sh` 실행 완료
2. `/var/www/iamnotafishmonger` 경로에 clone 되어 있음
3. `backend/.env`에 PostgreSQL `DATABASE_URL` 등 프로덕션 값 설정됨

## GitHub Secrets 등록

Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | 예시 | 설명 |
|--------|------|------|
| `DEPLOY_HOST` | `52.78.54.32` 또는 `iamnotafishmonger.com` | EC2 공인 IP/호스트 |
| `DEPLOY_USER` | `ec2-user` | SSH 로그인 사용자 |
| `DEPLOY_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | 배포용 SSH 개인키 전체 |
| `DEPLOY_SSH_PORT` | `22` | (선택) SSH 포트 |

## EC2 측 설정

1. **보안 그룹**: GitHub Actions runner IP는 고정되지 않으므로, SSH(22)는 배포용 키를 아는 IP만 허용하거나, 임시로 `0.0.0.0/0`을 열고 키 기반 인증만 사용
2. **sudo 권限**: `DEPLOY_USER`가 비밀번호 없이 redeploy를 실행할 수 있어야 함:

```bash
# /etc/sudoers.d/instagram-deploy (visudo -f 로 편집)
ec2-user ALL=(ALL) NOPASSWD: /var/www/iamnotafishmonger/deploy/redeploy.sh
```

3. **GitHub deploy key** (선택): 서버가 private repo를 pull해야 하면 deploy key 등록

## 수동 배포 / 재실행

- GitHub → **Actions** → **Deploy to production** → **Run workflow**
- 또는 서버에서 직접:

```bash
cd /var/www/iamnotafishmonger
sudo bash deploy/redeploy.sh
```

## 워크플로 파일

- `.github/workflows/deploy.yml` — 프로덕션 SSH 배포
- `.github/workflows/ci.yml` — push/PR 시 백엔드 pytest
