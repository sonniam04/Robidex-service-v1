# Deploy Guide

## Directory structure on VPS

```
/opt/robidex/
├── frontend/    ← git clone Robidex-web-v1
└── backend/     ← git clone Robidex-service-v1  (run docker compose from here)
```

## Requirements
- VPS with Docker + Docker Compose v2
- Domain A records: `robidex.app` → server IP, `api.robidex.app` → server IP

---

## Step 1 — Clone repos

```bash
mkdir /opt/robidex && cd /opt/robidex
git clone https://github.com/sonniam04/Robidex-web-v1.git frontend
git clone https://github.com/sonniam04/Robidex-service-v1.git backend
cd backend
```

---

## Step 2 — Configure secrets

```bash
cp .env.prod.example .env.prod
nano .env.prod   # fill in all values

# Generate strong secrets:
openssl rand -base64 48   # → use as DB_PASSWORD
openssl rand -base64 48   # → use as JWT_SECRET
```

---

## Step 3 — SSL certificates

```bash
mkdir ssl

# Let's Encrypt (recommended)
certbot certonly --standalone -d robidex.app -d api.robidex.app
cp /etc/letsencrypt/live/robidex.app/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/robidex.app/privkey.pem   ssl/key.pem

# Self-signed (testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem
```

---

## Step 4 — Deploy

```bash
# Run from backend/ directory
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

DB schema applies automatically on first startup.

---

## Step 5 — Create admin account (one-time)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod \
  run --rm \
  -e ADMIN_EMAIL=your@email.com \
  -e ADMIN_PASSWORD=YourStrongPass123! \
  backend node dist/scripts/setup-admin.js
```

Password: 12+ chars, uppercase, lowercase, number.
Remove `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env.prod` after this step.

---

## Step 6 — Verify

```bash
curl https://robidex.app/sitemap.xml     # XML sitemap
curl https://api.robidex.app/games       # JSON array
```

---

## Update after code changes

```bash
cd /opt/robidex/backend && git pull
cd /opt/robidex/frontend && git pull
cd /opt/robidex/backend
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## Change admin password

```bash
docker compose -f docker-compose.prod.yml exec backend \
  sh -c "ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=NewPass123! node dist/scripts/setup-admin.js"
```

## Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```
