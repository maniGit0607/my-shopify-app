import { Env, ShopifyOrder } from '../types';
import { MetricsService } from './metrics-service';
import { TokenExchange } from './token-exchange';

interface ReconciliationProgress {
  status: 'running' | 'completed' | 'failed';
  ordersProcessed: number;
  totalOrders: number;
  customersProcessed: number;
  currentPage: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

interface ShopifyCustomerEdge {
  node: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    numberOfOrders: string;
    amountSpent: {
      amount: string;
      currencyCode: string;
    };
    defaultAddress: {
      country: string;
      countryCodeV2: string;
    } | null;
    createdAt: string;
  };
  cursor: string;
}

interface CustomersQueryResponse {
  data: {
    customers: {
      edges: ShopifyCustomerEdge[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string;
      };
    };
  };
  errors?: { message: string }[];
}

interface ShopifyOrderEdge {
  node: {
    id: string;
    name: string;
    createdAt: string;
    cancelledAt: string | null;
    cancelReason: string | null;
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
    totalRefundedSet: {
      shopMoney: {
        amount: string;
      };
    };
    shippingAddress: {
      country: string | null;
      countryCodeV2: string | null;
    } | null;
    customer: {
      id: string;
      email: string;
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
    refunds: {
      id: string;
      createdAt: string;
      note: string | null;
      refundLineItems: {
        edges: {
          node: {
            lineItem: {
              id: string;
              product: {
                id: string;
              } | null;
            };
            quantity: number;
            subtotalSet: {
              shopMoney: {
                amount: string;
              };
            };
          };
        }[];
      };
    }[];
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
      customersProcessed: 0,
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

      console.log(`[Reconciliation] Orders completed. Starting customer reconciliation...`);

      // Now reconcile customers for geography data
      let customerHasNextPage = true;
      let customerCursor: string | null = null;

      while (customerHasNextPage) {
        const customerResponse = await this.fetchCustomersPage(shop, accessToken, customerCursor);
        
        if (customerResponse.errors) {
          console.error('[Reconciliation] Customer fetch error:', customerResponse.errors[0].message);
          // Don't fail entire reconciliation if customers fail, just log and continue
          break;
        }

        // Check for valid response structure
        if (!customerResponse.data?.customers?.edges) {
          console.error('[Reconciliation] Invalid customer response structure:', JSON.stringify(customerResponse));
          break;
        }

        const { edges, pageInfo } = customerResponse.data.customers;
        
        // Process each customer
        for (const edge of edges) {
          await this.processCustomer(shop, edge.node);
          progress.customersProcessed++;
        }

        customerHasNextPage = pageInfo.hasNextPage;
        customerCursor = pageInfo.endCursor;

        console.log(`[Reconciliation] Processed customers: ${progress.customersProcessed}`);
        
        // Small delay to avoid rate limits
        if (customerHasNextPage) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      progress.status = 'completed';
      progress.completedAt = new Date().toISOString();
      progress.totalOrders = progress.ordersProcessed;

      console.log(`[Reconciliation] Completed! Orders: ${progress.ordersProcessed}, Customers: ${progress.customersProcessed}`);

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
    await db.prepare('DELETE FROM hourly_order_metrics WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM customer_lifetime WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM refund_details WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM cancellation_details WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM shop_events WHERE shop = ?').bind(shop).run();
    await db.prepare('DELETE FROM customer_geography WHERE shop = ?').bind(shop).run();
    
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
              cancelReason
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
              totalRefundedSet {
                shopMoney {
                  amount
                }
              }
              shippingAddress {
                country
                countryCodeV2
              }
              customer {
                id
                email
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
              refunds {
                id
                createdAt
                note
                refundLineItems(first: 50) {
                  edges {
                    node {
                      lineItem {
                        id
                        product {
                          id
                        }
                      }
                      quantity
                      subtotalSet {
                        shopMoney {
                          amount
                        }
                      }
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
    const hour = new Date(order.createdAt).getHours();
    const revenue = parseFloat(order.totalPriceSet.shopMoney.amount);
    const discounts = parseFloat(order.totalDiscountsSet.shopMoney.amount);
    const hasDiscount = discounts > 0;
    const totalRefunded = parseFloat(order.totalRefundedSet?.shopMoney?.amount || '0');
    
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

    // Parse financial status
    const financialStatus = order.displayFinancialStatus?.toLowerCase() || 'pending';
    const isPaid = financialStatus === 'paid' || financialStatus === 'partially_paid';
    const isPending = financialStatus === 'pending' || financialStatus === 'authorized';
    const isRefunded = financialStatus === 'refunded';
    const isPartiallyRefunded = financialStatus === 'partially_refunded';

    // Parse fulfillment status
    const fulfillmentStatus = order.displayFulfillmentStatus?.toLowerCase() || 'unfulfilled';
    const isFulfilled = fulfillmentStatus === 'fulfilled';
    const isUnfulfilled = fulfillmentStatus === 'unfulfilled' || fulfillmentStatus === null;
    const isPartiallyFulfilled = fulfillmentStatus === 'partially_fulfilled' || fulfillmentStatus === 'partial';

    // Update daily metrics
    // Always add to gross revenue (even if cancelled) - net revenue is calculated as:
    // net = gross - cancelledRevenue - refunds
    await this.metricsService.incrementDailyMetrics(shop, date, {
      revenue: revenue,  // Always add to gross
      orders: 1,
      newCustomerOrders: isNewCustomer ? 1 : 0,
      returningCustomerOrders: isNewCustomer ? 0 : 1,
      itemsSold,
      discounts,
      ordersWithDiscount: hasDiscount ? 1 : 0,
      cancelledOrders: isCancelled ? 1 : 0,
      cancelledRevenue: isCancelled ? revenue : 0,
      refunds: totalRefunded,
      refundCount: order.refunds?.length || 0,
      // Financial status
      paidOrders: isPaid && !isCancelled ? 1 : 0,
      pendingOrders: isPending && !isCancelled ? 1 : 0,
      refundedOrders: isRefunded ? 1 : 0,
      partiallyRefundedOrders: isPartiallyRefunded ? 1 : 0,
      // Fulfillment status
      fulfilledOrders: isFulfilled && !isCancelled ? 1 : 0,
      unfulfilledOrders: isUnfulfilled && !isCancelled ? 1 : 0,
      partiallyFulfilledOrders: isPartiallyFulfilled && !isCancelled ? 1 : 0,
    });

    // Update hourly metrics
    await this.metricsService.incrementHourlyMetrics(shop, date, hour, {
      orderCount: 1,
      revenue,
      itemsSold,
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

    // Process refunds and update product refund metrics
    if (order.refunds && order.refunds.length > 0) {
      for (const refund of order.refunds) {
        const refundDate = refund.createdAt.split('T')[0];
        const refundId = refund.id.split('/').pop() || refund.id;
        const orderId = order.id.split('/').pop() || order.id;
        
        // Calculate refund amount from line items
        let refundAmount = 0;
        for (const refundLineItem of refund.refundLineItems?.edges || []) {
          const rli = refundLineItem.node;
          refundAmount += parseFloat(rli.subtotalSet?.shopMoney?.amount || '0');
          
          // Update product refund metrics
          const productId = rli.lineItem?.product?.id?.split('/').pop() || 'unknown';
          if (productId !== 'unknown') {
            await this.metricsService.incrementProductMetrics(
              shop,
              date, // Use order date for product metrics
              productId,
              '', // Title not available in refund
              'default',
              'Default',
              {
                unitsRefunded: rli.quantity,
                refundAmount: parseFloat(rli.subtotalSet?.shopMoney?.amount || '0'),
              }
            );
          }
        }

        // Record refund details
        await this.metricsService.recordRefundDetails({
          shop,
          date: refundDate,
          refund_id: refundId,
          order_id: orderId,
          amount: refundAmount,
          reason: undefined, // Reason not in basic refund data
          note: refund.note || undefined,
        });
      }
    }

    // Record cancellation details if cancelled
    if (isCancelled && order.cancelledAt) {
      const cancellationDate = order.cancelledAt.split('T')[0];
      const orderId = order.id.split('/').pop() || order.id;
      
      await this.metricsService.recordCancellationDetails({
        shop,
        date, // Order creation date
        cancellation_date: cancellationDate,
        order_id: orderId,
        amount: revenue,
        reason: order.cancelReason || undefined,
      });
    }

    // Update customer metrics
    await this.metricsService.incrementCustomerMetrics(shop, date, {
      newCustomers: isNewCustomer ? 1 : 0,
      returningCustomers: isNewCustomer ? 0 : 1,
    });

    // Update customer lifetime value
    if (order.customer) {
      const customerId = order.customer.id.split('/').pop() || order.customer.id;
      await this.metricsService.upsertCustomerLifetime(shop, customerId, {
        email: order.customer.email,
        orderDate: date,
        orderAmount: revenue,
        refundAmount: totalRefunded,
      });
    }

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

    // Fulfillment status breakdown
    await this.metricsService.incrementOrderBreakdown(shop, date, 'fulfillment_status', fulfillmentStatus, {
      orderCount: 1,
      revenue,
    });

    // Financial status breakdown
    await this.metricsService.incrementOrderBreakdown(shop, date, 'financial_status', financialStatus, {
      orderCount: 1,
      revenue,
    });

    // Discount breakdown
    const discountStatus = hasDiscount ? 'with_discount' : 'without_discount';
    await this.metricsService.incrementOrderBreakdown(shop, date, 'discount', discountStatus, {
      orderCount: 1,
      revenue,
    });

    // Country breakdown (based on shipping address)
    const shippingCountry = order.shippingAddress?.country || 'Unknown';
    await this.metricsService.incrementOrderBreakdown(shop, date, 'country', shippingCountry, {
      orderCount: 1,
      revenue,
    });
  }

  /**
   * Fetch a page of customers from Shopify GraphQL API
   */
  private async fetchCustomersPage(
    shop: string,
    accessToken: string,
    cursor: string | null
  ): Promise<CustomersQueryResponse> {
    const query = `
      query GetCustomers($cursor: String) {
        customers(first: 250, after: $cursor) {
          edges {
            node {
              id
              email
              firstName
              lastName
              numberOfOrders
              amountSpent {
                amount
                currencyCode
              }
              defaultAddress {
                country
                countryCodeV2
              }
              createdAt
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

    const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables: { cursor },
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Process a single customer and aggregate geography data
   */
  private async processCustomer(shop: string, customer: ShopifyCustomerEdge['node']): Promise<void> {
    const country = customer.defaultAddress?.country || 'Unknown';
    const countryCode = customer.defaultAddress?.countryCodeV2 || null;
    const totalSpent = parseFloat(customer.amountSpent?.amount || '0') || 0;
    const ordersCount = parseInt(customer.numberOfOrders) || 0;

    // Aggregate into customer geography
    await this.metricsService.upsertCustomerGeography(shop, country, countryCode, {
      customerCount: 1,
      totalSpent,
      totalOrders: ordersCount,
    });
  }
}
