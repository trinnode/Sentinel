# Sentinel: Decentralized Validator Monitoring & Failover System

## 🎯 Executive Summary

Sentinel represents a paradigm shift in blockchain validator monitoring. Unlike traditional reactive monitoring tools that alert you *after* your validator goes offline, Sentinel uses a decentralized network of intelligent agents that achieve consensus before triggering alerts, eliminating false positives and enabling proactive intervention that can prevent costly slashing events.

**The Problem We Solve:**

For blockchain validators, downtime equals financial loss. Slashing penalties on networks like Ethereum can cost validators significant stakes. Existing monitoring solutions are inherently reactive—by the time you receive an alert, your validator may have already been offline long enough to incur penalties. Even worse, false positives from network glitches or localized issues create alert fatigue, causing operators to miss genuine emergencies.

**Our Solution:**

Sentinel deploys lightweight monitoring agents across distributed locations. When one agent detects a potential issue, it doesn't immediately trigger an alert. Instead, it initiates a consensus protocol with peer agents. Only when multiple independent agents confirm the failure does Sentinel take action—sending alerts and triggering automated failover webhooks. This consensus-based approach ensures that:

- **False positives are eliminated** - Network glitches affecting one location won't trigger alerts
- **Response is faster** - Distributed agents detect issues before centralized monitors can
- **Actions are trustworthy** - Automated failover only happens when multiple agents agree
- **Coverage is comprehensive** - Multiple vantage points detect issues single monitors miss

## 🌟 Key Features & Benefits

### 1. **Multi-Agent Consensus Protocol**

Rather than relying on a single point of observation, Sentinel uses multiple independent agents that communicate peer-to-peer to reach consensus on validator health.

**Technical Implementation:**
- WebSocket-based P2P network connecting all agents monitoring a validator
- Configurable consensus threshold (e.g., 2 out of 3 agents must agree)
- Timeout mechanisms prevent indefinite waiting
- Cryptographic signatures ensure message authenticity

**Real-World Value:**
- **Zero false positives** from localized network issues
- **Improved reliability** through distributed observation
- **Geographic diversity** - Deploy agents across different regions
- **Cost savings** - Avoid unnecessary failover actions

### 2. **Real-Time Dashboard with Live Updates**

A professional React-based dashboard provides complete visibility and control over your validator infrastructure.

**Features:**
- **Live Status Monitoring** - WebSocket connections provide instant updates
- **Validator Management** - Add, configure, and monitor multiple validators
- **Alert History** - Complete audit trail of all detection events
- **Agent Health Tracking** - Monitor the monitors themselves
- **Webhook Configuration** - Set up automated responses to failures

**User Experience:**
- Clean, intuitive interface built with React and Tailwind CSS
- Real-time notifications appear instantly without page refresh
- Mobile-responsive design works on phones and tablets
- Professional data visualization for trends and analytics

### 3. **Intelligent Webhook System**

When consensus is reached on a validator failure, Sentinel can trigger automated actions through webhooks.

**Supported Actions:**
- **Failover Automation** - Call cloud APIs to spin up backup validators
- **Team Notifications** - Send alerts to Slack, Discord, PagerDuty
- **Custom Integrations** - Any HTTP/HTTPS endpoint can receive notifications
- **Conditional Logic** - Configure different actions for different failure types

**Enterprise Integration:**
- HMAC signature verification for webhook security
- Retry logic with exponential backoff
- Delivery confirmation and logging
- Test mode for validating webhook configurations

### 4. **Lightweight TypeScript Agent**

The sentinel agent is a small, efficient Node.js application that runs alongside your validator infrastructure.

**Characteristics:**
- **Minimal Resource Usage** - Low CPU and memory footprint
- **Easy Deployment** - Single command with configuration file
- **Flexible Monitoring** - Supports any HTTP/REST beacon node API
- **Secure Authentication** - API key-based authentication with backend
- **Self-Healing** - Automatic reconnection and health recovery

**Deployment Options:**
- Run as a systemd service on Linux
- Deploy as a Docker container
- Execute directly with npm/node
- Kubernetes deployment with Helm charts (extensible)

### 5. **Production-Ready Architecture**

Sentinel is built with enterprise-grade technologies and follows industry best practices.

**Backend (Express.js + PostgreSQL + Prisma):**
- RESTful API with comprehensive validation
- JWT-based authentication with bcrypt password hashing
- WebSocket server for real-time client updates
- Structured logging with configurable levels
- Health check endpoints for monitoring

**Frontend (React + React Query + Zustand):**
- Modern React with hooks and functional components
- Efficient data fetching with automatic caching
- Global state management with Zustand
- Responsive design with Tailwind CSS
- TypeScript for type safety

**Infrastructure:**
- Docker Compose orchestration for easy deployment
- Nginx reverse proxy for production serving
- PostgreSQL with connection pooling
- Environment-based configuration
- Health checks and restart policies

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Validator Infrastructure                     │
│  ┌────────────────────┐         ┌──────────────────┐       │
│  │  Beacon Node (CL)  │         │ Validator Client │       │
│  │   Port: 5052       │         │   Port: 5062     │       │
│  └─────────┬──────────┘         └──────────────────┘       │
└────────────┼─────────────────────────────────────────────────┘
             │ HTTP Health Checks (/eth/v1/node/health)
             │
┌────────────┼──────────────────────────────────────────────────┐
│            │         Sentinel Agent Network                    │
│            │                                                    │
│  ┌─────────▼─────────┐  P2P Consensus  ┌──────────────────┐  │
│  │   Agent 1         │◄────────────────►│    Agent 2       │  │
│  │  Location: US-E   │    (WebSocket)   │  Location: EU-W  │  │
│  │  Port: 3003       │                  │  Port: 3003      │  │
│  └─────────┬─────────┘                  └────────┬─────────┘  │
│            │                                      │            │
│            │  P2P Consensus                      │            │
│            │  (WebSocket)                        │            │
│            │                                      │            │
│  ┌─────────▼──────────┐                          │            │
│  │   Agent 3          │◄─────────────────────────┘            │
│  │  Location: AS-SE   │                                       │
│  │  Port: 3003        │                                       │
│  └─────────┬──────────┘                                       │
└────────────┼────────────────────────────────────────────────────┘
             │ Authenticated Reports (REST API)
             │
┌────────────▼────────────────────────────────────────────────────┐
│              Sentinel Backend (Express.js + PostgreSQL)          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  REST API (Port 3001)                                     │  │
│  │  • User Authentication (JWT)                              │  │
│  │  • Validator CRUD                                         │  │
│  │  • Agent Registration & Reports                           │  │
│  │  • Webhook Configuration                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  WebSocket Server (Port 3002)                             │  │
│  │  • Real-time Dashboard Updates                            │  │
│  │  • Live Alert Notifications                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Alert Engine & Webhook Dispatcher                        │  │
│  │  • Consensus Validation                                   │  │
│  │  • Alert Creation                                         │  │
│  │  • Webhook Triggering                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Database                                      │  │
│  │  • Users, Validators, Agents                              │  │
│  │  • Agent Reports, Alerts                                  │  │
│  │  • Webhook Configurations                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────────────────────────────┘
             │ WebSocket (Real-time) + REST API
             │
┌────────────▼────────────────────────────────────────────────────┐
│              Sentinel Dashboard (React SPA)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • Validator Management UI                                │  │
│  │  • Real-time Status Dashboard                             │  │
│  │  • Alert History & Analytics                              │  │
│  │  • Webhook Configuration                                  │  │
│  │  • Agent Health Monitoring                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│             Accessible at http://localhost:3000                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Normal Operation (Healthy Validator):**

1. **Agents perform health checks** - Every 30 seconds (configurable), each agent calls the beacon node's health endpoint
2. **Results are logged** - Health check results stored locally and periodically reported to backend
3. **Dashboard shows green status** - WebSocket pushes live updates to connected dashboards
4. **No alerts triggered** - System remains in healthy state

**Failure Detection Flow:**

1. **Agent detects failure** - Agent 1 in US-East cannot reach beacon node (HTTP timeout or error response)
2. **Consensus request initiated** - Agent 1 broadcasts "HEALTH_CHECK_REQUEST" to P2P network
3. **Peers verify independently** - Agent 2 (EU-West) and Agent 3 (Asia-Southeast) perform their own health checks
4. **Consensus reached** - If threshold met (e.g., 2 out of 3 agents confirm failure), consensus achieved
5. **Backend notification** - Lead agent sends authenticated POST request to `/api/agents/:id/report` with consensus data
6. **Alert created** - Backend validates signatures, creates Alert record in database
7. **Webhook triggered** - If configured, backend calls webhook URL with alert details
8. **Dashboard updated** - WebSocket broadcasts alert to all connected clients
9. **Real-time notification** - Users see toast notification and updated validator status instantly

### Data Flow & Security

**Authentication & Authorization:**
- Users authenticate via `/api/auth/login`, receive JWT token valid for 7 days
- All protected API routes verify JWT via middleware
- Agents authenticate using API keys (one per validator)
- Webhook deliveries include HMAC signatures for verification

**Real-time Updates:**
- Dashboard establishes WebSocket connection on login
- Backend publishes events on: alert creation, validator status change, agent updates
- Automatic reconnection with exponential backoff
- React Query cache invalidation triggers UI updates

**Data Persistence:**
- Prisma ORM provides type-safe database access
- PostgreSQL ensures ACID compliance
- Agent reports stored with timestamps for historical analysis
- Alert history maintained for audit trail

## 💼 Use Cases & Target Users

### 1. **Solo Validator Operators**

**Scenario:** You run a home staking setup with a single validator on your own hardware.

**How Sentinel Helps:**
- Deploy 2-3 lightweight agents in different cloud regions (AWS, DigitalOcean, Hetzner)
- Agents monitor your home validator from multiple geographic locations
- If your home internet goes down, consensus ensures you're notified immediately
- Configure webhook to send SMS via Twilio or push notification via Pushover
- Sleep peacefully knowing distributed monitoring has your back

**Value Proposition:**
- **$10-30/month in cloud costs** for comprehensive monitoring
- **Avoid slashing penalties** worth hundreds or thousands of dollars
- **Peace of mind** with reliable, false-positive-free alerts

### 2. **Professional Staking Services**

**Scenario:** You manage validators for clients and need enterprise-grade monitoring.

**How Sentinel Helps:**
- Monitor hundreds of validators from a single dashboard
- Deploy agent clusters with high consensus thresholds (e.g., 3 of 5)
- Integrate with existing ops tools via webhooks (PagerDuty, OpsGenie)
- Provide clients with read-only dashboard access to their validators
- Historical reporting for SLA compliance

**Value Proposition:**
- **Reduce operational overhead** with automated monitoring
- **Improve SLA uptime** with faster failure detection
- **Client confidence** through transparent, real-time reporting
- **Competitive advantage** with superior monitoring infrastructure

### 3. **Validator Pools & DAOs**

**Scenario:** A decentralized organization runs validator infrastructure collectively.

**How Sentinel Helps:**
- Multiple team members can access the same dashboard
- Distributed agents match your decentralized ethos
- Webhook integration with DAO multisig for automated decisions
- Transparent alert history for governance accountability

**Value Proposition:**
- **Align monitoring with values** - Decentralized, trustless failure detection
- **Shared visibility** - All stakeholders see the same real-time data
- **On-chain integration** - Webhooks can trigger smart contract calls

### 4. **Infrastructure Providers & DevOps Teams**

**Scenario:** You manage blockchain infrastructure as part of a larger cloud service.

**How Sentinel Helps:**
- RESTful API enables integration with existing monitoring stacks
- Webhook system connects to incident management workflows
- Agent deployment via Kubernetes for auto-scaling
- Metrics and logs compatible with Prometheus/Grafana

**Value Proposition:**
- **Seamless integration** with existing tools
- **Scalable architecture** grows with your infrastructure
- **Professional-grade** - Built for production from day one

## 🚀 Quick Start Guide

### Prerequisites

Before you begin, ensure you have:

- **Docker & Docker Compose** installed (recommended for easiest setup)
  - [Install Docker](https://docs.docker.com/get-docker/)
  - [Install Docker Compose](https://docs.docker.com/compose/install/)
- **Node.js 18 or higher** (if not using Docker)
  - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 15+** (if not using Docker)
  - [PostgreSQL Downloads](https://www.postgresql.org/download/)
- **Git** for cloning the repository

### One-Command Deployment (Recommended)

The fastest way to get Sentinel running:

```bash
# Clone the repository
git clone <your-repository-url>
cd NodeOps

# Deploy everything with a single command
chmod +x deploy.sh
./deploy.sh deploy

# The script will:
# 1. Build all Docker images
# 2. Start PostgreSQL database
# 3. Initialize database schema
# 4. Start backend API server
# 5. Build and serve the dashboard
```

### Accessing the System

After deployment completes (typically 2-3 minutes), access:

| Service | URL | Purpose |
|---------|-----|---------|
| **Dashboard** | http://localhost:3000 | Main user interface |
| **Backend API** | http://localhost:3001 | REST API endpoints |
| **API Documentation** | http://localhost:3001/api-docs | Swagger UI (if enabled) |
| **Database** | localhost:5432 | PostgreSQL connection |

### First Login

Use the demo credentials to explore the system:

```
Email: demo@sentinel.com
Password: password123
```

Or create your own account using the registration page.

### Adding Your First Validator

1. **Navigate to Validators page** in the dashboard
2. **Click "Add Validator"** button
3. **Fill in the form:**
   - **Name:** A friendly name (e.g., "Main Ethereum Validator")
   - **Beacon Node URL:** Your beacon node's API endpoint (e.g., `http://localhost:5052`)
4. **Click "Create Validator"**
5. **Copy the API Key** shown (you'll need this for agents)

### Deploying Your First Agent

```bash
# Navigate to the agent package
cd packages/sentinel-agent

# Install dependencies (if not already done)
npm install

# Build the agent
npm run build

# Create a configuration file
cat > agent-config.json << 'EOF'
{
  "agentId": "agent-1",
  "apiKey": "YOUR_API_KEY_FROM_DASHBOARD",
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

# Start the agent
AGENT_ID=agent-1 AGENT_API_KEY=YOUR_API_KEY npm run cli start --config agent-config.json
```

**Replace `YOUR_API_KEY_FROM_DASHBOARD`** with the actual API key from step 5 above.

### Setting Up Multi-Agent Consensus

For true consensus, deploy at least 2 agents in different locations:

**Agent 1 (Local):**
```bash
# On your local machine
cd packages/sentinel-agent
AGENT_ID=agent-1 AGENT_API_KEY=validator_api_key npm run cli start --config agent-config.json
```

**Agent 2 (Cloud Instance - e.g., AWS):**
```bash
# SSH into AWS instance
ssh ubuntu@your-aws-instance

# Clone repository and setup
git clone <repository-url>
cd NodeOps/packages/sentinel-agent
npm install && npm run build

# Configure with same validator API key but different agent ID
cat > agent-config.json << 'EOF'
{
  "agentId": "agent-2",
  "apiKey": "validator_api_key",
  "backendUrl": "http://your-backend-public-ip:3001",
  "beaconNodeUrl": "http://validator-beacon-node:5052",
  "p2p": {
    "enabled": true,
    "port": 3003,
    "bootstrapNodes": ["ws://agent-1-ip:3003"]
  }
}
EOF

# Start agent
AGENT_ID=agent-2 AGENT_API_KEY=validator_api_key npm run cli start
```

**Important:** All agents monitoring the same validator should:
- Use the **same API key** (from that validator)
- Have **different agent IDs**
- Be able to **communicate via P2P network** (ports open)

### Configuring Webhooks for Automated Actions

1. **Go to Webhooks page** in dashboard
2. **Click "Add Webhook"**
3. **Configure:**
   - **Name:** "Slack Notifications"
   - **URL:** Your webhook endpoint (e.g., Slack webhook URL)
   - **Events:** Select "Alert Created", "Validator Unhealthy"
   - **Active:** Toggle on
4. **Test the webhook** using the test button
5. **Save configuration**

**Example Webhook Payload:**

When an alert is triggered, your webhook receives:

```json
{
  "event": "alert.created",
  "timestamp": "2025-01-22T15:30:00Z",
  "alert": {
    "id": "alert_123",
    "validatorId": "validator_456",
    "validatorName": "Main Ethereum Validator",
    "severity": "critical",
    "message": "Validator unhealthy - Consensus reached by 3 agents",
    "consensusData": {
      "totalAgents": 3,
      "confirmingAgents": 3,
      "threshold": 2
    }
  },
  "signature": "hmac-sha256-signature-here"
}
```

### Verifying Everything Works

**Check Backend Health:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","database":"connected"}
```

**Check Agent Status:**
```bash
cd packages/sentinel-agent
npm run cli status
# Shows agent health, P2P connections, recent checks
```

**View Live Dashboard:**
- Open http://localhost:3000 in your browser
- Login with your credentials
- Navigate to Dashboard page
- You should see:
  - Green status for validators (if beacon node is healthy)
  - Connected agents count
  - Recent activity

**Simulate a Failure (Testing):**
```bash
# Stop your beacon node temporarily
# Watch agents detect the failure
# See consensus being reached in agent logs
# Alert appears in dashboard
# Webhook triggered (if configured)
```

## 📊 Configuration Reference

### Environment Variables

#### Backend Configuration

Create a `.env` file in `packages/sentinel-backend/`:

```bash
# Database Connection
DATABASE_URL="postgresql://sentinel_user:sentinel_password@localhost:5432/sentinel_db"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV="production"
LOG_LEVEL="info"  # debug, info, warn, error

# WebSocket Server
WS_PORT=3002
WS_HEARTBEAT_INTERVAL=30000

# CORS Settings
CORS_ORIGIN="http://localhost:3000"

# Agent Defaults
DEFAULT_HEALTH_CHECK_INTERVAL=30000
DEFAULT_CONSENSUS_THRESHOLD=2
DEFAULT_CONSENSUS_TIMEOUT=120000

# Webhook Configuration
WEBHOOK_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=5000

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100  # requests per window
```

#### Agent Configuration File

Create `agent-config.json`:

```json
{
  "agentId": "agent-unique-id",
  "apiKey": "validator-api-key-from-dashboard",
  "backendUrl": "http://localhost:3001",
  "beaconNodeUrl": "http://localhost:5052",
  
  "p2p": {
    "enabled": true,
    "port": 3003,
    "host": "0.0.0.0",
    "discoveryInterval": 60000,
    "maxPeers": 10,
    "bootstrapNodes": [
      "ws://agent1.example.com:3003",
      "ws://agent2.example.com:3003"
    ]
  },
  
  "healthCheck": {
    "interval": 30000,
    "timeout": 10000,
    "retries": 3,
    "retryDelay": 5000,
    "endpoints": [
      "/eth/v1/node/health",
      "/eth/v1/node/syncing"
    ]
  },
  
  "consensus": {
    "threshold": 2,
    "timeout": 120000,
    "minAgents": 2
  },
  
  "reporting": {
    "batchSize": 10,
    "batchInterval": 300000,
    "includeMetrics": true
  },
  
  "logging": {
    "level": "info",
    "file": "./logs/agent.log",
    "maxSize": "10m",
    "maxFiles": 5
  }
}
```

**Configuration Parameter Details:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `agentId` | string | required | Unique identifier for this agent |
| `apiKey` | string | required | API key from validator configuration |
| `backendUrl` | string | required | Sentinel backend API base URL |
| `beaconNodeUrl` | string | required | Ethereum beacon node API endpoint |
| `p2p.enabled` | boolean | true | Enable P2P consensus network |
| `p2p.port` | number | 3003 | Port for P2P WebSocket server |
| `p2p.discoveryInterval` | number | 60000 | How often to discover new peers (ms) |
| `p2p.maxPeers` | number | 10 | Maximum concurrent peer connections |
| `p2p.bootstrapNodes` | string[] | [] | Initial peers to connect to |
| `healthCheck.interval` | number | 30000 | Time between health checks (ms) |
| `healthCheck.timeout` | number | 10000 | HTTP request timeout (ms) |
| `healthCheck.retries` | number | 3 | Retry attempts for failed checks |
| `consensus.threshold` | number | 2 | Minimum agents needed to confirm |
| `consensus.timeout` | number | 120000 | Max wait time for consensus (ms) |
| `reporting.batchInterval` | number | 300000 | How often to report to backend (ms) |

### Dashboard Configuration

The dashboard reads configuration from `packages/sentinel-dashboard/.env`:

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3002

# Feature Flags
REACT_APP_ENABLE_WEBHOOKS=true
REACT_APP_ENABLE_ANALYTICS=true

# UI Configuration
REACT_APP_REFRESH_INTERVAL=30000
REACT_APP_TOAST_DURATION=5000
```

## 🔒 Security Best Practices

### Production Deployment Checklist

- [ ] **Change default JWT secret** - Use a strong, random secret (at least 32 characters)
- [ ] **Use HTTPS** - Configure SSL/TLS certificates for the backend
- [ ] **Enable rate limiting** - Protect against brute force attacks
- [ ] **Configure CORS properly** - Restrict to your dashboard domain
- [ ] **Use strong passwords** - Enforce minimum password requirements
- [ ] **Rotate API keys** - Regenerate validator API keys periodically
- [ ] **Enable webhook signatures** - Verify HMAC signatures on webhook deliveries
- [ ] **Use environment variables** - Never commit secrets to git
- [ ] **Enable database SSL** - Use encrypted connections to PostgreSQL
- [ ] **Set up monitoring** - Track failed authentication attempts
- [ ] **Regular updates** - Keep dependencies up to date
- [ ] **Backup database** - Regular automated backups

### Agent Security

- **API Key Protection:** Store API keys in configuration files with restricted permissions (`chmod 600`)
- **Network Security:** Use firewall rules to restrict P2P ports to known agent IPs
- **TLS for P2P:** Consider implementing TLS for agent-to-agent communication (extensible)
- **Audit Logging:** Enable detailed logging for security analysis

### Webhook Security

When implementing webhook receivers:

```javascript
// Verify HMAC signature on incoming webhooks
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## 📈 Monitoring & Observability

### Health Check Endpoints

**Backend Health:**
```bash
GET /health
Response: {
  "status": "ok",
  "database": "connected",
  "websocket": "active",
  "uptime": 3600
}
```

**Agent Health:**
```bash
# Via CLI
npm run cli status

# Response includes:
# - Agent uptime
# - Last successful health check
# - P2P peer count
# - Backend connection status
# - Recent errors
```

### Logging

All components use structured logging:

**Backend Logs:**
```
[2025-01-22T15:30:00Z] INFO: Server started on port 3001
[2025-01-22T15:30:15Z] INFO: WebSocket server listening on 3002
[2025-01-22T15:31:00Z] INFO: User login successful - user@example.com
[2025-01-22T15:32:00Z] WARN: Health check failed - validator_123
[2025-01-22T15:32:05Z] INFO: Alert created - Consensus reached
```

**Agent Logs:**
```
[2025-01-22T15:30:00Z] INFO: Agent agent-1 started
[2025-01-22T15:30:05Z] INFO: P2P network initialized - listening on 3003
[2025-01-22T15:30:10Z] INFO: Connected to peer agent-2
[2025-01-22T15:30:30Z] INFO: Health check passed - beacon node healthy
[2025-01-22T15:31:00Z] WARN: Health check failed - timeout after 10000ms
[2025-01-22T15:31:05Z] INFO: Requesting consensus from 2 peers
[2025-01-22T15:31:10Z] INFO: Consensus reached - 3/3 agents confirm failure
```

### Metrics & Analytics

The dashboard provides real-time metrics:

- **Validator Uptime** - Percentage uptime over time periods
- **Alert Response Time** - Time from failure to alert creation
- **Consensus Efficiency** - Success rate of consensus protocol
- **Agent Health** - Individual agent availability and performance
- **Webhook Delivery** - Success/failure rates for webhooks

## 🎓 Advanced Topics

### Multi-Region Deployment

For maximum reliability, deploy agents across geographic regions:

**Architecture:**
```
Validator (Home/Datacenter)
    ↓
├── Agent 1 (US-East) - AWS EC2
├── Agent 2 (EU-West) - Hetzner
├── Agent 3 (Asia-Southeast) - DigitalOcean
└── Agent 4 (Local) - On same network as validator
```

**Benefits:**
- Detect regional internet outages vs actual validator failures
- Protection against cloud provider issues
- Lower latency from at least one agent

### Kubernetes Deployment

For enterprise scaling, deploy using Kubernetes:

```yaml
# agent-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sentinel-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sentinel-agent
  template:
    metadata:
      labels:
        app: sentinel-agent
    spec:
      containers:
      - name: agent
        image: sentinel-agent:latest
        env:
        - name: AGENT_API_KEY
          valueFrom:
            secretKeyRef:
              name: sentinel-secrets
              key: api-key
        volumeMounts:
        - name: config
          mountPath: /app/config
      volumes:
      - name: config
        configMap:
          name: agent-config
```

### Custom Failure Detection Logic

Extend the agent to implement custom health checks:

```typescript
// In packages/sentinel-agent/src/monitoring/CustomHealthCheck.ts

export class CustomHealthCheck extends BeaconNodeMonitor {
  async performAdvancedCheck(): Promise<boolean> {
    // Check 1: Node sync status
    const syncStatus = await this.checkSyncStatus();
    if (!syncStatus.isSynced) return false;
    
    // Check 2: Peer count
    const peers = await this.getPeerCount();
    if (peers < 3) return false;
    
    // Check 3: Recent attestations
    const attestations = await this.getRecentAttestations();
    if (attestations.length === 0) return false;
    
    return true;
  }
}
```

### Webhook Failover Automation

Example webhook handler for automated failover:

```javascript
// Webhook receiver that starts a backup validator
const express = require('express');
const { exec } = require('child_process');

app.post('/webhook/failover', (req, res) => {
  const { alert, signature } = req.body;
  
  // Verify signature
  if (!verifySignature(alert, signature)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Check alert severity
  if (alert.severity === 'critical') {
    // Start backup validator
    exec('./scripts/start-backup-validator.sh', (error, stdout) => {
      if (error) {
        console.error('Failover failed:', error);
        return;
      }
      console.log('Backup validator started:', stdout);
    });
  }
  
  res.status(200).send('Webhook received');
});
```

## 🤝 How Others Can Use This Tool

### For Individual Validators

**Setup Time:** 30 minutes  
**Cost:** $10-20/month (for 2-3 cloud agents)

1. Deploy the Sentinel backend using the provided Docker Compose
2. Access the dashboard and create your user account
3. Add your validators with beacon node URLs
4. Deploy agents on cloud instances (AWS, DigitalOcean, Linode)
5. Configure webhooks for notifications (Telegram, SMS, etc.)

**What You Get:**
- False-positive-free monitoring
- Multi-location failure detection
- Automated alerting
- Historical analysis

### For Staking-as-a-Service Providers

**Setup Time:** 2-4 hours  
**Scale:** Unlimited validators

1. Deploy Sentinel backend on your infrastructure (Kubernetes recommended)
2. Integrate with your existing user management system
3. Automate validator onboarding via API
4. Deploy agent pools for redundancy
5. White-label the dashboard for client access

**What You Get:**
- Professional monitoring for all client validators
- Reduced operational overhead
- SLA compliance tracking
- Competitive differentiation

### For Blockchain Infrastructure Companies

**Setup Time:** 1-2 days  
**Integration Complexity:** Medium

1. Fork the repository and customize for your stack
2. Integrate Sentinel API with your orchestration system
3. Deploy agents alongside existing monitoring (Prometheus, Grafana)
4. Use webhooks to trigger internal incident management
5. Extend the dashboard with your branding

**What You Get:**
- Specialized validator monitoring alongside general infrastructure monitoring
- API-first integration with existing tools
- Proven consensus algorithm
- Production-ready codebase

### For DAO Validator Operations

**Setup Time:** 1 hour  
**Governance:** Decentralized

1. Deploy Sentinel backend on community infrastructure
2. Create accounts for all DAO members (multi-user support)
3. Configure validators with multi-region agents
4. Set up webhooks to notify DAO communication channels
5. Use alert history for governance transparency

**What You Get:**
- Decentralized monitoring matching DAO values
- Shared visibility for all members
- Transparent alert history
- Community-operated infrastructure

## 🚀 Future Roadmap

### Planned Features (Post-Hackathon)

1. **Machine Learning Predictions**
   - Analyze historical patterns to predict failures
   - Anomaly detection for unusual validator behavior
   - Recommended maintenance windows based on ML insights

2. **Multi-Chain Support**
   - Extend beyond Ethereum to Polygon, Arbitrum, Optimism
   - Universal agent supporting multiple beacon APIs
   - Cross-chain dashboard view

3. **Mobile Application**
   - Native iOS and Android apps
   - Push notifications
   - Quick validator status checks

4. **Advanced Analytics**
   - Performance benchmarking against network average
   - Profitability calculations (rewards vs slashing risk)
   - Comprehensive reporting for tax purposes

5. **Marketplace Integration**
   - One-click deployment from NodeOps marketplace
   - Template configurations for common setups
   - Community-contributed agent configurations

6. **Enhanced Security**
   - Two-factor authentication
   - Hardware security module (HSM) integration
   - Encrypted agent communications (mTLS)

## 📄 License & Attribution

This project is released under the MIT License. See the LICENSE file for details.

**Acknowledgments:**
- Ethereum Foundation for beacon chain specifications
- Node.js and TypeScript communities
- React and the broader frontend ecosystem
- PostgreSQL and Prisma for database excellence

## 📞 Support & Contact

For questions, issues, or contributions:

- **GitHub Issues:** [Report bugs or request features]
- **Documentation:** This file and the README.md
- **Community:** Join our Discord/Telegram (if applicable)
- **Email:** support@sentinel-monitoring.com (if applicable)

---

**Built with ❤️ for the NodeOps Proof-of-Build Hackathon**

*Sentinel: Because your validators deserve more than reactive monitoring.*
