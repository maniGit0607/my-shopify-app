import { useCallback } from 'react';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';

/**
 * Hook for fetching analytics insights from backend
 */
export function useInsightsFetch() {
  const authenticatedFetch = useAuthenticatedFetch();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

  /**
   * Generic fetch helper
   */
  const fetchEndpoint = useCallback(async (endpoint, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });

    const url = searchParams.toString() 
      ? `${BACKEND_URL}${endpoint}?${searchParams}` 
      : `${BACKEND_URL}${endpoint}`;

    try {
      const response = await authenticatedFetch(url, { method: 'GET' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[Insights] Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }, [authenticatedFetch, BACKEND_URL]);

  // ============ ORDER REPORTS ============

  /**
   * Get Sales & Revenue Report (Report #1)
   */
  const getSalesRevenue = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/orders/sales-revenue', { period, startDate, endDate });
  }, [fetchEndpoint]);

  /**
   * Get Refunds & Cancellations Report (Report #2)
   */
  const getRefundsCancellations = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/orders/refunds-cancellations', { period, startDate, endDate });
  }, [fetchEndpoint]);

  /**
   * Get Order Status Breakdown Report (Report #3)
   */
  const getOrderStatus = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/orders/status', { period, startDate, endDate });
  }, [fetchEndpoint]);

  /**
   * Get Time-based Order Trends Report (Report #4)
   */
  const getOrderTrends = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/orders/trends', { period, startDate, endDate });
  }, [fetchEndpoint]);

  // ============ PRODUCT REPORTS ============

  /**
   * Get Top Selling Products Report (Report #5)
   */
  const getTopProducts = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate, limit = 20, sortBy = 'revenue' } = options;
    return fetchEndpoint('/insights/products/top', { period, startDate, endDate, limit, sortBy });
  }, [fetchEndpoint]);

  /**
   * Get Product Performance Trends Report (Report #6)
   */
  const getProductTrends = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate, limit = 10 } = options;
    return fetchEndpoint('/insights/products/trends', { period, startDate, endDate, limit });
  }, [fetchEndpoint]);

  /**
   * Get Product Lifecycle Report (Report #8)
   */
  const getProductLifecycle = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate, refundThreshold = 10 } = options;
    return fetchEndpoint('/insights/products/lifecycle', { period, startDate, endDate, refundThreshold });
  }, [fetchEndpoint]);

  // ============ CUSTOMER REPORTS ============

  /**
   * Get Customer Growth Report (Report #9)
   */
  const getCustomerGrowth = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/customers/growth', { period, startDate, endDate });
  }, [fetchEndpoint]);

  /**
   * Get Repeat vs New Customers Report (Report #10)
   */
  const getCustomerRepeat = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/customers/repeat', { period, startDate, endDate });
  }, [fetchEndpoint]);

  /**
   * Get Customer Lifetime Value Report (Report #11)
   */
  const getCustomerValue = useCallback(async (options = {}) => {
    const { limit = 20 } = options;
    return fetchEndpoint('/insights/customers/value', { limit });
  }, [fetchEndpoint]);

  /**
   * Get Customer Geography Report (Report #12)
   */
  const getCustomerGeography = useCallback(async () => {
    return fetchEndpoint('/insights/customers/geography');
  }, [fetchEndpoint]);

  // ============ LEGACY ENDPOINTS ============

  /**
   * Get full analytics report with insights (legacy)
   */
  const getReport = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate, compare = true } = options;
    return fetchEndpoint('/insights/report', {
      period,
      startDate,
      endDate,
      compare: compare ? 'previous' : 'none',
    });
  }, [fetchEndpoint]);

  /**
   * Get daily metrics for charts
   */
  const getDailyMetrics = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/daily', { period, startDate, endDate });
  }, [fetchEndpoint]);

  /**
   * Get product performance (legacy)
   */
  const getProducts = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate, limit = 20 } = options;
    return fetchEndpoint('/insights/products', { period, startDate, endDate, limit });
  }, [fetchEndpoint]);

  /**
   * Get summary for dashboard
   */
  const getSummary = useCallback(async () => {
    return fetchEndpoint('/insights/summary');
  }, [fetchEndpoint]);

  /**
   * Get shop events
   */
  const getEvents = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    return fetchEndpoint('/insights/events', { period, startDate, endDate });
  }, [fetchEndpoint]);

  /**
   * Get order breakdown by type (legacy)
   */
  const getOrderBreakdown = useCallback(async (options = {}) => {
    const { type, startDate, endDate } = options;
    if (!type || !startDate || !endDate) {
      throw new Error('type, startDate, and endDate are required');
    }
    return fetchEndpoint('/insights/orders/breakdown', { type, startDate, endDate });
  }, [fetchEndpoint]);

  return {
    // Order Reports
    getSalesRevenue,
    getRefundsCancellations,
    getOrderStatus,
    getOrderTrends,
    // Product Reports
    getTopProducts,
    getProductTrends,
    getProductLifecycle,
    // Customer Reports
    getCustomerGrowth,
    getCustomerRepeat,
    getCustomerValue,
    getCustomerGeography,
    // Legacy endpoints
    getReport,
    getDailyMetrics,
    getProducts,
    getSummary,
    getEvents,
    getOrderBreakdown,
  };
}
