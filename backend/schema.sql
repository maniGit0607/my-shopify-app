-- Daily aggregated metrics per shop
CREATE TABLE IF NOT EXISTS daily_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  
  -- Revenue metrics
  total_revenue REAL DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_order_value REAL DEFAULT 0,
  
  -- Order breakdown
  new_customer_orders INTEGER DEFAULT 0,
  returning_customer_orders INTEGER DEFAULT 0,
  
  -- Item metrics
  total_items_sold INTEGER DEFAULT 0,
  
  -- Discount metrics
  total_discounts REAL DEFAULT 0,
  orders_with_discount INTEGER DEFAULT 0,
  
  -- Refunds
  total_refunds REAL DEFAULT 0,
  refund_count INTEGER DEFAULT 0,
  
  -- Cancellations
  cancelled_orders INTEGER DEFAULT 0,
  cancelled_revenue REAL DEFAULT 0,
  
  -- Financial status breakdown
  paid_orders INTEGER DEFAULT 0,
  pending_orders INTEGER DEFAULT 0,
  refunded_orders INTEGER DEFAULT 0,
  partially_refunded_orders INTEGER DEFAULT 0,
  
  -- Fulfillment status breakdown
  fulfilled_orders INTEGER DEFAULT 0,
  unfulfilled_orders INTEGER DEFAULT 0,
  partially_fulfilled_orders INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, date)
);

-- Product performance per day
CREATE TABLE IF NOT EXISTS daily_product_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_title TEXT,
  variant_id TEXT,
  variant_title TEXT,
  
  units_sold INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  
  -- Refund tracking per product
  units_refunded INTEGER DEFAULT 0,
  refund_amount REAL DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, date, product_id, variant_id)
);

-- Customer metrics per day
CREATE TABLE IF NOT EXISTS daily_customer_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL,
  
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, date)
);

-- Hourly order metrics for time-of-day analysis
CREATE TABLE IF NOT EXISTS hourly_order_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  hour INTEGER NOT NULL, -- 0-23
  
  order_count INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, date, hour)
);

-- Individual customer lifetime tracking for LTV analysis
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
  
  -- Customer classification
  is_repeat_customer INTEGER DEFAULT 0, -- Boolean: 0 = one-time, 1 = repeat
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, customer_id)
);

-- Event log for tracking significant changes (useful for "what happened" analysis)
CREATE TABLE IF NOT EXISTS shop_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'large_order', 'bulk_refund', 'promo_spike', 'order_cancelled', etc.
  description TEXT,
  impact_amount REAL,
  metadata TEXT, -- JSON for flexible data
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Processed webhook tracking to prevent duplicates
CREATE TABLE IF NOT EXISTS processed_webhooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, webhook_id)
);

-- Order breakdown metrics for reporting (channel, payment, status, discount, financial_status)
CREATE TABLE IF NOT EXISTS daily_order_breakdown (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  breakdown_type TEXT NOT NULL, -- 'channel', 'payment_method', 'fulfillment_status', 'financial_status', 'discount'
  breakdown_value TEXT NOT NULL, -- e.g., 'online_store', 'credit_card', 'fulfilled', 'paid', 'with_discount'
  
  order_count INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, date, breakdown_type, breakdown_value)
);

-- Customer geography metrics (aggregated by country)
CREATE TABLE IF NOT EXISTS customer_geography (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT,
  
  customer_count INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, country)
);

-- Refund tracking with reasons
CREATE TABLE IF NOT EXISTS refund_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  refund_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  
  amount REAL DEFAULT 0,
  reason TEXT, -- 'customer_request', 'damaged', 'wrong_item', 'other'
  note TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, refund_id)
);

-- Cancellation tracking with reasons
CREATE TABLE IF NOT EXISTS cancellation_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD (order creation date)
  cancellation_date TEXT NOT NULL, -- When it was cancelled
  order_id TEXT NOT NULL,
  
  amount REAL DEFAULT 0,
  reason TEXT, -- 'customer', 'declined', 'fraud', 'inventory', 'other'
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(shop, order_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_daily_metrics_shop_date ON daily_metrics(shop, date);
CREATE INDEX IF NOT EXISTS idx_daily_product_shop_date ON daily_product_metrics(shop, date);
CREATE INDEX IF NOT EXISTS idx_daily_product_product ON daily_product_metrics(shop, product_id);
CREATE INDEX IF NOT EXISTS idx_daily_customer_shop_date ON daily_customer_metrics(shop, date);
CREATE INDEX IF NOT EXISTS idx_hourly_metrics_shop_date ON hourly_order_metrics(shop, date);
CREATE INDEX IF NOT EXISTS idx_customer_lifetime_shop ON customer_lifetime(shop);
CREATE INDEX IF NOT EXISTS idx_customer_lifetime_customer ON customer_lifetime(shop, customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_events_shop_date ON shop_events(shop, date);
CREATE INDEX IF NOT EXISTS idx_processed_webhooks ON processed_webhooks(shop, webhook_id);
CREATE INDEX IF NOT EXISTS idx_order_breakdown_shop_date ON daily_order_breakdown(shop, date, breakdown_type);
CREATE INDEX IF NOT EXISTS idx_customer_geography_shop ON customer_geography(shop);
CREATE INDEX IF NOT EXISTS idx_refund_details_shop_date ON refund_details(shop, date);
CREATE INDEX IF NOT EXISTS idx_cancellation_details_shop_date ON cancellation_details(shop, date);

-- Feedback/Query system
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop TEXT NOT NULL,
  query TEXT NOT NULL,
  reply TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' or 'replied'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  replied_at TEXT,
  UNIQUE(shop, id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_shop ON feedback(shop);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(shop, status);
