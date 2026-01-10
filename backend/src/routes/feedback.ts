import { Hono } from 'hono';
import { Env } from '../types';
import { validateSessionToken, getShop } from '../middleware/session-token';

const feedback = new Hono<{ Bindings: Env }>();

/**
 * GET /feedback/admin
 * Serve the admin feedback management page
 */
feedback.get('/admin', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); min-height: 100vh; color: #e4e4e7; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: #fbbf24; margin-bottom: 8px; font-size: 28px; }
    .subtitle { color: #9ca3af; margin-bottom: 24px; }
    .auth-form { background: rgba(255,255,255,0.05); padding: 24px; border-radius: 12px; margin-bottom: 24px; display: flex; gap: 12px; align-items: end; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 200px; }
    label { display: block; margin-bottom: 6px; font-size: 14px; color: #9ca3af; }
    input[type="text"], input[type="password"], textarea { width: 100%; padding: 12px; border: 1px solid #374151; border-radius: 8px; background: #1f2937; color: #e4e4e7; font-size: 14px; }
    input:focus, textarea:focus { outline: none; border-color: #fbbf24; }
    button { padding: 12px 24px; background: #fbbf24; color: #1a1a2e; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    button:hover { background: #f59e0b; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .shop-list { display: flex; flex-direction: column; gap: 12px; }
    .shop-item { background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; }
    .shop-header { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s; }
    .shop-header:hover { background: rgba(255,255,255,0.05); }
    .shop-info { display: flex; align-items: center; gap: 12px; }
    .star { font-size: 20px; }
    .star.pending { color: #fbbf24; }
    .star.none { color: #4b5563; }
    .shop-name { font-weight: 600; }
    .shop-stats { font-size: 13px; color: #9ca3af; }
    .badge { background: #dc2626; color: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .feedback-list { padding: 0 20px 20px; display: none; }
    .feedback-list.expanded { display: block; }
    .feedback-item { background: #1f2937; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .feedback-query { background: #374151; padding: 12px; border-radius: 8px; margin-bottom: 12px; }
    .feedback-query-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-bottom: 6px; }
    .feedback-reply { background: #065f46; padding: 12px; border-radius: 8px; }
    .reply-form { margin-top: 12px; }
    .reply-form textarea { margin-bottom: 8px; min-height: 80px; resize: vertical; }
    .timestamp { font-size: 11px; color: #6b7280; margin-top: 8px; }
    .loading { text-align: center; padding: 40px; color: #9ca3af; }
    .error { background: #7f1d1d; color: #fecaca; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
    .success { background: #065f46; color: #a7f3d0; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
    .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⭐ Feedback Admin</h1>
    <p class="subtitle">Manage customer feedback and queries</p>
    <div class="auth-form">
      <div class="form-group">
        <label for="adminKey">Admin Key</label>
        <input type="password" id="adminKey" value="shopify-admin-2024" placeholder="Enter admin key">
      </div>
      <button onclick="loadShops()">Load Shops</button>
    </div>
    <div id="message"></div>
    <div id="shopList" class="shop-list"></div>
  </div>
  <script>
    const BASE_URL = window.location.origin;
    let shops = [], expandedShops = {}, shopFeedback = {};
    
    function getAdminKey() { return document.getElementById('adminKey').value.trim(); }
    
    function showMessage(msg, isError = false) {
      const el = document.getElementById('message');
      el.innerHTML = '<div class="' + (isError ? 'error' : 'success') + '">' + msg + '</div>';
      setTimeout(() => { el.innerHTML = ''; }, 5000);
    }
    
    async function loadShops() {
      const listEl = document.getElementById('shopList');
      listEl.innerHTML = '<div class="loading">Loading shops...</div>';
      try {
        const response = await fetch(BASE_URL + '/feedback/admin/shops', { headers: { 'X-Admin-Key': getAdminKey() } });
        if (!response.ok) throw new Error(response.status === 401 ? 'Invalid admin key' : 'Failed to load shops');
        const data = await response.json();
        shops = data.shops || [];
        if (shops.length === 0) { listEl.innerHTML = '<div class="empty-state">No feedback yet from any shops.</div>'; return; }
        renderShops();
      } catch (err) { listEl.innerHTML = ''; showMessage(err.message, true); }
    }
    
    function renderShops() {
      document.getElementById('shopList').innerHTML = shops.map(shop => 
        '<div class="shop-item" data-shop="' + shop.shop + '">' +
        '<div class="shop-header" onclick="toggleShop(\\'' + shop.shop + '\\')">' +
        '<div class="shop-info"><span class="star ' + (shop.hasPending ? 'pending' : 'none') + '">★</span>' +
        '<span class="shop-name">' + shop.shop + '</span><span class="shop-stats">' + shop.totalFeedback + ' total</span></div>' +
        (shop.pendingCount > 0 ? '<span class="badge">' + shop.pendingCount + ' pending</span>' : '') +
        '</div><div class="feedback-list" id="feedback-' + shop.shop.replace(/\\./g, '-') + '"><div class="loading">Loading...</div></div></div>'
      ).join('');
    }
    
    async function toggleShop(shopId) {
      const safeId = shopId.replace(/\\./g, '-');
      const feedbackEl = document.getElementById('feedback-' + safeId);
      if (expandedShops[shopId]) { feedbackEl.classList.remove('expanded'); expandedShops[shopId] = false; return; }
      feedbackEl.classList.add('expanded');
      expandedShops[shopId] = true;
      try {
        const response = await fetch(BASE_URL + '/feedback/admin/shop/' + encodeURIComponent(shopId), { headers: { 'X-Admin-Key': getAdminKey() } });
        if (!response.ok) throw new Error('Failed to load feedback');
        const data = await response.json();
        shopFeedback[shopId] = data.feedback || [];
        renderFeedback(shopId);
      } catch (err) { feedbackEl.innerHTML = '<div class="error">' + err.message + '</div>'; }
    }
    
    function renderFeedback(shopId) {
      const safeId = shopId.replace(/\\./g, '-');
      const feedbackEl = document.getElementById('feedback-' + safeId);
      const feedback = shopFeedback[shopId] || [];
      if (feedback.length === 0) { feedbackEl.innerHTML = '<div class="empty-state">No feedback.</div>'; return; }
      feedbackEl.innerHTML = feedback.map(item =>
        '<div class="feedback-item"><div class="feedback-query"><div class="feedback-query-label">Customer Query</div>' +
        '<div>' + escapeHtml(item.query) + '</div><div class="timestamp">' + formatDate(item.created_at) + '</div></div>' +
        (item.status === 'replied' ? 
          '<div class="feedback-reply"><div class="feedback-query-label" style="color:#a7f3d0">Your Reply</div><div>' + escapeHtml(item.reply) + '</div><div class="timestamp">' + formatDate(item.replied_at) + '</div></div>' :
          '<div class="reply-form"><textarea id="reply-' + item.id + '" placeholder="Type your reply..."></textarea><button onclick="sendReply(' + item.id + ',\\'' + shopId + '\\')">Send Reply</button></div>'
        ) + '</div>'
      ).join('');
    }
    
    async function sendReply(feedbackId, shopId) {
      const replyEl = document.getElementById('reply-' + feedbackId);
      const reply = replyEl.value.trim();
      if (!reply) { showMessage('Please enter a reply', true); return; }
      try {
        const response = await fetch(BASE_URL + '/feedback/admin/reply/' + feedbackId, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': getAdminKey() },
          body: JSON.stringify({ reply })
        });
        if (!response.ok) throw new Error('Failed to send reply');
        showMessage('Reply sent!');
        delete expandedShops[shopId];
        await toggleShop(shopId);
        await loadShops();
      } catch (err) { showMessage(err.message, true); }
    }
    
    function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
    function formatDate(dateStr) { return dateStr ? new Date(dateStr).toLocaleString() : ''; }
    
    document.addEventListener('DOMContentLoaded', loadShops);
  </script>
</body>
</html>`;
  
  return c.html(html);
});

// User endpoints - require session token
feedback.use('/user/*', validateSessionToken);

/**
 * GET /feedback/user/history
 * Get all feedback/queries for the current shop
 */
feedback.get('/user/history', async (c) => {
  const shop = getShop(c);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const result = await c.env.ANALYTICS_DB.prepare(
      `SELECT id, query, reply, status, created_at, replied_at 
       FROM feedback 
       WHERE shop = ? 
       ORDER BY created_at ASC`
    ).bind(shop).all();

    return c.json({
      feedback: result.results || [],
    });
  } catch (error) {
    console.error('[Feedback] Error fetching history:', error);
    return c.json({ error: 'Failed to fetch feedback history' }, 500);
  }
});

/**
 * GET /feedback/user/can-submit
 * Check if user can submit a new query (no pending queries)
 */
feedback.get('/user/can-submit', async (c) => {
  const shop = getShop(c);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const result = await c.env.ANALYTICS_DB.prepare(
      `SELECT COUNT(*) as pending_count 
       FROM feedback 
       WHERE shop = ? AND status = 'pending'`
    ).bind(shop).first();

    const canSubmit = (result?.pending_count || 0) === 0;

    return c.json({
      canSubmit,
      pendingCount: result?.pending_count || 0,
    });
  } catch (error) {
    console.error('[Feedback] Error checking submit status:', error);
    return c.json({ error: 'Failed to check submit status' }, 500);
  }
});

/**
 * POST /feedback/user/submit
 * Submit a new feedback query
 */
feedback.post('/user/submit', async (c) => {
  const shop = getShop(c);
  if (!shop) {
    return c.json({ error: 'Shop not found' }, 401);
  }

  try {
    const body = await c.req.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return c.json({ error: 'Query is required' }, 400);
    }

    // Check if there's already a pending query
    const pending = await c.env.ANALYTICS_DB.prepare(
      `SELECT COUNT(*) as count FROM feedback WHERE shop = ? AND status = 'pending'`
    ).bind(shop).first();

    if (pending && (pending.count as number) > 0) {
      return c.json({ error: 'You already have a pending query. Please wait for a response.' }, 400);
    }

    // Insert new feedback
    const result = await c.env.ANALYTICS_DB.prepare(
      `INSERT INTO feedback (shop, query, status, created_at) 
       VALUES (?, ?, 'pending', datetime('now'))`
    ).bind(shop, query.trim()).run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: 'Query submitted successfully',
    });
  } catch (error) {
    console.error('[Feedback] Error submitting query:', error);
    return c.json({ error: 'Failed to submit query' }, 500);
  }
});

// ============ ADMIN ENDPOINTS ============
// These are not protected by session token - use a simple admin key

/**
 * GET /feedback/admin/shops
 * Get list of all shops with feedback status
 */
feedback.get('/admin/shops', async (c) => {
  const adminKey = c.req.header('X-Admin-Key');
  
  // Simple admin key check (you can set this in env or hardcode for now)
  if (adminKey !== c.env.ADMIN_KEY && adminKey !== 'shopify-admin-2024') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Get all shops with their feedback counts
    const result = await c.env.ANALYTICS_DB.prepare(
      `SELECT 
         shop,
         COUNT(*) as total_feedback,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
         MAX(created_at) as last_feedback_at
       FROM feedback 
       GROUP BY shop
       ORDER BY pending_count DESC, last_feedback_at DESC`
    ).all();

    const shops = (result.results || []).map((row: any) => ({
      shop: row.shop,
      totalFeedback: row.total_feedback,
      pendingCount: row.pending_count,
      hasPending: row.pending_count > 0,
      lastFeedbackAt: row.last_feedback_at,
    }));

    return c.json({ shops });
  } catch (error) {
    console.error('[Feedback Admin] Error fetching shops:', error);
    return c.json({ error: 'Failed to fetch shops' }, 500);
  }
});

/**
 * GET /feedback/admin/shop/:shopId
 * Get all feedback for a specific shop
 */
feedback.get('/admin/shop/:shopId', async (c) => {
  const adminKey = c.req.header('X-Admin-Key');
  
  if (adminKey !== c.env.ADMIN_KEY && adminKey !== 'shopify-admin-2024') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const shopId = c.req.param('shopId');

  try {
    const result = await c.env.ANALYTICS_DB.prepare(
      `SELECT id, query, reply, status, created_at, replied_at 
       FROM feedback 
       WHERE shop = ? 
       ORDER BY created_at DESC`
    ).bind(shopId).all();

    return c.json({
      shop: shopId,
      feedback: result.results || [],
    });
  } catch (error) {
    console.error('[Feedback Admin] Error fetching shop feedback:', error);
    return c.json({ error: 'Failed to fetch feedback' }, 500);
  }
});

/**
 * POST /feedback/admin/reply/:feedbackId
 * Reply to a specific feedback
 */
feedback.post('/admin/reply/:feedbackId', async (c) => {
  const adminKey = c.req.header('X-Admin-Key');
  
  if (adminKey !== c.env.ADMIN_KEY && adminKey !== 'shopify-admin-2024') {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const feedbackId = c.req.param('feedbackId');

  try {
    const body = await c.req.json();
    const { reply } = body;

    if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
      return c.json({ error: 'Reply is required' }, 400);
    }

    // Update the feedback with reply
    const result = await c.env.ANALYTICS_DB.prepare(
      `UPDATE feedback 
       SET reply = ?, status = 'replied', replied_at = datetime('now')
       WHERE id = ?`
    ).bind(reply.trim(), feedbackId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Feedback not found' }, 404);
    }

    return c.json({
      success: true,
      message: 'Reply sent successfully',
    });
  } catch (error) {
    console.error('[Feedback Admin] Error sending reply:', error);
    return c.json({ error: 'Failed to send reply' }, 500);
  }
});

export default feedback;

