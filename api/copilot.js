// ============================================================
// VERCEL — MENTOR GROUP COPILOT PROXY V3
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST is allowed.' });
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    return res.status(500).json({
      success: false,
      error: 'APPS_SCRIPT_URL is not configured in Vercel.'
    });
  }

  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(req.body || {})
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      return res.status(502).json({
        success: false,
        error: 'Apps Script returned non-JSON data.',
        status: response.status,
        responsePreview: text.slice(0, 1200)
      });
    }

    return res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    console.error('Apps Script proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Could not reach Apps Script.'
    });
  }
}
