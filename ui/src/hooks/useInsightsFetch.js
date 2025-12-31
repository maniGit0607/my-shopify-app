import { useCallback } from 'react';
import { useAuthenticatedFetch } from './useAuthenticatedFetch';

/**
 * Hook for fetching analytics insights from backend
 */
export function useInsightsFetch() {
  const authenticatedFetch = useAuthenticatedFetch();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

  /**
   * Get full analytics report with insights
   */
  const getReport = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate, compare = true } = options;
    
    const params = new URLSearchParams();
    params.set('period', period);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('compare', compare ? 'previous' : 'none');

    try {
      console.log('[Insights] Fetching report:', `${BACKEND_URL}/insights/report?${params}`);
      
      const response = await authenticatedFetch(`${BACKEND_URL}/insights/report?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Insights] Error response:', error);
        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Insights] Report received');
      return data;
    } catch (error) {
      console.error('[Insights] Failed to fetch report:', error);
      throw error;
    }
  }, [authenticatedFetch, BACKEND_URL]);

  /**
   * Get daily metrics for charts
   */
  const getDailyMetrics = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    
    const params = new URLSearchParams();
    params.set('period', period);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/insights/daily?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Insights] Failed to fetch daily metrics:', error);
      throw error;
    }
  }, [authenticatedFetch, BACKEND_URL]);

  /**
   * Get product performance
   */
  const getProducts = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate, limit = 20 } = options;
    
    const params = new URLSearchParams();
    params.set('period', period);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('limit', String(limit));

    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/insights/products?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Insights] Failed to fetch products:', error);
      throw error;
    }
  }, [authenticatedFetch, BACKEND_URL]);

  /**
   * Get summary for dashboard
   */
  const getSummary = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/insights/summary`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Insights] Failed to fetch summary:', error);
      throw error;
    }
  }, [authenticatedFetch, BACKEND_URL]);

  /**
   * Get shop events
   */
  const getEvents = useCallback(async (options = {}) => {
    const { period = 'last30days', startDate, endDate } = options;
    
    const params = new URLSearchParams();
    params.set('period', period);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/insights/events?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[Insights] Failed to fetch events:', error);
      throw error;
    }
  }, [authenticatedFetch, BACKEND_URL]);

  return {
    getReport,
    getDailyMetrics,
    getProducts,
    getSummary,
    getEvents,
  };
}

