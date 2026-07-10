# AgentForge Deployment Guide (20-Minute Setup)

Since the project uses a multi-container Docker setup (Next.js, FastAPI, PostgreSQL, Redis), you have two ultra-fast paths to deploy it in 20 minutes:

---

## Option 1: Deploying to a VPS (DigitalOcean / Hetzner / AWS EC2) — Recommended
*Best choice because you already have a complete `docker-compose.yml` that configures and links all databases and apps automatically.*

### Step 1: Create a VM (3 minutes)
1. Sign up on **DigitalOcean**, **Hetzner**, or **Linode**.
2. Spin up a basic Linux server (Ubuntu 22.04 LTS or 24.04 LTS, 1GB RAM minimum, $4-$6/month).
3. Connect to it via SSH:
   ```bash
   ssh root@your_server_ip
   ```

### Step 2: Install Docker & Git (2 minutes)
Once inside the VPS terminal, run the official Docker installation script:
```bash
# Update packages
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Git
apt install git -y
```

### Step 3: Clone the Repository (2 minutes)
```bash
git clone https://github.com/kavin18022005/AgentForge-AI-Multi-Agent-Business-Automation-Platform.git
cd AgentForge-AI-Multi-Agent-Business-Automation-Platform
```

### Step 4: Configure Environment Variables (3 minutes)
1. Create a `.env` file in the project root:
   ```bash
   nano .env
   ```
2. Copy and paste the following environment settings (configure your API keys):
   ```env
   # Database Configuration
   POSTGRES_USER=agentforge
   POSTGRES_PASSWORD=generate_a_secure_password_here
   POSTGRES_DB=agentforge_db

   # JWT / Security
   SECRET_KEY=generate_a_random_32_character_string_here
   ALGORITHM=HS256

   # AI Keys
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here

   # URLs for production (pointing to your server IP or domain)
   NEXT_PUBLIC_API_URL=http://your_server_ip:8000
   NEXT_PUBLIC_WS_URL=ws://your_server_ip:8000
   ```
3. Press `CTRL+O` and then `Enter` to save, and `CTRL+X` to exit nano.

### Step 5: Start the App (5 minutes)
Run Docker Compose to build and start all containers in the background:
```bash
docker compose up -d --build
```
> **Tip**: This command will download PostgreSQL, Redis, build the Next.js frontend, build the FastAPI backend, and link them all. The frontend will be accessible at `http://your_server_ip:3000` and the API at `http://your_server_ip:8000`.

---

## Option 2: Deploying on Railway.app (Serverless PaaS)
*Best choice if you do not want to manage a Linux server or handle SSH.*

### Step 1: Sign up & Connect GitHub (2 minutes)
1. Go to [Railway.app](https://railway.app) and sign up with your GitHub account.

### Step 2: Create a PostgreSQL and Redis Database (3 minutes)
1. Click **New Project** -> **Provision PostgreSQL**.
2. Click **New** -> **Database** -> **Add Redis**.

### Step 3: Deploy the FastAPI Backend (5 minutes)
1. Click **New** -> **GitHub Repo** -> Select `AgentForge-AI-Multi-Agent-Business-Automation-Platform`.
2. Under Settings, set:
   - **Root Directory**: `backend`
3. Under Variables, add:
   - `DATABASE_URL`: `${{postgres.DATABASE_URL}}` (Railway will automatically fill this from the Postgres service)
   - `REDIS_URL`: `${{redis.REDIS_URL}}`
   - `SECRET_KEY`: *your-secret-key*
   - `GEMINI_API_KEY`: *your-gemini-key*
   - `ENVIRONMENT`: `production`

### Step 4: Deploy the Next.js Frontend (5 minutes)
1. Click **New** -> **GitHub Repo** -> Select `AgentForge-AI-Multi-Agent-Business-Automation-Platform`.
2. Under Settings, set:
   - **Root Directory**: `frontend`
3. Under Variables, add:
   - `NEXT_PUBLIC_API_URL`: Use the domain URL generated for the backend service (e.g. `https://backend-production.up.railway.app`).
   - `NEXT_PUBLIC_WS_URL`: Use the WebSocket protocol version of your backend URL (e.g. `wss://backend-production.up.railway.app`).
