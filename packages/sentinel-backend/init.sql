-- Sentinel Database Initialization Script

-- Create database if it doesn't exist
-- (This is handled by docker-compose environment variables)

-- Enable UUID extension for cuid() function
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_validators_user_id ON validators(user_id);
CREATE INDEX IF NOT EXISTS idx_validators_api_key ON validators(api_key);
CREATE INDEX IF NOT EXISTS idx_agents_api_key ON agents(api_key);
CREATE INDEX IF NOT EXISTS idx_agents_last_seen ON agents(last_seen);
CREATE INDEX IF NOT EXISTS idx_agent_reports_agent_id ON agent_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_reports_validator_id ON agent_reports(validator_id);
CREATE INDEX IF NOT EXISTS idx_agent_reports_created_at ON agent_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_validator_id ON alerts(validator_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_user_id ON webhook_configs(user_id);

-- Create a default admin user for demo purposes
-- Password: "password" (hashed with bcrypt)
INSERT INTO users (id, email, password, name, "createdAt", "updatedAt")
VALUES (
  'demo-user-123',
  'demo@sentinel.com',
  '$2a$10$rEuVt2qKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqK', -- "password"
  'Demo User',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a demo validator
INSERT INTO validators (id, name, "beaconNodeUrl", "userId", "apiKey", "isActive", "createdAt", "updatedAt")
VALUES (
  'demo-validator-123',
  'Demo Validator',
  'http://localhost:5052',
  'demo-user-123',
  'demo_validator_key_123',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a demo agent
INSERT INTO agents (id, "apiKey", name, "isActive", "lastSeen", "createdAt")
VALUES (
  'demo-agent-123',
  'demo_agent_key_123',
  'Demo Agent',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create a demo webhook
INSERT INTO webhook_configs (id, "userId", name, url, events, "isActive", "createdAt", "updatedAt")
VALUES (
  'demo-webhook-123',
  'demo-user-123',
  'Demo Webhook',
  'http://localhost:3003/webhook',
  '["validator.unhealthy", "alert.created"]',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Sentinel database initialized successfully';
    RAISE NOTICE 'Demo credentials:';
    RAISE NOTICE '  Email: demo@sentinel.com';
    RAISE NOTICE '  Password: password';
END $$;
