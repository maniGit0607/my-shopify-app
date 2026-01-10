-- Migration: Add new columns to existing tables

-- Add new columns to daily_metrics
ALTER TABLE daily_metrics ADD COLUMN paid_orders INTEGER DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN pending_orders INTEGER DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN refunded_orders INTEGER DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN partially_refunded_orders INTEGER DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN fulfilled_orders INTEGER DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN unfulfilled_orders INTEGER DEFAULT 0;
ALTER TABLE daily_metrics ADD COLUMN partially_fulfilled_orders INTEGER DEFAULT 0;

-- Add new columns to daily_product_metrics
ALTER TABLE daily_product_metrics ADD COLUMN units_refunded INTEGER DEFAULT 0;
ALTER TABLE daily_product_metrics ADD COLUMN refund_amount REAL DEFAULT 0;

-- Create new tables if they don't exist
CREATE TABLE IF NOT EXISTS hourly_order_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  order_count INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop, date, hour)
);

CREATE TABLE IF NOT EXISTS customer_lifetime (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  email TEXT,
  first_order_date TEXT,
  last_order_date TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  total_refunded REAL DEFAULT 0,
  average_order_value REAL DEFAULT 0,
  is_repeat_customer INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop, customer_id)
);

CREATE TABLE IF NOT EXISTS refund_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL,
  refund_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount REAL DEFAULT 0,
  reason TEXT,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop, refund_id)
);

CREATE TABLE IF NOT EXISTS cancellation_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL,
  cancellation_date TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount REAL DEFAULT 0,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shop, order_id)
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_hourly_metrics_shop_date ON hourly_order_metrics(shop, date);
CREATE INDEX IF NOT EXISTS idx_customer_lifetime_shop ON customer_lifetime(shop);
CREATE INDEX IF NOT EXISTS idx_customer_lifetime_customer ON customer_lifetime(shop, customer_id);
CREATE INDEX IF NOT EXISTS idx_refund_details_shop_date ON refund_details(shop, date);
CREATE INDEX IF NOT EXISTS idx_cancellation_details_shop_date ON cancellation_details(shop, date);

