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

## SSH 실패 (2~10초 만에 실패할 때)

Deploy 단계가 몇 초 만에 끝나면 **서버 스크립트까지 도달하지 못한 SSH 연결 문제**입니다.

1. **Secret 이름** — 반드시 `server_host`, `server_user`, `server_ssh_key` (대소문자 구분)
2. **server_ssh_key** — PEM 개인키 **전체**를 붙여넣기 (줄바꿈 포함)
   ```
   -----BEGIN OPENSSH PRIVATE KEY-----
   ...
   -----END OPENSSH PRIVATE KEY-----
   ```
3. **server_user** — Amazon Linux면 `ec2-user`, Ubuntu면 `ubuntu`
4. **server_host** — EC2 **공인 IP** 또는 도메인 (사설 IP 아님)
5. **EC2 보안 그룹** — 인바운드 TCP **22** 허용 (GitHub Actions IP는 고정이 아니므로 `0.0.0.0/0` 또는 넓은 범위 필요)
6. **authorized_keys** — 위 개인키에 대응하는 **공개키**가 서버 `~/.ssh/authorized_keys`에 등록되어 있어야 함

로컬에서 먼저 확인:

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP "echo ok"
```

위 명령이 성공해야 GitHub Actions도 연결됩니다.
