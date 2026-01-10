import React, { useState, useEffect, useCallback } from 'react';
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Banner,
  Spinner,
  Box,
  Badge,
  Divider,
  Icon,
} from '@shopify/polaris';
import { CheckIcon } from '@shopify/polaris-icons';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';

/**
 * SubscriptionGate component
 * Wraps the app and only shows children if user has active subscription/trial
 */
export default function SubscriptionGate({ children }) {
  const authenticatedFetch = useAuthenticatedFetch();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch(`${BACKEND_URL}/billing/status`);
      
      if (!response.ok) {
        throw new Error('Failed to check subscription status');
      }

      const data = await response.json();
      setSubscriptionStatus(data);
    } catch (err) {
      console.error('[Subscription] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authenticatedFetch, BACKEND_URL]);

  useEffect(() => {
    checkSubscription();
    
    // Check URL params for subscription callback
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionParam = urlParams.get('subscription');
    
    if (subscriptionParam === 'active') {
      // Clear the URL param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  // Start free trial
  const handleStartTrial = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await authenticatedFetch(`${BACKEND_URL}/billing/start-trial`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to start trial');
      }

      // Refresh status
      await checkSubscription();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Subscribe (redirects to Shopify)
  const handleSubscribe = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await authenticatedFetch(`${BACKEND_URL}/billing/subscribe`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      // Redirect to Shopify confirmation page
      if (data.confirmationUrl) {
        window.top.location.href = data.confirmationUrl;
      }
    } catch (err) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Page>
        <Box padding="800">
          <BlockStack align="center" gap="400">
            <Spinner size="large" />
            <Text tone="subdued">Checking subscription status...</Text>
          </BlockStack>
        </Box>
      </Page>
    );
  }

  // Error state
  if (error && !subscriptionStatus) {
    return (
      <Page>
        <Box padding="400">
          <Banner tone="critical" title="Error">
            <p>{error}</p>
            <Box paddingBlockStart="200">
              <Button onClick={checkSubscription}>Retry</Button>
            </Box>
          </Banner>
        </Box>
      </Page>
    );
  }

  // User can access app - show children
  if (subscriptionStatus?.canAccessApp) {
    return (
      <>
        {/* Show trial banner if on trial */}
        {subscriptionStatus.status === 'trial' && (
          <div style={{ padding: '0 16px' }}>
            <Banner tone="warning">
              <InlineStack align="space-between" blockAlign="center" wrap={false}>
                <Text>
                  🎉 Trial active - <strong>{subscriptionStatus.daysRemaining} day{subscriptionStatus.daysRemaining !== 1 ? 's' : ''}</strong> remaining
                </Text>
                <Button size="slim" onClick={handleSubscribe} loading={actionLoading}>
                  Subscribe Now - ${subscriptionStatus.plan?.price}/month
                </Button>
              </InlineStack>
            </Banner>
          </div>
        )}
        {children}
      </>
    );
  }

  // User needs to subscribe or start trial - show subscription page
  return (
    <Page>
      <div style={{ 
        maxWidth: '600px', 
        margin: '40px auto',
        padding: '0 20px',
      }}>
        <BlockStack gap="600">
          {/* Header */}
          <BlockStack gap="200" align="center">
            <Text variant="heading2xl" as="h1" alignment="center">
              🚀 Unlock Your Analytics
            </Text>
            <Text variant="bodyLg" tone="subdued" alignment="center">
              Get powerful insights to grow your Shopify store
            </Text>
          </BlockStack>

          {error && (
            <Banner tone="critical" onDismiss={() => setError(null)}>
              <p>{error}</p>
            </Banner>
          )}

          {/* Pricing Card */}
          <Card>
            <BlockStack gap="400">
              {/* Plan Header */}
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <Badge tone="success">Most Popular</Badge>
              </div>
              
              <BlockStack gap="200" align="center">
                <Text variant="headingLg" as="h2">Pro Plan</Text>
                <InlineStack gap="100" align="center" blockAlign="baseline">
                  <Text variant="heading3xl" as="span" fontWeight="bold">$5</Text>
                  <Text variant="bodyLg" tone="subdued">/month</Text>
                </InlineStack>
                <Text variant="bodySm" tone="subdued">
                  Cancel anytime
                </Text>
              </BlockStack>

              <Divider />

              {/* Features */}
              <BlockStack gap="300">
                <Text variant="headingSm" as="h3">Everything you need:</Text>
                {[
                  'Real-time sales & revenue analytics',
                  'Order, product & customer reports',
                  'Historical data reconciliation',
                  'Beautiful charts & visualizations',
                  'Growth insights & recommendations',
                  'Export reports (coming soon)',
                ].map((feature, index) => (
                  <InlineStack key={index} gap="200" blockAlign="center">
                    <div style={{ color: '#008060' }}>
                      <Icon source={CheckIcon} />
                    </div>
                    <Text variant="bodyMd">{feature}</Text>
                  </InlineStack>
                ))}
              </BlockStack>

              <Divider />

              {/* CTA Buttons */}
              <BlockStack gap="300">
                {subscriptionStatus?.status === 'none' && (
                  <>
                    <Button
                      variant="primary"
                      size="large"
                      fullWidth
                      onClick={handleStartTrial}
                      loading={actionLoading}
                    >
                      Start 3-Day Free Trial
                    </Button>
                    <Text variant="bodySm" tone="subdued" alignment="center">
                      No credit card required for trial
                    </Text>
                  </>
                )}

                {(subscriptionStatus?.status === 'trial_expired' || 
                  subscriptionStatus?.status === 'cancelled' ||
                  subscriptionStatus?.status === 'expired') && (
                  <>
                    <Banner tone="warning">
                      <p>
                        {subscriptionStatus.status === 'trial_expired' 
                          ? 'Your free trial has ended. Subscribe to continue using the app.'
                          : 'Your subscription has ended. Resubscribe to regain access.'}
                      </p>
                    </Banner>
                    <Button
                      variant="primary"
                      size="large"
                      fullWidth
                      onClick={handleSubscribe}
                      loading={actionLoading}
                    >
                      Subscribe Now - $5/month
                    </Button>
                  </>
                )}

                {subscriptionStatus?.status === 'pending' && (
                  <Banner tone="info">
                    <p>Your subscription is pending confirmation. Please complete the payment in Shopify.</p>
                    <Box paddingBlockStart="200">
                      <Button onClick={handleSubscribe} loading={actionLoading}>
                        Complete Subscription
                      </Button>
                    </Box>
                  </Banner>
                )}
              </BlockStack>
            </BlockStack>
          </Card>

          {/* Trust Badges */}
          <BlockStack gap="200" align="center">
            <InlineStack gap="400" align="center">
              <Text variant="bodySm" tone="subdued">🔒 Secure Payment</Text>
              <Text variant="bodySm" tone="subdued">💳 Billed through Shopify</Text>
              <Text variant="bodySm" tone="subdued">❌ Cancel Anytime</Text>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </div>
    </Page>
  );
}

