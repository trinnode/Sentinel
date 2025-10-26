# 🚀 Sentinel - Enterprise Blockchain Validator Monitoring System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)

**Sentinel** is a sophisticated, enterprise-grade decentralized monitoring system designed specifically for blockchain validators. It moves beyond simple reactive alerts by implementing a peer-to-peer consensus mechanism to eliminate false positives and ensure reliable failure detection.

## 🌟 Key Features

### **Multi-Agent Consensus**
- **Decentralized Architecture**: Multiple agents achieve consensus before triggering alerts
- **Configurable Thresholds**: Adjustable consensus requirements for different environments
- **False Positive Elimination**: P2P communication prevents localized network issues from causing alerts

### **Real-time Monitoring**
- **Live Dashboard**: Real-time status updates via WebSocket connections
- **Instant Alerts**: Immediate notification when consensus is reached on validator failures
- **Historical Analysis**: Comprehensive logging and trend analysis

### **Enterprise Integration**
- **Webhook Support**: HTTP/HTTPS webhook notifications with signature verification
- **RESTful API**: Complete API for integration with existing monitoring systems
- **Professional CLI**: Command-line interface for agent management and diagnostics

### **Production Ready**
- **Docker Deployment**: Complete containerization with health checks
- **Security First**: JWT authentication, input validation, and secure defaults
- **Scalable Architecture**: Microservices design for horizontal scaling

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────┐
│          Validator's Infrastructure             │
│  +------------------+   +-------------------+   │
│  | Ethereum Beacon  |   | Validator Client  |   │
│  +------------------+   +-------------------+   │
+-----------^-----------------------^-----------+
            | Health Checks (RPC/REST) |
+-----------v-----------------------v-----------+
│          Off-Chain Sentinel Agents            │
│                (TypeScript/Node.js)           │
│───────────────────────────────────────────────│
│ - High-Frequency Health Monitoring            │
│ - P2P Consensus Protocol (via WebSockets)     │
│ - Securely reports status to Sentinel API     │
+-----------^-----------------------^-----------+
            | Status Updates (REST) | P2P Network
+-----------v-----------------------v-----------+
│        Sentinel Backend API (Express.js)        │
│───────────────────────────────────────────────│
│ - User Authentication & Validator Management  │
│ - WebSocket server for real-time updates      │
│ - Rule Engine & Webhook Dispatcher            │
+-----------^-------------------------------------+
            | Real-time Data (WebSockets) & API Calls
+-----------v-------------------------------------+
│         Dashboard Frontend (React App)          │
│───────────────────────────────────────────────│
│ - Manages validator configurations            │
│ - Displays real-time status from API          │
+───────────────────────────────────────────────+
```

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended)
- **Node.js 18+** (for development)
- **PostgreSQL 15+** (if running without Docker)

### One-Command Deployment

```bash
# Clone the repository
git clone <repository-url>
cd sentinel

# Deploy with Docker (recommended)
./deploy.sh deploy

# Or deploy manually
./deploy.sh build
./deploy.sh start
```

### Access the System

After deployment, access the following services:

- **Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3002
- **Database**: postgresql://localhost:5432/sentinel_db

### Demo Credentials

```
Email: demo@sentinel.com
Password: password
```

## 📦 Installation Options

### Option 1: Docker Compose (Recommended for Production)

```bash
# Full deployment
./deploy.sh deploy

# Check status
./deploy.sh status

# View logs
./deploy.sh logs
```

### Option 2: Native Node.js Deployment (Development/Testing)

For environments without Docker or when you prefer native Node.js execution:

```bash
# Prerequisites:
# - Node.js 18+
# - PostgreSQL 15+
# - Python 3 (for dashboard HTTP server)

# Full deployment
./deploy.sh deploy

# Check status
./deploy.sh status

# View logs
tail -f /tmp/sentinel-backend.log
tail -f /tmp/sentinel-dashboard.log
```

The script automatically detects if Docker is available and switches to native deployment if needed.

### Option 3: Manual Installation (Full Control)

#### Backend Setup

```bash
cd packages/sentinel-backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create PostgreSQL database and user
sudo -u postgres psql -c "CREATE DATABASE sentinel_db;"
sudo -u postgres psql -c "CREATE USER sentinel_user WITH PASSWORD 'sentinel_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sentinel_db TO sentinel_user;"
sudo -u postgres psql -d sentinel_db -c "GRANT ALL ON SCHEMA public TO sentinel_user;"

# Push schema to database
npx prisma db push

# Load initial data (optional)
cat init.sql | sudo -u postgres psql -d sentinel_db

# Build and start backend
npm run build
node dist/index.js
```

#### Dashboard Setup

```bash
cd packages/sentinel-dashboard

# Install dependencies
npm install

# Build for production
npm run build

# Serve the build (choose one)
# Option 1: Using Python HTTP server
cd build
python3 -m http.server 3000

# Option 2: Install and use 'serve'
npm install -g serve
serve -s build -l 3000
```

#### Agent Setup

```bash
cd packages/sentinel-agent

# Install dependencies
npm install

# Build
npm run build

# Create configuration file
cat > agent-config.json << 'EOF'
{
  "agentId": "demo-agent-1",
  "apiKey": "demo_api_key_1",
  "backendUrl": "http://localhost:3001",
  "beaconNodeUrl": "http://localhost:5052",
  "p2p": {
    "enabled": true,
    "port": 3003
  },
  "healthCheck": {
    "interval": 30000,
    "timeout": 10000
  },
  "consensus": {
    "threshold": 2,
    "timeout": 120000
  }
}
EOF

# Start agent
AGENT_ID=demo-agent-1 AGENT_API_KEY=demo_api_key_1 node dist/cli.js start --config agent-config.json
```

## 🔧 Configuration

### Environment Variables

#### Backend Configuration
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sentinel_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"

# WebSocket
WS_PORT=3002

# Agent Configuration
AGENT_HEALTH_CHECK_INTERVAL=30000
AGENT_CONSENSUS_THRESHOLD=2
```

#### Agent Configuration
```bash
# Agent Identity
AGENT_ID="your-agent-id"
AGENT_API_KEY="your-agent-api-key"

# Backend Connection
BACKEND_API_URL="http://localhost:3001"

# Beacon Node
BEACON_NODE_URL="http://localhost:5052"

# Monitoring
HEALTH_CHECK_INTERVAL=30000
CONSENSUS_THRESHOLD=2
```

### Agent Configuration File Format

Create a JSON configuration file for the agent (e.g., `agent-config.json`):

```json
{
  "agentId": "agent-1",
  "apiKey": "your-agent-api-key",
  "backendUrl": "http://localhost:3001",
  "beaconNodeUrl": "http://localhost:5052",
  "p2p": {
    "enabled": true,
    "port": 3003,
    "discoveryInterval": 60000,
    "maxPeers": 10
  },
  "healthCheck": {
    "interval": 30000,
    "timeout": 10000,
    "retries": 3
  },
  "consensus": {
    "threshold": 2,
    "timeout": 120000
  }
}
```

**Configuration Parameters:**

- `agentId` - Unique identifier for this agent
- `apiKey` - API key for backend authentication (must be registered with backend)
- `backendUrl` - URL of the Sentinel backend API
- `beaconNodeUrl` - URL of the Ethereum beacon node to monitor
- `p2p.enabled` - Enable P2P consensus (default: true)
- `p2p.port` - Port for P2P communication (default: 3003)
- `p2p.discoveryInterval` - Interval for discovering other agents (ms)
- `p2p.maxPeers` - Maximum number of peer connections
- `healthCheck.interval` - How often to check validator health (ms)
- `healthCheck.timeout` - Timeout for health check requests (ms)
- `healthCheck.retries` - Number of retries for failed checks
- `consensus.threshold` - Number of agents required to confirm failure
- `consensus.timeout` - Timeout for consensus decision (ms)

## 🎯 Usage Examples

### Starting the Agent

```bash
# Start agent with default configuration
cd packages/sentinel-agent
npm start

# Or use the CLI
npm run cli start

# Check agent status
npm run cli status

# Perform manual health check
npm run cli health-check
```

### Managing Validators via API

```bash
# Create a validator
curl -X POST http://localhost:3001/api/validators \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Validator",
    "beaconNodeUrl": "http://localhost:5052"
  }'

# Get validator API key
curl http://localhost:3001/api/validators/VALIDATOR_ID/agent-key \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Webhook Configuration

```bash
# Create webhook
curl -X POST http://localhost:3001/api/webhooks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/...",
    "events": ["validator.unhealthy", "alert.created"]
  }'
```

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Password Hashing** using bcrypt with salt rounds
- **CORS Protection** with configurable origins
- **Input Validation** using Zod schemas
- **Rate Limiting** ready for Redis integration
- **HTTPS Support** with SSL/TLS encryption

## 📊 Monitoring & Analytics

### Real-time Metrics

- **Validator Health Status** - Live monitoring of all validators
- **Agent Connectivity** - Track agent network health
- **Alert Statistics** - Pending vs resolved alert counts
- **Response Times** - Performance monitoring and optimization

### Historical Data

- **Alert History** - Complete audit trail of all alerts
- **Performance Trends** - Response time and uptime analytics
- **Agent Reports** - Historical health check data
- **System Events** - Webhook delivery logs

## 🚨 Alert Management

### Alert Types

1. **Validator Unhealthy** - When consensus is reached on validator failure
2. **Agent Disconnected** - When monitoring agents lose connectivity
3. **System Events** - Custom alerts for specific conditions

### Notification Channels

- **Web Dashboard** - Real-time browser notifications
- **Webhook HTTP** - Custom endpoint notifications
- **Email** - SMTP email notifications (extensible)
- **SMS** - SMS notifications (extensible)

## 🔧 Development

### Project Structure

```
sentinel/
├── packages/
│   ├── sentinel-backend/     # Express.js API server
│   ├── sentinel-agent/       # Monitoring agent
│   └── sentinel-dashboard/   # React dashboard
├── deploy.sh                 # Deployment script
├── docker-compose.yml        # Container orchestration
└── README.md                 # This file
```

### Development Commands

```bash
# Install all dependencies
npm run install:all

# Build all packages
npm run build:all

# Start all services (development)
npm run dev:backend
npm run dev:dashboard

# Run tests
npm run test:all

# Lint code
npm run lint:all
```

### Code Quality

- **TypeScript** - Full type safety across all components
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting consistency
- **Jest** - Unit testing framework
- **Husky** - Git hooks for quality enforcement

## 📚 API Documentation

### Authentication Endpoints

```typescript
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### Validator Management

```typescript
GET    /api/validators           # List validators
POST   /api/validators           # Create validator
GET    /api/validators/:id       # Get validator
PUT    /api/validators/:id       # Update validator
DELETE /api/validators/:id       # Delete validator
GET    /api/validators/:id/agent-key    # Get API key
POST   /api/validators/:id/regenerate-key # Regenerate API key
```

### Agent Management

```typescript
GET    /api/agents               # List agents
POST   /api/agents               # Create agent
GET    /api/agents/:id           # Get agent
PUT    /api/agents/:id           # Update agent
DELETE /api/agents/:id           # Delete agent
GET    /api/agents/:id/reports   # Get agent reports
```

### Webhook Management

```typescript
GET    /api/webhooks             # List webhooks
POST   /api/webhooks             # Create webhook
GET    /api/webhooks/:id         # Get webhook
PUT    /api/webhooks/:id         # Update webhook
DELETE /api/webhooks/:id         # Delete webhook
POST   /api/webhooks/:id/test    # Test webhook
GET    /api/webhooks/events/list # Available events
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues

**Docker Deployment:**
```bash
# Check database status
./deploy.sh status

# View database logs
./deploy.sh logs postgres

# Reset database
./deploy.sh stop
docker volume rm sentinel_postgres_data
./deploy.sh start
```

**Native Deployment:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Connect to database
psql -U sentinel_user -d sentinel_db -h localhost

# Verify user exists
sudo -u postgres psql -tc "SELECT * FROM pg_user WHERE usename = 'sentinel_user';"

# Check database
sudo -u postgres psql -tc "SELECT datname FROM pg_database WHERE datname = 'sentinel_db';"
```

#### Backend Not Starting (Native)

```bash
# Check if port 3001 is already in use
lsof -i :3001

# Check backend logs
tail -f /tmp/sentinel-backend.log

# Verify database connection
cd packages/sentinel-backend
npx prisma db execute --stdin < /dev/null

# Verify JWT_SECRET is set
echo $JWT_SECRET
```

#### Agent Connection Issues

```bash
# Check agent configuration
cd packages/sentinel-agent
npm run cli validate

# Test backend connection
npm run cli test-connection

# Check agent logs
tail -f /tmp/agent.log
```

#### Dashboard Issues

**Native Deployment:**
```bash
# Check if dashboard server is running
curl http://localhost:3000

# Check Python HTTP server
lsof -i :3000

# Stop and restart manually
pkill -f "python3 -m http.server 3000"
cd packages/sentinel-dashboard/build
python3 -m http.server 3000
```

**Docker Deployment:**
```bash
# Check if dashboard container is running
./deploy.sh status

# View dashboard logs
./deploy.sh logs dashboard

# Rebuild dashboard
cd packages/sentinel-dashboard
npm run build
./deploy.sh restart
```

#### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000  # Dashboard
lsof -i :3001  # Backend API
lsof -i :3002  # WebSocket
lsof -i :3003  # Agent P2P
lsof -i :5432  # PostgreSQL

# Kill the process (if needed)
kill -9 <PID>
```

#### Authentication Token Issues

```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "name": "Test User"
  }'

# Login and get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'

# Use token to access protected endpoints
curl http://localhost:3001/api/validators \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### WebSocket Connection Issues

```bash
# Test WebSocket connection from terminal
websocat ws://localhost:3002

# Check WebSocket server logs in backend log
tail -f /tmp/sentinel-backend.log | grep WebSocket

# Verify WebSocket port configuration
echo $WS_PORT  # Should be 3002
```

### Deployment-Specific Troubleshooting

#### Docker Deployment Issues

```bash
# Check Docker daemon
docker ps

# View all containers
docker ps -a

# Check Docker Compose logs
docker compose -f packages/sentinel-backend/docker-compose.yml logs

# Rebuild containers
docker compose -f packages/sentinel-backend/docker-compose.yml up --build -d

# Clean up dangling resources
docker system prune
```

#### Native Deployment Issues

```bash
# Check all running services
ps aux | grep node

# Check system resources
free -h
df -h

# View system logs
journalctl -xe

# Restart all services
./deploy.sh stop
sleep 2
./deploy.sh start
```

### Performance Optimization

```bash
# Monitor backend performance
curl http://localhost:3001/health | jq .

# Check database query performance
sudo -u postgres psql -d sentinel_db -c "SELECT * FROM pg_stat_statements;"

# Monitor system resources
top -p $(pgrep -f "node dist/index.js")

# Check WebSocket connections
netstat -an | grep 3002
```

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Code Standards

- **TypeScript** - All code must be typed
- **ESLint** - Follow linting rules
- **Tests** - Add tests for new features
- **Documentation** - Update docs for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ethereum Foundation** - For the beacon chain specification
- **Prisma** - For the excellent ORM
- **React Team** - For the amazing framework
- **Node.js Community** - For the ecosystem tools

---

## 🎯 Support

For support, please:

1. Check the [troubleshooting](#-troubleshooting) section
2. Review the [API documentation](#-api-documentation)
3. Open an issue on GitHub
4. Contact the development team

---

