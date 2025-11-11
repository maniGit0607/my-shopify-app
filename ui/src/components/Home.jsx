import { useState, useCallback, useEffect } from "react";
import {
  Page,
  Layout,
  TextField,
  Tabs,
  Card,
  InlineStack,
  BlockStack,
  Link,
  List,
  Text,
  LegacyCard
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import SalesReportContent from "./reportContent/SalesReportContent";
import OrdersReportContent from "./reportContent/OrderReportContent";
import ProductReportContent from "./reportContent/ProductReportContent";
import CustomerReportContent from "./reportContent/CustomerReportContent";
import DisputeReportContent from "./reportContent/DisputeReportContent";
import OrdersPieChart from "./charts/OrdersPieChart";

export default function Home() {
    // With App Bridge v4 CDN, we don't need useAppBridge hook anymore

    // Tab handling
    const [selectedTab, setSelectedTab] = useState(0);
    const handleTabChange = useCallback((selectedTabIndex) => setSelectedTab(selectedTabIndex), []);

    // Order filters state
    const today = new Date();
    const [orderFilters, setOrderFilters] = useState({
      reportType: 'ordersOverTime',
      interval: 'daily',
      dateRange: {
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 364),
        end: today,
      },
    });

    const handleOrderFilterChange = useCallback((filters) => {
      setOrderFilters(filters);
    }, []);
  
    /*useEffect(() => {
      const graphCall = async () => {
        const res = await fetch('shopify:admin/api/graphql.json', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query GetProduct($id: ID!) {
              product(id: $id) {
                title
              }
            }
          `,
          variables: {id: 'gid://shopify/Product/9759643861308'},
        }),
      });
      
      const data = await res.json();
      setUrl(JSON.stringify(data, null, 2))
    }
    graphCall()
    }, []); */
  
    const tabs = [
      {
        id: 'Orders',
        content: 'Orders Reports',
        render: <OrdersReportContent onFilterChange={handleOrderFilterChange} />,
        accessibilityLabel: 'Orders Reports',
        panelID: 'orders-report-content',
      },
      {
        id: 'Sales',
        content: 'Sales Reports',
        render: <SalesReportContent />,
        accessibilityLabel: 'Sales Reports',
        panelID: 'sales-report-content',
      },
      {
        id: 'Customers',
        content: 'Customers Reports',
        render: <CustomerReportContent />,
        accessibilityLabel: 'Customers Reports',
        panelID: 'customers-report-content',
      },
      {
        id: 'Products',
        content: 'Products Reports',
        render: <ProductReportContent />,
        accessibilityLabel: 'Products Reports',
        panelID: 'products-report-content',
      },
      {
        id: 'Disputes',
        content: 'Disputes Reports',
        render: <DisputeReportContent />,
        accessibilityLabel: 'Disputes Reports',
        panelID: 'disputes-report-content',
      },
    ];
  
    return (
      <Page fullWidth>
        <TitleBar title="Visualize your business" />
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card sectioned>
                {/* Tabs for Reports */}
                <Tabs
                  tabs={tabs}
                  selected={selectedTab}
                  onSelect={handleTabChange}
                >
                  <Card title={tabs[selectedTab].content}>
                    {tabs[selectedTab].render}
                  </Card>
                </Tabs>
              </Card>
              
              <Card>
                <div style={{ minHeight: '400px', padding: '16px' }}>
                  {selectedTab === 0 && <OrdersPieChart filters={orderFilters} />}
                  {selectedTab !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Text variant="headingMd" as="h3" tone="subdued">
                        Chart visualization will appear here
                      </Text>
                    </div>
                  )}
                </div>
              </Card>
            </BlockStack>
          </Layout.Section>
          
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Saved Reports
                </Text>
                <BlockStack gap="200">
                  <Link target="blank" removeUnderline>Total Sales August 2024</Link>
                  <Link target="blank" removeUnderline>Total Orders last 2 years</Link>
                  <Link target="blank" removeUnderline>Last 3 monthly sales</Link>
                  <Link target="blank" removeUnderline>Products sold by variants</Link>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }