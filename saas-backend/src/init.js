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
-- ===============================
-- SaaS Multi-Tenant Schema (SAFE)
-- ===============================

-- Enable UUID generator (portable & safe)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================
-- USERS (Tenant level)
-- ===============================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,

    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,

    full_name VARCHAR(255),
    company_name VARCHAR(255),

    plan_type VARCHAR(50) DEFAULT 'starter',
    max_phone_numbers INT DEFAULT 3,
    max_messages_per_day INT DEFAULT 1000,

    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ===============================
-- PHONE NUMBERS (WA Instances)
-- ===============================
CREATE TABLE IF NOT EXISTS phone_numbers (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE,

    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    instance_name VARCHAR(255) UNIQUE NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,

    phone_number VARCHAR(20),
    display_name VARCHAR(255),
    profile_picture_url TEXT,

    status VARCHAR(50) DEFAULT 'created',
    server_instance VARCHAR(50),

    qr_code TEXT,
    qr_expires_at TIMESTAMP,

    last_connected_at TIMESTAMP,
    last_disconnected_at TIMESTAMP,
    connection_attempts INT DEFAULT 0,

    webhook_url TEXT,
    webhook_events TEXT[],

    is_active BOOLEAN DEFAULT true,
    auto_reconnect BOOLEAN DEFAULT true,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ===============================
-- MESSAGE STATISTICS
-- ===============================
CREATE TABLE IF NOT EXISTS message_stats (
    id SERIAL PRIMARY KEY,
    phone_number_id INT NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    messages_sent INT DEFAULT 0,
    messages_received INT DEFAULT 0,
    messages_failed INT DEFAULT 0,

    media_sent INT DEFAULT 0,
    media_received INT DEFAULT 0,

    groups_joined INT DEFAULT 0,
    contacts_added INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(phone_number_id, date)
);

-- ===============================
-- WEBHOOK LOGS
-- ===============================
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    phone_number_id INT NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,

    event_type VARCHAR(100),
    payload JSONB,

    status_code INT,
    response_body TEXT,
    error_message TEXT,

    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INT
);

-- ===============================
-- API REQUEST LOGS
-- ===============================
CREATE TABLE IF NOT EXISTS api_requests (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    phone_number_id INT REFERENCES phone_numbers(id) ON DELETE SET NULL,

    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INT,

    ip_address INET,
    user_agent TEXT,

    response_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- BILLING & USAGE
-- ===============================
CREATE TABLE IF NOT EXISTS billing_usage (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    year INT NOT NULL,
    month INT NOT NULL,

    total_messages INT DEFAULT 0,
    total_api_calls INT DEFAULT 0,
    total_phone_numbers INT DEFAULT 0,

    amount DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'IDR',

    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, year, month)
);

-- ===============================
-- INDEXES
-- ===============================
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_phone_user ON phone_numbers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_phone_token ON phone_numbers(token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stats_phone_date ON message_stats(phone_number_id, date DESC);

-- ===============================
-- UPDATED_AT TRIGGER
-- ===============================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated') THEN
        CREATE TRIGGER trg_users_updated
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_phone_updated') THEN
        CREATE TRIGGER trg_phone_updated
        BEFORE UPDATE ON phone_numbers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stats_updated') THEN
        CREATE TRIGGER trg_stats_updated
        BEFORE UPDATE ON message_stats
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- ===============================
-- DEFAULT ADMIN (SAFE)
-- ===============================
INSERT INTO users (
  email,
  password_hash,
  api_key,
  full_name,
  plan_type,
  max_phone_numbers,
  status,
  email_verified
)
VALUES (
  'admin@localhost',
  '$2b$10$rGHZBnQXqk.xX0p8R9xDqO8qYZ4LxYX5QFhV3WZ9YXqYZQXYZQXYZ',
  'admin-api-key-change-this',
  'System Administrator',
  'enterprise',
  100,
  'active',
  true
)
ON CONFLICT (email) DO NOTHING;
`;

async function initializeDatabase() {
  console.log('🔄 Initializing database schema...');
  let client;

  try {
    client = await pool.connect();
    await client.query(initSql);
    console.log('✅ Database schema ready');
  } catch (err) {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

initializeDatabase();
