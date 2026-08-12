
// ============================================================
// VERCEL → APPS SCRIPT PROXY
// ============================================================
//
// Forwards every {action, params} payload from index.html
// to the Apps Script Web App, and returns the parsed JSON
// response back to the browser unchanged.
//
// Research notes implemented here:
//   - 25s timeout to prevent hanging the browser on slow
//     Apps Script responses
//   - CORS preflight handled (OPTIONS → 204)
//   - Optional shared API key for Vercel → Apps Script auth
//   - Defensive JSON parsing with raw text fallback
//   - Health-check endpoint at GET /api/copilot
// ============================================================

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/a/macros/mentorwater.com/s/AKfycbzRD9UQ8eB9bbz3z0FsIG_qgoMn0sVDoSYGgJJY1DVhHXP547D9URRoMB2alrkHBC5pvQ/exec';

// Optional: shared secret between Vercel and Apps Script
const SHARED_SECRET = process.env.SHARED_SECRET || '';

const UPSTREAM_TIMEOUT_MS = 25000;


// -----------------------------------------------------------
// Main handler
// -----------------------------------------------------------

export default async function handler(req, res) {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Shared-Secret'
  );


  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }


  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      service: 'copilot-proxy',
      upstream: APPS_SCRIPT_URL ? 'configured' : 'missing',
      time: new Date().toISOString()
    });
  }


  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }


  // Optional shared secret check
  if (SHARED_SECRET) {

    const provided =
      req.headers['x-shared-secret'] ||
      req.headers['X-Shared-Secret'] ||
      '';

    if (provided !== SHARED_SECRET) {

      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });

    }

  }


  // Basic body validation
  const body = req.body || {};

  if (!body.action) {
    return res.status(400).json({
      success: false,
      error: 'Missing action'
    });
  }


  // Forward to Apps Script with timeout
  const controller = new AbortController();
  const timeoutId  = setTimeout(
    () => controller.abort(),
    UPSTREAM_TIMEOUT_MS
  );

  try {

    const upstream = await fetch(APPS_SCRIPT_URL, {

      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'X-Shared-Secret': SHARED_SECRET
      },

      body: JSON.stringify(body),

      signal: controller.signal

    });

    clearTimeout(timeoutId);


    const text = await upstream.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      data = {
        success: false,
        error: 'Apps Script returned non-JSON response.',
        raw: text.slice(0, 1000)
      };
    }


    return res
      .status(upstream.ok ? 200 : 502)
      .json(data);

  } catch (error) {

    clearTimeout(timeoutId);

    const isTimeout = error && error.name === 'AbortError';

    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      error: isTimeout
        ? 'Upstream request timed out after ' +
          (UPSTREAM_TIMEOUT_MS / 1000) + 's'
        : (error.message || String(error))
    });

  }

}
