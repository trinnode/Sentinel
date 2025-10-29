# 🌐 Sentinel Live Deployment Guide

## Quick Deployment Options

### Option 1: DigitalOcean App Platform (Easiest - 10 minutes)

**Cost:** ~$12/month | **Domain:** Free `.ondigitalocean.app` subdomain

#### Steps:

1. **Create DigitalOcean Account** (if you don't have one)
   - Go to https://www.digitalocean.com
   - Sign up (you may get $200 free credits for 60 days)

2. **Deploy Using App Platform:**

```bash
# From your local machine
cd /home/trinnex/Developments/Hackathon/Products/NodeOps

# Create a DigitalOcean App Platform spec file
cat > .do/app.yaml << 'EOF'
name: sentinel-monitoring
services:
  - name: backend
    image:
      registry_type: DOCKER_HUB
      registry: trinnode
      repository: sentinel-backend
      tag: latest
    envs:
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
      - key: JWT_SECRET
        type: SECRET
        value: YOUR_JWT_SECRET_HERE
      - key: PORT
        value: "3001"
      - key: WS_PORT
        value: "3002"
      - key: NODE_ENV
        value: production
    http_port: 3001
    routes:
      - path: /api
    health_check:
      http_path: /health
    
  - name: dashboard
    image:
      registry_type: DOCKER_HUB
      registry: trinnode
      repository: sentinel-dashboard
      tag: latest
    http_port: 80
    routes:
      - path: /

databases:
  - name: db
    engine: PG
    version: "15"
EOF

# Push to GitHub (DigitalOcean will deploy from there)
git add .do/app.yaml
git commit -m "Add DigitalOcean deployment config"
git push origin main
```

3. **In DigitalOcean Dashboard:**
   - Go to Apps → Create App
   - Choose "GitHub" as source
   - Select your `Sentinel` repository
   - Click "Next" - it will auto-detect the app.yaml
   - Configure environment variables (JWT_SECRET)
   - Click "Create Resources"
   - Wait 5-10 minutes for deployment

4. **Get Your Live URL:**
   - After deployment, you'll get: `https://sentinel-monitoring-xxxxx.ondigitalocean.app`

---

### Option 2: Railway (Fastest - 5 minutes)

**Cost:** Free tier available | **Domain:** Free `.railway.app` subdomain

#### Steps:

1. **Go to https://railway.app**
2. **Sign in with GitHub**
3. **New Project → Deploy from Docker Hub**
4. **Add Services:**
   - PostgreSQL (from Railway templates)
   - Backend: `trinnode/sentinel-backend:latest`
   - Dashboard: `trinnode/sentinel-dashboard:latest`

5. **Configure Environment Variables for Backend:**
```
DATABASE_URL=${POSTGRESQL_URL}
JWT_SECRET=your-secret-here-32-characters-min
PORT=3001
WS_PORT=3002
NODE_ENV=production
```

6. **Generate Domain:**
   - Click on dashboard service → Settings → Generate Domain
   - You'll get: `https://sentinel-production-xxxx.up.railway.app`

---

### Option 3: AWS EC2 (Most Control - 30 minutes)

**Cost:** ~$5-10/month (t3.small) | **Domain:** Bring your own or use IP

#### Quick Deploy Script:

```bash
# 1. Launch EC2 instance (Ubuntu 22.04, t3.small, allow ports 80, 443, 22)

# 2. SSH into your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
exit

# 4. SSH again and deploy
ssh -i your-key.pem ubuntu@your-ec2-ip

# Create deployment directory
mkdir -p ~/sentinel
cd ~/sentinel

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: sentinel_db
      POSTGRES_USER: sentinel_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-sentinel_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sentinel_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: trinnode/sentinel-backend:latest
    environment:
      DATABASE_URL: postgresql://sentinel_user:${DB_PASSWORD:-sentinel_password}@postgres:5432/sentinel_db
      JWT_SECRET: ${JWT_SECRET}
      PORT: 3001
      WS_PORT: 3002
      NODE_ENV: production
    ports:
      - "3001:3001"
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy

  dashboard:
    image: trinnode/sentinel-dashboard:latest
    ports:
      - "80:80"
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - dashboard

volumes:
  postgres_data:
EOF

# Create environment file
cat > .env << 'EOF'
DB_PASSWORD=your-strong-db-password-here
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long
EOF

# Pull and start
docker compose pull
docker compose up -d

# Check status
docker compose ps
docker compose logs -f backend
```

5. **Access your deployment:**
   - HTTP: `http://your-ec2-ip` (dashboard)
   - API: `http://your-ec2-ip:3001`

6. **Add a domain (optional):**
   - Point your domain's A record to your EC2 IP
   - Set up SSL with Let's Encrypt (see below)

---

### Option 4: Render (Easy - 15 minutes)

**Cost:** Free tier available | **Domain:** Free `.onrender.com` subdomain

#### Steps:

1. **Go to https://render.com**
2. **Sign in with GitHub**
3. **Create PostgreSQL Database:**
   - New → PostgreSQL
   - Name: `sentinel-db`
   - Copy the Internal Database URL

4. **Create Backend Service:**
   - New → Web Service
   - Source: Docker Hub
   - Image URL: `trinnode/sentinel-backend:latest`
   - Environment Variables:
     ```
     DATABASE_URL=<paste-internal-db-url>
     JWT_SECRET=your-secret-here
     PORT=3001
     NODE_ENV=production
     ```
   - Health Check Path: `/health`

5. **Create Dashboard Service:**
   - New → Web Service
   - Source: Docker Hub
   - Image URL: `trinnode/sentinel-dashboard:latest`
   - Environment Variables:
     ```
     REACT_APP_API_URL=https://your-backend-url.onrender.com
     ```

6. **Get Your URLs:**
   - Backend: `https://sentinel-backend-xxxx.onrender.com`
   - Dashboard: `https://sentinel-dashboard-xxxx.onrender.com`

---

## 🔒 Adding SSL/HTTPS (For VPS Deployments)

If you deployed to a VPS with your own domain:

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
sudo certbot renew --dry-run
```

---

## 🌍 Custom Domain Setup

### For Railway/Render/DigitalOcean:

1. **In your DNS provider** (Cloudflare, Namecheap, etc.):
   - Add CNAME record: `sentinel` → `your-app.railway.app`
   - Or A record: `sentinel` → `your-vps-ip`

2. **In the platform dashboard:**
   - Add custom domain: `sentinel.yourdomain.com`
   - Platform will auto-provision SSL

---

## 📋 Environment Variables Checklist

Before deploying, make sure you have these set:

```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=minimum-32-characters-random-string

# Optional but recommended
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
WS_PORT=3002

# For dashboard (if separate deployment)
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_WS_URL=wss://your-backend-url.com
```

---

## 🧪 Test Your Deployment

After deployment, test these endpoints:

```bash
# Health check
curl https://your-domain.com/health

# Should return: {"status":"ok","database":"connected"}

# Dashboard
open https://your-domain.com

# API Documentation
curl https://your-domain.com/api/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
```

---

## 💰 Cost Comparison

| Platform | Monthly Cost | Free Tier | SSL | Custom Domain |
|----------|-------------|-----------|-----|---------------|
| **Railway** | Free - $5 | 500 hrs/month | ✅ | ✅ |
| **Render** | Free - $7 | 750 hrs/month | ✅ | ✅ |
| **DigitalOcean** | $12+ | $200 credit | ✅ | ✅ |
| **AWS EC2** | $5-10 | 12 months free | Manual | Manual |
| **Heroku** | $7+ | Limited | ✅ | ✅ |

---

## 🚀 Recommended for Demo/Hackathon

**Best Option: Railway** - Fast, free, automatic SSL, and simple

1. Go to https://railway.app
2. Deploy PostgreSQL + Backend + Dashboard
3. Share the `.railway.app` URL in your submission
4. Total time: 5-10 minutes

**For Production: DigitalOcean App Platform** - Reliable, scalable, professional

---

## 🆘 Troubleshooting

### Database Connection Errors
```bash
# Check if DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
docker exec -it sentinel-backend node -e "console.log(process.env.DATABASE_URL)"
```

### CORS Errors
```bash
# Make sure CORS_ORIGIN is set in backend
CORS_ORIGIN=https://your-dashboard-domain.com
```

### WebSocket Connection Failed
```bash
# For separate deployments, update dashboard env
REACT_APP_WS_URL=wss://your-backend-domain.com
```

---

## 📝 Update Your Submission

After deployment, update these files:

1. **QUICK_REFERENCE.md**
   ```markdown
   - **Live Demo:** `https://your-deployed-url.railway.app`
   ```

2. **README.md**
   ```markdown
   ## 🌐 Live Demo
   
   Try Sentinel live: https://your-deployed-url.railway.app
   
   Demo credentials:
   - Email: demo@sentinel.com
   - Password: password123
   ```

3. **In your BUIDL submission form:**
   - Live Demo URL: `https://your-deployed-url.railway.app`

---

## 🎬 Need Help?

If you run into issues:
1. Check platform logs (all platforms have log viewers)
2. Verify environment variables are set correctly
3. Test health endpoint: `/health`
4. Check database connection

Good luck with your deployment! 🚀
