const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'evolution',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const initSql = `
-- Create database schema for SaaS multi-tenancy

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: Users (Tenants)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    
    -- Plan & Limits
    plan_type VARCHAR(50) DEFAULT 'starter', -- starter, business, enterprise
    max_phone_numbers INT DEFAULT 3,
    max_messages_per_day INT DEFAULT 1000,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
    email_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Table: Phone Numbers (WhatsApp Instances)
CREATE TABLE IF NOT EXISTS phone_numbers (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Instance Info
    instance_name VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    display_name VARCHAR(255),
    profile_picture_url TEXT,
    
    -- Status & Server
    status VARCHAR(50) DEFAULT 'created', -- created, qr_ready, connecting, connected, disconnected, error
    server_instance VARCHAR(50), -- evolution-api-1, evolution-api-2
    
    -- QR Code
    qr_code TEXT,
    qr_expires_at TIMESTAMP,
    
    -- Connection
    last_connected_at TIMESTAMP,
    last_disconnected_at TIMESTAMP,
    connection_attempts INT DEFAULT 0,
    
    -- Webhook
    webhook_url TEXT,
    webhook_events TEXT[], -- Array of events to subscribe
    
    -- Flags
    is_active BOOLEAN DEFAULT true,
    auto_reconnect BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Table: Message Statistics
CREATE TABLE IF NOT EXISTS message_stats (
    id SERIAL PRIMARY KEY,
    phone_number_id INT NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Message counts
    messages_sent INT DEFAULT 0,
    messages_received INT DEFAULT 0,
    messages_failed INT DEFAULT 0,
    
    -- Media counts
    media_sent INT DEFAULT 0,
    media_received INT DEFAULT 0,
    
    -- Other stats
    groups_joined INT DEFAULT 0,
    contacts_added INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(phone_number_id, date)
);

-- Table: Webhook Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    phone_number_id INT NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    
    event_type VARCHAR(100),
    payload JSONB,
    
    -- Response
    status_code INT,
    response_body TEXT,
    error_message TEXT,
    
    -- Timing
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INT
);

-- Table: API Request Logs
CREATE TABLE IF NOT EXISTS api_requests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    phone_number_id INT REFERENCES phone_numbers(id) ON DELETE SET NULL,
    
    -- Request info
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INT,
    
    -- Client info
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    response_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: Billing & Usage
CREATE TABLE IF NOT EXISTS billing_usage (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Period
    year INT NOT NULL,
    month INT NOT NULL,
    
    -- Usage
    total_messages INT DEFAULT 0,
    total_api_calls INT DEFAULT 0,
    total_phone_numbers INT DEFAULT 0,
    
    -- Billing
    amount DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'IDR',
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, year, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id ON phone_numbers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_phone_numbers_token ON phone_numbers(token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_phone_numbers_instance_name ON phone_numbers(instance_name);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON phone_numbers(status);

CREATE INDEX IF NOT EXISTS idx_message_stats_phone_date ON message_stats(phone_number_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_phone_sent ON webhook_logs(phone_number_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_user_created ON api_requests(user_id, created_at DESC);

-- Function: Auto update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_phone_numbers_updated_at') THEN
        CREATE TRIGGER update_phone_numbers_updated_at 
            BEFORE UPDATE ON phone_numbers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_message_stats_updated_at') THEN
        CREATE TRIGGER update_message_stats_updated_at 
            BEFORE UPDATE ON message_stats
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Insert default admin user (password: Admin123!)
-- Password hash for 'Admin123!' using bcrypt
INSERT INTO users (email, password_hash, api_key, full_name, plan_type, max_phone_numbers, status, email_verified)
VALUES (
    'admin@localhost',
    '$2b$10$rGHZBnQXqk.xX0p8R9xDqO8qYZ4LxYX5QFhV3WZ9YXqYZQXYZQXYZ',
    'admin-api-key-change-this-in-production',
    'System Administrator',
    'enterprise',
    100,
    'active',
    true
) ON CONFLICT (email) DO NOTHING;

-- Create view for dashboard
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.company_name,
    u.plan_type,
    u.status,
    COUNT(DISTINCT p.id) as total_phone_numbers,
    COUNT(DISTINCT CASE WHEN p.status IN ('connected', 'open') THEN p.id END) as connected_phones,
    COALESCE(SUM(ms.messages_sent), 0) as total_messages_sent_today,
    COALESCE(SUM(ms.messages_received), 0) as total_messages_received_today,
    u.created_at,
    u.last_login
FROM users u
LEFT JOIN phone_numbers p ON u.id = p.user_id AND p.deleted_at IS NULL
LEFT JOIN message_stats ms ON p.id = ms.phone_number_id AND ms.date = CURRENT_DATE
WHERE u.deleted_at IS NULL
GROUP BY u.id;

-- Create view for phone number details
CREATE OR REPLACE VIEW phone_number_details AS
SELECT 
    p.id,
    p.uuid,
    p.user_id,
    p.instance_name,
    p.token,
    p.phone_number,
    p.display_name,
    p.status,
    p.server_instance,
    p.last_connected_at,
    p.is_active,
    COALESCE(SUM(ms.messages_sent), 0) as messages_sent_today,
    COALESCE(SUM(ms.messages_received), 0) as messages_received_today,
    p.created_at
FROM phone_numbers p
LEFT JOIN message_stats ms ON p.id = ms.phone_number_id AND ms.date = CURRENT_DATE
WHERE p.deleted_at IS NULL
GROUP BY p.id;

`;

async function initializeDatabase() {
  console.log('Attempting to initialize database...');
  let client;
  try {
    client = await pool.connect();
    console.log('Database connection successful. Executing SQL script...');
    await client.query(initSql);
    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing database schema:', err.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
      console.log('Database client released.');
    }
    await pool.end();
    console.log('Database pool closed.');
  }
}

console.log('Starting database initialization script...');
initializeDatabase();
