export interface Env {
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_SCOPES: string;
  APP_URL: string;
  FRONTEND_URL: string;
  SHOP_TOKENS: KVNamespace;
  ANALYTICS_DB: D1Database;
}

export interface ShopTokenData {
  accessToken: string;
  scope: string;
  installedAt: string;
  shop: string;
}

export interface SessionTokenPayload {
  iss: string;  // https://shop-domain.myshopify.com/admin
  dest: string; // https://shop-domain.myshopify.com
  aud: string;  // API key
  sub: string;  // User ID
  exp: number;  // Expiry
  nbf: number;  // Not before
  iat: number;  // Issued at
  jti: string;  // JWT ID
  sid: string;  // Session ID
}

export interface ShopifyOAuthResponse {
  access_token: string;
  scope: string;
}

// ============ Analytics Types ============

export interface DailyMetrics {
  id?: number;
  shop: string;
  date: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  new_customer_orders: number;
  returning_customer_orders: number;
  total_items_sold: number;
  total_discounts: number;
  orders_with_discount: number;
  total_refunds: number;
  refund_count: number;
  cancelled_orders: number;
  cancelled_revenue: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailyProductMetrics {
  id?: number;
  shop: string;
  date: string;
  product_id: string;
  product_title: string;
  variant_id: string;
  variant_title: string;
  units_sold: number;
  revenue: number;
  discount_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface DailyCustomerMetrics {
  id?: number;
  shop: string;
  date: string;
  new_customers: number;
  returning_customers: number;
  total_customers: number;
  created_at?: string;
  updated_at?: string;
}

export interface ShopEvent {
  id?: number;
  shop: string;
  date: string;
  event_type: string;
  description: string;
  impact_amount?: number;
  metadata?: string;
  created_at?: string;
}

export type OrderBreakdownType = 'channel' | 'payment_method' | 'status' | 'discount';

export interface DailyOrderBreakdown {
  id?: number;
  shop: string;
  date: string;
  breakdown_type: OrderBreakdownType;
  breakdown_value: string;
  order_count: number;
  revenue: number;
  created_at?: string;
  updated_at?: string;
}

export interface AggregatedOrderBreakdown {
  breakdown_value: string;
  order_count: number;
  revenue: number;
}

// ============ Shopify Webhook Types ============

export interface ShopifyOrder {
  id: number;
  admin_graphql_api_id: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  name: string;
  order_number: number;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  total_tax: string;
  currency: string;
  customer: ShopifyCustomer | null;
  line_items: ShopifyLineItem[];
  discount_codes: ShopifyDiscountCode[];
  refunds: ShopifyRefund[];
  // Additional fields for breakdown reporting
  source_name?: string; // e.g., 'web', 'pos', 'mobile'
  channel_information?: {
    channel_id?: number;
    channel_definition?: {
      channel_name?: string;
    };
  };
  payment_gateway_names?: string[]; // e.g., ['shopify_payments', 'paypal']
}

export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  created_at: string;
}

export interface ShopifyLineItem {
  id: number;
  product_id: number;
  variant_id: number;
  title: string;
  variant_title: string;
  quantity: number;
  price: string;
  total_discount: string;
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: string;
}

export interface ShopifyRefund {
  id: number;
  created_at: string;
  order_id: number;
  refund_line_items: {
    line_item_id: number;
    quantity: number;
    subtotal: string;
  }[];
  transactions: {
    amount: string;
  }[];
}

// ============ Analytics Insight Types ============

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface Insight {
  factor: string;
  impact: number;
  message: string;
  severity: InsightSeverity;
  details?: any;
}

export interface PeriodMetrics {
  revenue: number;
  orders: number;
  aov: number;
  newCustomerOrders: number;
  returningCustomerOrders: number;
  itemsSold: number;
  discountTotal: number;
  ordersWithDiscount: number;
  refundTotal: number;
  refundCount: number;
  cancelledOrders: number;
  cancelledRevenue: number;
}

export interface ProductPeriodMetrics {
  productId: string;
  productTitle: string;
  revenue: number;
  unitsSold: number;
}

export interface AnalyticsReport {
  period: {
    start: string;
    end: string;
  };
  comparison_period?: {
    start: string;
    end: string;
  };
  metrics: PeriodMetrics;
  comparison_metrics?: PeriodMetrics;
  insights: Insight[];
  top_products: ProductPeriodMetrics[];
  trends: {
    revenue_trend: 'up' | 'down' | 'stable';
    orders_trend: 'up' | 'down' | 'stable';
    aov_trend: 'up' | 'down' | 'stable';
  };
}


