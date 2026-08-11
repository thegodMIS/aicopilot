const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/a/macros/mentorwater.com/s/AKfycbzRD9UQ8eB9bbz3z0FsIG_qgoMn0sVDoSYGgJJY1DVhHXP547D9URRoMB2alrkHBC5pvQ/exec';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body || {})
    });

    const text = await response.text();

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

    return res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || String(error)
    });
  }
}
