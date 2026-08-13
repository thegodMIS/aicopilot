// ============================================================
// VERCEL API PROXY — LIVE SALES COPILOT
// api/copilot.js
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Only POST is allowed.'
    });
  }

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({
      success: false,
      error: 'APPS_SCRIPT_URL is not configured in Vercel.'
    });
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(req.body || {})
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      return res.status(502).json({
        success: false,
        error: 'Apps Script returned non-JSON response.',
        status: response.status,
        finalUrl: response.url || APPS_SCRIPT_URL,
        responsePreview: text.substring(0, 1000)
      });
    }

    return res.status(response.ok ? 200 : 502).json(data);

  } catch (error) {
    console.error('Apps Script proxy error:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown proxy error.'
    });
  }
}
