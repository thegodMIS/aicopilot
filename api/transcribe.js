// ============================================================
// VERCEL — MULTILINGUAL TRANSCRIPTION V3
// Uses current OpenAI speech-to-text model.
// ============================================================

export const config = { api: { bodyParser: false } };

const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Only POST is allowed.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'OPENAI_API_KEY is not configured in Vercel.' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const audioBuffer = Buffer.concat(chunks);

    if (!audioBuffer.length) {
      return res.status(400).json({ success: false, error: 'No audio received.' });
    }

    const mime = String(req.headers['content-type'] || 'audio/webm').split(';')[0] || 'audio/webm';
    const extension = mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'mp4' : 'webm';

    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: mime }), `call-turn.${extension}`);
    form.append('model', 'gpt-transcribe');
    form.append('response_format', 'json');
    form.append('languages[]', 'en');
    form.append('languages[]', 'hi');
    form.append(
      'prompt',
      'Indian English and Hindi sales call for Mentor Group / Mentor Water Experts. Domain words: STP, ETP, WTP, Commercial RO, RO, Solar, Heat Pump, AMC, O&M, sewage treatment plant, effluent treatment plant, water treatment plant, MLD, KLD, KL/day, BOD, COD.'
    );

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      return res.status(502).json({
        success: false,
        error: 'OpenAI returned invalid transcription data.',
        responsePreview: text.slice(0, 1200)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || 'Transcription failed.'
      });
    }

    const languages = Array.isArray(data.languages)
      ? data.languages.map(x => typeof x === 'string' ? x : x?.code).filter(Boolean)
      : [];

    return res.status(200).json({
      success: true,
      transcript: String(data.text || '').trim(),
      languages
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown transcription error.'
    });
  }
}
