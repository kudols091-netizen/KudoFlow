CREATE DATABASE IF NOT EXISTS kudotoolai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kudotoolai;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  email_verified TINYINT(1) DEFAULT 0,
  plan ENUM('free','trial','pro','lifetime') DEFAULT 'free',
  plan_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  settings_json LONGTEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INT PRIMARY KEY DEFAULT 1,
  data JSON NOT NULL,
  version INT DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS execution_config (
  id INT PRIMARY KEY DEFAULT 1,
  data JSON NOT NULL,
  version INT DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS providers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon_url VARCHAR(512),
  status ENUM('active','inactive','maintenance') DEFAULT 'active',
  data JSON,
  version INT DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(512),
  content LONGTEXT,
  type ENUM('info','warning','promo','update') DEFAULT 'info',
  display_mode ENUM('modal','banner','toast') DEFAULT 'banner',
  active TINYINT(1) DEFAULT 1,
  version INT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(64) PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(512),
  data LONGTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_shares (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  workflow_id VARCHAR(64) NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  note TEXT,
  status ENUM('pending','accepted','rejected','revoked') DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usage_daily (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  task_run INT DEFAULT 0,
  workflow_run INT DEFAULT 0,
  angles_run INT DEFAULT 0,
  flow_prompt_total INT DEFAULT 0,
  chatgpt_prompt_total INT DEFAULT 0,
  gemini_prompt_total INT DEFAULT 0,
  grok_prompt_total INT DEFAULT 0,
  extra JSON,
  UNIQUE KEY unique_user_date (user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sse_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  ticket VARCHAR(255) UNIQUE NOT NULL,
  used TINYINT(1) DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed system_settings
INSERT IGNORE INTO system_settings (id, data, version) VALUES (1, '{"maintenance_mode":false,"max_batch_size":50,"supported_providers":["chatgpt","grok","gemini","flow"]}', 1);

-- Seed execution_config
INSERT IGNORE INTO execution_config (id, data, version) VALUES (1, '{"workflow":{"node_timeout_ms":120000,"max_retries":3},"queue":{"max_concurrent":5,"batch_delay_ms":500},"timing":{"poll_interval_ms":2000,"idle_timeout_ms":30000},"flow_recovery":{"enabled":true,"max_attempts":2}}', 1);

-- Seed providers
INSERT IGNORE INTO providers VALUES
  ('chatgpt','ChatGPT','',  'active', '{"models":["gpt-4o","gpt-4o-mini","o1","o3"]}', 1, NOW()),
  ('grok',   'Grok',   '', 'active', '{"models":["grok-3","grok-3-mini"]}', 1, NOW()),
  ('gemini', 'Gemini', '', 'active', '{"models":["gemini-2.0-flash","gemini-2.5-pro"]}', 1, NOW()),
  ('flow',   'Google Flow', '', 'active', '{"models":["imagen-3"]}', 1, NOW());
