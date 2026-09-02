# PostgreSQL + S3/CloudFront migration guide

Two independent upgrades, both opt-in — the site keeps working on SQLite +
local disk until you actually flip the settings below. Do them in either
order, or just one of them.

---

## Part 1 — SQLite → PostgreSQL

PostgreSQL runs on this same EC2 instance (free — no RDS cost). The app
already uses SQLAlchemy + Alembic migrations, so switching databases is
just a connection string change plus running the existing migrations
against the new database.

### 1. Run the setup script on the server

```bash
cd /var/www/iamnotafishmonger
sudo git pull origin main
sudo bash deploy/setup-postgres.sh
```

It installs PostgreSQL, starts it, fixes local password authentication
(a fresh install defaults to `ident` auth for TCP connections, which would
otherwise fail with "ident authentication failed"), and creates a
database + user. It prints a `DATABASE_URL` line — **copy it somewhere
safe, it's only shown once.**

### 2. Point the backend at it

```bash
cd /var/www/iamnotafishmonger/backend
sudo -u ec2-user nano .env
```

Replace the `DATABASE_URL=sqlite:///...` line with the one the script
printed (`DATABASE_URL=postgresql+psycopg2://instagram:...@localhost:5432/instagram`).

### 3. Install the new dependency, migrate, restart

```bash
sudo -u ec2-user venv/bin/pip install -r requirements.txt
sudo -u ec2-user venv/bin/python -m alembic upgrade head
sudo systemctl restart instagram-backend
sudo systemctl status instagram-backend
curl -I http://127.0.0.1/api/v1/health
```

`alembic upgrade head` runs every existing migration against the empty
Postgres database, creating all the tables. Any accounts/posts that only
exist in the old SQLite file are **not** carried over automatically —
this project is small enough that starting fresh (sign up again) is
usually simplest. If you need to keep that data, ask and we can write a
one-off script to copy the rows across, or use `pgloader`.

### 4. Optional: raise worker count

The backend was pinned to `--workers 1` specifically because SQLite
handles concurrent writers poorly. Postgres doesn't have that limit —
edit `/etc/systemd/system/instagram-backend.service`'s `ExecStart` line to
`--workers 2` (or more), then `sudo systemctl daemon-reload && sudo
systemctl restart instagram-backend`.

---

## Part 2 — Local disk → S3 + CloudFront

The upload code (`backend/app/utils/media.py`) now branches on
`STORAGE_BACKEND`: `local` (default, unchanged behavior) or `s3` (uploads
to S3, returns a CloudFront URL). The frontend already renders whatever
URL the API returns as-is, so no frontend changes are needed either way.

This part is AWS Console work — there's no script for it because it's a
one-time set of resources with choices only you can make (bucket name,
region, domain).

### 1. Create the S3 bucket

AWS Console → S3 → **Create bucket**.
- Name: something globally unique, e.g. `iamnotafishmonger-media`
- Region: `ap-northeast-2` (Seoul, same as the EC2 instance) unless you
  want it elsewhere
- Block Public Access: leave **all four boxes checked** (blocked) — the
  bucket stays private; CloudFront will be the only thing allowed to read
  it, via Origin Access Control in the next step. Don't make the bucket
  public.

### 2. Create a CloudFront distribution in front of it

AWS Console → CloudFront → **Create distribution**.
- Origin domain: pick the S3 bucket from the dropdown
- Origin access: choose **Origin access control settings (recommended)**
  → create a new OAC → CloudFront will show a bucket policy afterward;
  click **Copy policy** and paste it into the bucket's Permissions →
  Bucket policy tab (this is what lets CloudFront — and only CloudFront —
  read the private bucket)
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Leave the rest at defaults and create it

Creation takes 5–15 minutes to fully deploy. Once it's Enabled, copy its
domain name (looks like `d1a2b3c4d5e6f7.cloudfront.net`) — that's your
`MEDIA_CDN_BASE_URL` (as `https://d1a2b3c4d5e6f7.cloudfront.net`). A custom
subdomain (e.g. `media.iamnotafishmonger.com`) is optional — it needs an
ACM certificate and a DNS CNAME record if you want one; the plain
`.cloudfront.net` domain works fine without any of that.

### 3. Let the EC2 instance write to the bucket, without storing AWS keys anywhere

AWS Console → IAM → Roles → **Create role**.
- Trusted entity: AWS service → **EC2**
- Skip attaching a managed policy for now → name it (e.g.
  `iamnotafishmonger-ec2-s3`) → create it
- Open the new role → Add permissions → **Create inline policy** → JSON tab,
  paste (replace the bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::iamnotafishmonger-media/*"
    }
  ]
}
```

Then: EC2 Console → Instances → select this instance → **Actions → Security
→ Modify IAM role** → attach the role you just created.

This is the reason to use an IAM role instead of an access key/secret in
`.env`: `boto3` (already added to `requirements.txt`) automatically picks
up temporary credentials from the instance itself, so nothing
secret-looking needs to live in a config file at all.

### 4. Point the backend at it

```bash
cd /var/www/iamnotafishmonger/backend
sudo -u ec2-user nano .env
```

Set:
```
STORAGE_BACKEND=s3
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=iamnotafishmonger-media
MEDIA_CDN_BASE_URL=https://d1a2b3c4d5e6f7.cloudfront.net
```

```bash
sudo -u ec2-user venv/bin/pip install -r requirements.txt
sudo systemctl restart instagram-backend
```

Upload a new post/avatar/story afterward and confirm its image URL in the
browser now starts with your CloudFront domain instead of `/media/...`.
Anything uploaded *before* this switch is still served from local disk —
old and new can coexist, nothing breaks, but old files won't be
automatically copied to S3 (there's very little seed/demo content here
worth moving; ask if you want a copy script for real uploads later).

### Notes / later improvements

- Videos (Reels) upload as-is with no transcoding. For real scale, look at
  AWS MediaConvert for multiple resolutions, and generate a real preview
  frame with `ffmpeg` instead of the current gray placeholder thumbnail
  (`save_reel_placeholder_thumbnail` in `media.py`).
- Large uploads currently pass through the FastAPI server (browser → nginx
  → backend → S3). At real scale, switch to presigned S3 upload URLs so
  the browser uploads directly to S3 and the backend only issues/records
  the URL — meaningfully less load on the backend for big files.
