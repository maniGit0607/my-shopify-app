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
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import SalesReportContent from "./reportContent/SalesReportContent";
import OrdersReportContent from "./reportContent/OrderReportContent";
import ProductReportContent from "./reportContent/ProductReportContent";
import CustomerReportContent from "./reportContent/CustomerReportContent";
import DisputeReportContent from "./reportContent/DisputeReportContent";

export default function Home() {
    const shopify = useAppBridge();

    // Tab handling
    const [selectedTab, setSelectedTab] = useState(0);
    const handleTabChange = useCallback((selectedTabIndex) => setSelectedTab(selectedTabIndex), []);
  
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
        render: <OrdersReportContent />,
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
        <div style={{ flex: '1' }}>
            <Card sectioned>
              {/* Tabs for Sync History */}
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
          </div>
          <div style={{ flex: '0 0 20%' }}>
          <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Saved Report Context
                </Text>
                <BlockStack gap="200">
                    <Link target="blank" removeUnderline>Total Sales August 2024</Link>
                    <Link target="blank" removeUnderline>Total Orders last 2 years</Link>
                    <Link target="blank" removeUnderline>Last 3 monthly sales</Link>
                    <Link target="blank" removeUnderline>Products sold by variants</Link>
                </BlockStack>
              </BlockStack>
            </Card>
          </div>
        </Layout>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ minHeight: '300px' }}>
                {/* Blank card content - visible for all tabs */}
              </div>
            </Card>
          </Layout.Section>
        </Layout>
    </Page>
    );
  }