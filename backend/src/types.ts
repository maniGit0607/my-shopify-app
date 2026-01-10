export interface Env {
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SHOPIFY_SCOPES: string;
  APP_URL: string;
  FRONTEND_URL: string;
  SHOP_TOKENS: KVNamespace;
  ANALYTICS_DB: D1Database;
  ADMIN_KEY?: string; // Optional admin key for feedback management
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
  // Financial status
  paid_orders: number;
  pending_orders: number;
  refunded_orders: number;
  partially_refunded_orders: number;
  // Fulfillment status
  fulfilled_orders: number;
  unfulfilled_orders: number;
  partially_fulfilled_orders: number;
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
  units_refunded: number;
  refund_amount: number;
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

export interface HourlyOrderMetrics {
  id?: number;
  shop: string;
  date: string;
  hour: number;
  order_count: number;
  revenue: number;
  items_sold: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerLifetime {
  id?: number;
  shop: string;
  customer_id: string;
  email?: string;
  first_order_date?: string;
  last_order_date?: string;
  total_orders: number;
  total_spent: number;
  total_refunded: number;
  average_order_value: number;
  is_repeat_customer: number;
  created_at?: string;
  updated_at?: string;
}

export interface RefundDetails {
  id?: number;
  shop: string;
  date: string;
  refund_id: string;
  order_id: string;
  amount: number;
  reason?: string;
  note?: string;
  created_at?: string;
}

export interface CancellationDetails {
  id?: number;
  shop: string;
  date: string;
  cancellation_date: string;
  order_id: string;
  amount: number;
  reason?: string;
  created_at?: string;
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

export type OrderBreakdownType = 'channel' | 'payment_method' | 'fulfillment_status' | 'financial_status' | 'discount' | 'country';

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

export interface CustomerGeography {
  id?: number;
  shop: string;
  country: string;
  country_code?: string;
  customer_count: number;
  total_spent: number;
  total_orders: number;
  created_at?: string;
  updated_at?: string;
}

export interface ShopifyCustomerAddress {
  country: string;
  country_code: string;
  province?: string;
  city?: string;
}

export interface ShopifyCustomerFull {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  orders_count: number;
  total_spent: string;
  default_address?: ShopifyCustomerAddress;
  addresses?: ShopifyCustomerAddress[];
  created_at: string;
  updated_at: string;
}

// ============ Shopify Webhook Types ============

export interface ShopifyOrder {
  id: number;
  admin_graphql_api_id: string;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
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
  // Shipping address for country tracking
  shipping_address?: {
    country?: string;
    country_code?: string;
    city?: string;
    province?: string;
    province_code?: string;
  };
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
  note?: string;
  refund_line_items: {
    line_item_id: number;
    line_item: ShopifyLineItem;
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
  revenue: number;        // NET revenue (grossRevenue - cancelledRevenue - refundTotal)
  grossRevenue: number;   // Total revenue before cancellations and refunds
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
  // Financial status
  paidOrders: number;
  pendingOrders: number;
  refundedOrders: number;
  partiallyRefundedOrders: number;
  // Fulfillment status
  fulfilledOrders: number;
  unfulfilledOrders: number;
  partiallyFulfilledOrders: number;
}

export interface ProductPeriodMetrics {
  productId: string;
  productTitle: string;
  revenue: number;
  unitsSold: number;
  unitsRefunded?: number;
  refundAmount?: number;
  netRevenue?: number;
  refundRate?: number;
}

export interface CustomerValueMetrics {
  customerId: string;
  email?: string;
  totalOrders: number;
  totalSpent: number;
  totalRefunded: number;
  netSpent: number;
  averageOrderValue: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
  isRepeatCustomer: boolean;
}

export interface HourlyTrendData {
  hour: number;
  orderCount: number;
  revenue: number;
  avgItems: number;
}

export interface DailyTrendData {
  date: string;
  dayOfWeek: string;
  orderCount: number;
  revenue: number;
  avgOrderValue: number;
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

// ============ Report Response Types ============

export interface SalesRevenueReport {
  period: { start: string; end: string };
  grossSales: number;
  netSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersCount: number;
  revenueGrowth: {
    weekOverWeek: number;
    monthOverMonth: number;
    yearOverYear: number;
  };
  dailyBreakdown: DailyTrendData[];
}

export interface RefundsCancellationsReport {
  period: { start: string; end: string };
  totalRefundedAmount: number;
  refundRate: number;
  refundCount: number;
  cancelledOrdersCount: number;
  cancelledRevenue: number;
  cancellationRate: number;
  refundsByReason: { reason: string; count: number; amount: number }[];
  cancellationsByReason: { reason: string; count: number; amount: number }[];
  dailyTrend: { date: string; refunds: number; cancellations: number }[];
}

export interface OrderStatusReport {
  period: { start: string; end: string };
  financialStatus: {
    paid: { count: number; revenue: number };
    pending: { count: number; revenue: number };
    refunded: { count: number; revenue: number };
    partiallyRefunded: { count: number; revenue: number };
  };
  fulfillmentStatus: {
    fulfilled: { count: number; revenue: number };
    unfulfilled: { count: number; revenue: number };
    partiallyFulfilled: { count: number; revenue: number };
  };
}

export interface OrderTrendsReport {
  period: { start: string; end: string };
  dailyTrends: DailyTrendData[];
  hourlyHeatmap: HourlyTrendData[];
  weekdayVsWeekend: {
    weekday: { avgOrders: number; avgRevenue: number };
    weekend: { avgOrders: number; avgRevenue: number };
  };
  peakHour: number;
  peakDay: string;
}

export interface ProductLifecycleReport {
  period: { start: string; end: string };
  neverSold: { productId: string; productTitle: string }[];
  decliningProducts: ProductPeriodMetrics[];
  highRefundProducts: ProductPeriodMetrics[];
  topPerformers: ProductPeriodMetrics[];
}

export interface CustomerGrowthReport {
  period: { start: string; end: string };
  newCustomersPerDay: { date: string; count: number }[];
  totalNewCustomers: number;
  totalReturningCustomers: number;
  growthRate: number;
}

export interface CustomerValueReport {
  lifetimeValue: {
    average: number;
    median: number;
    total: number;
  };
  averageSpendPerCustomer: number;
  topCustomers: CustomerValueMetrics[];
  oneTimeVsLoyal: {
    oneTime: { count: number; revenue: number };
    loyal: { count: number; revenue: number };
  };
  repeatPurchaseRate: number;
}
