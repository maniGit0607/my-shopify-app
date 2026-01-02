import { Env, ShopifyOrder } from '../types';
import { MetricsService } from './metrics-service';
import { TokenExchange } from './token-exchange';

interface ReconciliationProgress {
  status: 'running' | 'completed' | 'failed';
  ordersProcessed: number;
  totalOrders: number;
  currentPage: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

interface ShopifyOrderEdge {
  node: {
    id: string;
    name: string;
    createdAt: string;
    cancelledAt: string | null;
    displayFinancialStatus: string;
    displayFulfillmentStatus: string | null;
    totalPriceSet: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
    totalDiscountsSet: {
      shopMoney: {
        amount: string;
      };
    };
    customer: {
      id: string;
      numberOfOrders: number;
    } | null;
    lineItems: {
      edges: {
        node: {
          id: string;
          title: string;
          quantity: number;
          originalUnitPriceSet: {
            shopMoney: {
              amount: string;
            };
          };
          totalDiscountSet: {
            shopMoney: {
              amount: string;
            };
          };
          product: {
            id: string;
          } | null;
          variant: {
            id: string;
            title: string;
          } | null;
        };
      }[];
    };
    sourceName: string | null;
    paymentGatewayNames: string[];
  };
  cursor: string;
}

interface OrdersQueryResponse {
  data: {
    orders: {
      edges: ShopifyOrderEdge[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
    };
  };
  errors?: { message: string }[];
}

/**
 * Service for reconciling historical order data from Shopify
 */
export class ReconciliationService {
  private env: Env;
  private metricsService: MetricsService;

  constructor(env: Env) {
    this.env = env;
    this.metricsService = new MetricsService(env);
  }

  /**
   * Reconcile all orders for the last 3 years
   */
  async reconcileOrders(
    shop: string,
    accessToken: string,
    onProgress?: (progress: ReconciliationProgress) => void
  ): Promise<ReconciliationProgress> {
    const progress: ReconciliationProgress = {
      status: 'running',
      ordersProcessed: 0,
      totalOrders: 0,
      currentPage: 0,
      startedAt: new Date().toISOString(),
    };

    try {
      // Calculate date 3 years ago
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const startDate = threeYearsAgo.toISOString().split('T')[0];

      console.log(`[Reconciliation] Starting for shop ${shop} from ${startDate}`);

      // Clear existing metrics before rebuilding - ensures idempotency
      await this.clearExistingMetrics(shop);

      let hasNextPage = true;
      let cursor: string | null = null;

      while (hasNextPage) {
        progress.currentPage++;
        
        // Fetch orders page
        const response = await this.fetchOrdersPage(shop, accessToken, startDate, cursor);
        
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        const { edges, pageInfo } = response.data.orders;
        
        // Process each order
        for (const edge of edges) {
          await this.processOrder(shop, edge.node);
          progress.ordersProcessed++;
        }

        hasNextPage = pageInfo.hasNextPage;
        cursor = pageInfo.endCursor;

        console.log(`[Reconciliation] Processed page ${progress.currentPage}, orders: ${progress.ordersProcessed}`);
        
        if (onProgress) {
          onProgress({ ...progress });
        }

        // Small delay to avoid rate limits
        if (hasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.totalOrders = progress.ordersProcessed;

      console.log(`[Reconciliation] Completed! Total orders processed: ${progress.ordersProcessed}`);

      return progress;

    } catch (error) {
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      progress.completedAt = new Date().toISOString();
      
      console.error('[Reconciliation] Failed:', error);
      
      return progress;
    }
  }

  /**
   * Clear all existing metrics for a shop before reconciliation
   * This ensures idempotency - running reconciliation multiple times produces the same result
   */
  private async clearExistingMetrics(shop: string): Promise<void> {
    console.log(`[Reconciliation] Clearing existing metrics for shop: ${shop}`);
    
    const db = this.env.ANALYTICS_DB;
    
    // Clear all metric tables for this shop
    await db.prepare('DELETE FROM daily_metrics WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM daily_product_metrics WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM daily_customer_metrics WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM daily_order_breakdown WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM shop_events WHERE shop = ?').bind(shop).run();
    
    console.log(`[Reconciliation] Cleared all existing metrics for shop: ${shop}`);
  }

  /**
   * Fetch a page of orders from Shopify GraphQL API
   */
  private async fetchOrdersPage(
    shop: string,
    accessToken: string,
    startDate: string,
    cursor: string | null
  ): Promise<OrdersQueryResponse> {
    const query = `
      query GetOrders($cursor: String, $query: String!) {
        orders(first: 100, after: $cursor, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              cancelledAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalDiscountsSet {
                shopMoney {
                  amount
                }
              }
              customer {
                id
                numberOfOrders
              }
              lineItems(first: 50) {
                edges {
                  node {
                    id
                    title
                    quantity
                    originalUnitPriceSet {
                      shopMoney {
                        amount
                      }
                    }
                    totalDiscountSet {
                      shopMoney {
                        amount
                      }
                    }
                    product {
                      id
                    }
                    variant {
                      id
                      title
                    }
                  }
                }
              }
              sourceName
              paymentGatewayNames
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables: {
          cursor,
          query: `created_at:>='${startDate}'`,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Process a single order and update metrics
   */
  private async processOrder(shop: string, order: ShopifyOrderEdge['node']): Promise<void> {
    const date = order.createdAt.split('T')[0];
    const revenue = parseFloat(order.totalPriceSet.shopMoney.amount);
    const discounts = parseFloat(order.totalDiscountsSet.shopMoney.amount);
    const hasDiscount = discounts > 0;
    
    // Calculate items sold
    const itemsSold = order.lineItems.edges.reduce(
      (sum, edge) => sum + edge.node.quantity,
      0
    );

    // Determine if new or returning customer
    const isNewCustomer = order.customer 
      ? order.customer.numberOfOrders <= 1 
      : true;

    // Check if order was cancelled
    const isCancelled = order.cancelledAt !== null;

    // Update daily metrics
    await this.metricsService.incrementDailyMetrics(shop, date, {
      revenue: isCancelled ? 0 : revenue,
      orders: 1,
      newCustomerOrders: isNewCustomer ? 1 : 0,
      returningCustomerOrders: isNewCustomer ? 0 : 1,
      itemsSold,
      discounts,
      ordersWithDiscount: hasDiscount ? 1 : 0,
      cancelledOrders: isCancelled ? 1 : 0,
      cancelledRevenue: isCancelled ? revenue : 0,
    });

    // Update product metrics
    for (const lineItem of order.lineItems.edges) {
      const item = lineItem.node;
      const productId = item.product?.id?.split('/').pop() || 'unknown';
      const variantId = item.variant?.id?.split('/').pop() || 'default';
      
      await this.metricsService.incrementProductMetrics(
        shop,
        date,
        productId,
        item.title,
        variantId,
        item.variant?.title || 'Default',
        {
          unitsSold: item.quantity,
          revenue: parseFloat(item.originalUnitPriceSet.shopMoney.amount) * item.quantity,
          discountAmount: parseFloat(item.totalDiscountSet.shopMoney.amount),
        }
      );
    }

    // Update customer metrics
    await this.metricsService.incrementCustomerMetrics(shop, date, {
      newCustomers: isNewCustomer ? 1 : 0,
      returningCustomers: isNewCustomer ? 0 : 1,
    });

    // Update order breakdown metrics
    // Channel breakdown
    const channel = order.sourceName || 'unknown';
    await this.metricsService.incrementOrderBreakdown(shop, date, 'channel', channel, {
      orderCount: 1,
      revenue,
    });

    // Payment method breakdown
    const paymentMethod = order.paymentGatewayNames?.[0] || 'unknown';
    await this.metricsService.incrementOrderBreakdown(shop, date, 'payment_method', paymentMethod, {
      orderCount: 1,
      revenue,
    });

    // Status breakdown
    const status = order.displayFulfillmentStatus || 'UNFULFILLED';
    await this.metricsService.incrementOrderBreakdown(shop, date, 'status', status.toLowerCase(), {
      orderCount: 1,
      revenue,
    });

    // Discount breakdown
    const discountStatus = hasDiscount ? 'with_discount' : 'without_discount';
    await this.metricsService.incrementOrderBreakdown(shop, date, 'discount', discountStatus, {
      orderCount: 1,
      revenue,
    });
  }
}

