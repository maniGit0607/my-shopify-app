import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Spinner,
  Banner,
  Box,
  Divider,
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';

/**
 * Format date for display
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Chat message bubble component
 */
function ChatBubble({ message, isUser, timestamp }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-start' : 'flex-end',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
          backgroundColor: isUser ? '#f3f4f6' : '#008060',
          color: isUser ? '#1f2937' : 'white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <Text variant="bodyMd">{message}</Text>
        <div style={{ marginTop: '4px', textAlign: isUser ? 'left' : 'right' }}>
          <Text variant="bodySm" tone={isUser ? 'subdued' : undefined}>
            <span style={{ opacity: isUser ? 0.7 : 0.8, fontSize: '11px', color: isUser ? '#6b7280' : 'rgba(255,255,255,0.8)' }}>
              {timestamp}
            </span>
          </Text>
        </div>
      </div>
    </div>
  );
}

/**
 * Pending indicator for awaiting response
 */
function PendingIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '18px 18px 4px 18px',
          backgroundColor: '#fef3c7',
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <span style={{ animation: 'bounce 1s infinite', animationDelay: '0ms' }}>●</span>
          <span style={{ animation: 'bounce 1s infinite', animationDelay: '200ms' }}>●</span>
          <span style={{ animation: 'bounce 1s infinite', animationDelay: '400ms' }}>●</span>
        </div>
        <Text variant="bodySm">Awaiting response...</Text>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

export default function FeedbackContent() {
  const authenticatedFetch = useAuthenticatedFetch();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';
  
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(true);
  const [submitError, setSubmitError] = useState(null);
  
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch feedback history
  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError(null);

      const [historyRes, canSubmitRes] = await Promise.all([
        authenticatedFetch(`${BACKEND_URL}/feedback/user/history`),
        authenticatedFetch(`${BACKEND_URL}/feedback/user/can-submit`),
      ]);

      if (!historyRes.ok) throw new Error('Failed to fetch feedback history');
      if (!canSubmitRes.ok) throw new Error('Failed to check submit status');

      const historyData = await historyRes.json();
      const canSubmitData = await canSubmitRes.json();

      setFeedback(historyData.feedback || []);
      setCanSubmit(canSubmitData.canSubmit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [feedback]);

  // Submit new query
  const handleSubmit = async () => {
    if (!query.trim() || !canSubmit || submitting) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const response = await authenticatedFetch(`${BACKEND_URL}/feedback/user/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit query');
      }

      setQuery('');
      // Refresh feedback list
      await fetchFeedback();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <Box padding="800">
        <BlockStack align="center" gap="400">
          <Spinner size="large" />
          <Text tone="subdued">Loading feedback...</Text>
        </BlockStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding="400">
        <Banner tone="critical" title="Error loading feedback">
          <p>{error}</p>
        </Banner>
      </Box>
    );
  }

  return (
    <BlockStack gap="400">
      {/* Header */}
      <Card>
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text variant="headingMd" as="h2">💬 Feedback & Support</Text>
              <Text variant="bodySm" tone="subdued">
                Ask questions or share feedback. We'll respond as soon as possible.
              </Text>
            </BlockStack>
            <Button onClick={fetchFeedback} disabled={loading}>
              Refresh
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Chat Window */}
      <Card>
        <div
          style={{
            height: '400px',
            overflowY: 'auto',
            padding: '16px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
          }}
        >
          {feedback.length === 0 ? (
            <Box padding="800">
              <BlockStack align="center" gap="200">
                <Text variant="headingMd" tone="subdued">No conversations yet</Text>
                <Text tone="subdued">Send a message to start a conversation!</Text>
              </BlockStack>
            </Box>
          ) : (
            <BlockStack gap="0">
              {feedback.map((item) => (
                <React.Fragment key={item.id}>
                  {/* User query - left side */}
                  <ChatBubble
                    message={item.query}
                    isUser={true}
                    timestamp={formatDate(item.created_at)}
                  />
                  
                  {/* Admin reply - right side */}
                  {item.status === 'replied' && item.reply ? (
                    <ChatBubble
                      message={item.reply}
                      isUser={false}
                      timestamp={formatDate(item.replied_at)}
                    />
                  ) : (
                    <PendingIndicator />
                  )}
                </React.Fragment>
              ))}
              <div ref={chatEndRef} />
            </BlockStack>
          )}
        </div>
      </Card>

      {/* Input Area */}
      <Card>
        <BlockStack gap="300">
          {submitError && (
            <Banner tone="critical" onDismiss={() => setSubmitError(null)}>
              <p>{submitError}</p>
            </Banner>
          )}
          
          {!canSubmit && (
            <Banner tone="warning">
              <p>You have a pending query. Please wait for a response before submitting another.</p>
            </Banner>
          )}

          <InlineStack gap="300" blockAlign="end">
            <div style={{ flex: 1 }}>
              <TextField
                label="Your message"
                labelHidden
                placeholder={canSubmit ? "Type your question or feedback..." : "Waiting for response..."}
                value={query}
                onChange={setQuery}
                onKeyPress={handleKeyPress}
                multiline={2}
                disabled={!canSubmit || submitting}
                autoComplete="off"
              />
            </div>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit || !query.trim() || submitting}
              loading={submitting}
            >
              Send
            </Button>
          </InlineStack>
          
          <Text variant="bodySm" tone="subdued">
            Press Enter to send or click the Send button
          </Text>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

