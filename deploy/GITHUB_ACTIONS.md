# GitHub Actions 자동 배포 (PM2)

`main` 브랜치 push 시 EC2에서 `deploy.sh`를 실행합니다.

## GitHub Secrets (등록 완료)

| Secret | 설명 |
|--------|------|
| `server_host` | EC2 공인 IP 또는 호스트명 |
| `server_user` | SSH 사용자 (예: `ec2-user`) |
| `server_ssh_key` | SSH 개인키 전체 |

## 서버 요구 사항

- 경로: `/var/www/iamnotafishmonger`
- PM2로 앱 프로세스 관리 (`pm2 restart all`)
- `backend/venv` Python 가상환경 (없으면 `deploy.sh`가 생성)
- `pm2`, `git`, `python3`, `curl` 설치

## deploy.sh 동작

1. `git pull origin main` (실제: `fetch` + `reset --hard origin/main`)
2. `pip install -r backend/requirements.txt`
3. `alembic upgrade head`
4. `pm2 restart all`

## 첫 배포

저장소가 없으면 Actions가 자동으로 clone합니다.  
`deploy.sh`가 없으면 GitHub raw URL에서 내려받습니다.

## 수동 배포

```bash
cd /var/www/iamnotafishmonger
bash deploy.sh
```

## Actions에서 확인

- **Actions** 탭 → **Deploy to EC2** 워크플로
- 성공: `Deployment succeeded` 단계 통과
- 실패: `Deployment failed` + SSH 로그에 `[deploy] ERROR` 메시지
