import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Tabs,
  Card,
  InlineStack,
  BlockStack,
  Text,
  Button,
  Banner,
  Spinner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import OrdersReportContent from "./reportContent/OrderReportContent";
import ProductReportContent from "./reportContent/ProductReportContent";
import CustomerReportContent from "./reportContent/CustomerReportContent";
import SalesInsightsContent from "./reportContent/SalesInsightsContent";
import FeedbackContent from "./reportContent/FeedbackContent";
import { useAuthenticatedFetch } from "../hooks/useAuthenticatedFetch";

export default function Home() {
    const authenticatedFetch = useAuthenticatedFetch();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

    // Tab handling
    const [selectedTab, setSelectedTab] = useState(0);
    const handleTabChange = useCallback((selectedTabIndex) => setSelectedTab(selectedTabIndex), []);

    // Reconciliation state
    const [reconciling, setReconciling] = useState(false);
    const [reconcileResult, setReconcileResult] = useState(null);
    const [reconcileError, setReconcileError] = useState(null);

  
    const tabs = [
      {
        id: 'Insights',
        content: '📊 Sales & Growth',
        accessibilityLabel: 'Sales and Growth Insights',
        panelID: 'sales-insights-content',
      },
      {
        id: 'Orders',
        content: 'Orders Reports',
        accessibilityLabel: 'Orders Reports',
        panelID: 'orders-report-content',
      },
      {
        id: 'Customers',
        content: 'Customers Reports',
        accessibilityLabel: 'Customers Reports',
        panelID: 'customers-report-content',
      },
      {
        id: 'Products',
        content: 'Products Reports',
        accessibilityLabel: 'Products Reports',
        panelID: 'products-report-content',
      },
      {
        id: 'Feedback',
        content: '💬 Feedback',
        accessibilityLabel: 'Feedback and Support',
        panelID: 'feedback-content',
      },
    ];

    // Render tab content with key to force remount on tab change
    const renderTabContent = () => {
      switch (selectedTab) {
        case 0:
          return <SalesInsightsContent key="sales-insights" />;
        case 1:
          return <OrdersReportContent key="orders-report" />;
        case 2:
          return <CustomerReportContent key="customers-report" />;
        case 3:
          return <ProductReportContent key="products-report" />;
        case 4:
          return <FeedbackContent key="feedback" />;
        default:
          return <SalesInsightsContent key="sales-insights" />;
      }
    };

    // Reconciliation function - fetches last 3 years of orders and populates metrics
    const handleReconciliation = async () => {
      setReconciling(true);
      setReconcileResult(null);
      setReconcileError(null);

      try {
        console.log('[Reconciliation] Starting...');
        
        const response = await authenticatedFetch(`${BACKEND_URL}/api/reconcile`, {
          method: 'POST',
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || data.details || 'Reconciliation failed');
        }

        console.log('[Reconciliation] Completed:', data);
        setReconcileResult(data);
        
      } catch (err) {
        console.error('[Reconciliation] Error:', err);
        setReconcileError(err.message || 'Failed to reconcile data');
      } finally {
        setReconciling(false);
      }
    };
  
    return (
      <Page fullWidth>
        <TitleBar title="Visualize your business" />

        {/* Reconciliation Banner */}
        <div style={{ padding: '16px' }}>
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h3">📊 Data Reconciliation</Text>
                  <Text variant="bodySm" tone="subdued">
                    Import your historical order data from the last 3 years to populate analytics.
                  </Text>
                </BlockStack>
                <Button
                  onClick={handleReconciliation}
                  loading={reconciling}
                  disabled={reconciling}
                  variant="primary"
                >
                  {reconciling ? 'Reconciling...' : 'Run Reconciliation'}
                </Button>
              </InlineStack>

              {reconciling && (
                <InlineStack gap="200" align="center">
                  <Spinner size="small" />
                  <Text tone="subdued">
                    Fetching and processing orders... This may take a few minutes for large stores.
                  </Text>
                </InlineStack>
              )}

              {reconcileResult && (
                <Banner tone="success" title="Reconciliation Complete">
                  <p>
                    Successfully processed <strong>{reconcileResult.ordersProcessed}</strong> orders 
                    across <strong>{reconcileResult.pagesProcessed}</strong> pages.
                  </p>
                  <p style={{ fontSize: '12px', marginTop: '4px', color: '#666' }}>
                    Started: {new Date(reconcileResult.startedAt).toLocaleString()} | 
                    Completed: {new Date(reconcileResult.completedAt).toLocaleString()}
                  </p>
                </Banner>
              )}

              {reconcileError && (
                <Banner tone="critical" title="Reconciliation Failed">
                  <p>{reconcileError}</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </div>

        <Layout>
          <Layout.Section>
            <Card sectioned>
              {/* Tabs for Reports */}
              <Tabs
                tabs={tabs}
                selected={selectedTab}
                onSelect={handleTabChange}
              >
                <Card title={tabs[selectedTab].content}>
                  {renderTabContent()}
                </Card>
              </Tabs>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }