// ============================================================
// VERCEL — WHISPER TRANSCRIPTION API
// api/transcribe.js
// ============================================================

export const config = {
  api: {
    bodyParser: false,
  },
};

const OPENAI_API_URL =
  "https://api.openai.com/v1/audio/transcriptions";

export default async function handler(req, res) {

  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );


  if (req.method === "OPTIONS") {

    return res.status(200).end();

  }


  if (req.method !== "POST") {

    return res.status(405).json({

      success: false,

      error:
        "Only POST is allowed."

    });

  }


  try {

    const apiKey =
      process.env.OPENAI_API_KEY;


    if (!apiKey) {

      return res.status(500).json({

        success: false,

        error:
          "OPENAI_API_KEY is not configured in Vercel."

      });

    }


    // --------------------------------------------------------
    // Read raw request body
    // --------------------------------------------------------

    const chunks = [];


    for await (
      const chunk of req
    ) {

      chunks.push(
        Buffer.from(chunk)
      );

    }


    const body =
      Buffer.concat(chunks);


    if (!body.length) {

      return res.status(400).json({

        success: false,

        error:
          "No audio was received."

      });

    }


    // --------------------------------------------------------
    // Get content type
    // --------------------------------------------------------

    const contentType =
      req.headers[
        "content-type"
      ] || "";


    if (
      !contentType.includes(
        "multipart/form-data"
      )
    ) {

      return res.status(400).json({

        success: false,

        error:
          "Expected multipart/form-data."

      });

    }


    // --------------------------------------------------------
    // Send audio to OpenAI
    //
    // IMPORTANT:
    // Node 18+ supports Blob / File / FormData.
    // --------------------------------------------------------

    const formData =
      new FormData();


    const audioBlob =
      new Blob(
        [body],
        {
          type:
            extractMimeType_(
              contentType
            )
        }
      );


    formData.append(
      "file",
      audioBlob,
      "customer-turn.webm"
    );


    // Whisper model specifically requested
    formData.append(
      "model",
      "whisper-1"
    );


    // Ask for plain text
    formData.append(
      "response_format",
      "json"
    );


    // Optional language.
    // Set this to "hi" for Hindi-only calls.
    // Leave it out if calls can mix languages.
    formData.append(
      "language",
      "en"
    );


    const response =
      await fetch(
        OPENAI_API_URL,
        {

          method: "POST",

          headers: {

            Authorization:
              "Bearer " +
              apiKey

          },

          body:
            formData

        }
      );


    const text =
      await response.text();


    if (!response.ok) {

      console.error(
        "OpenAI transcription error:",
        text
      );


      return res.status(
        response.status
      ).json({

        success: false,

        error:
          "Whisper transcription failed.",

        details:
          safeJsonParse_(
            text
          )

      });

    }


    const result =
      safeJsonParse_(
        text
      );


    if (!result) {

      return res.status(502).json({

        success: false,

        error:
          "OpenAI returned an invalid transcription response."

      });

    }


    return res.status(200).json({

      success: true,

      transcript:
        String(
          result.text || ""
        ).trim()

    });


  } catch (error) {

    console.error(
      "Whisper API error:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        error.message ||
        "Unknown transcription error."

    });

  }

}


// ============================================================
// HELPERS
// ============================================================

function safeJsonParse_(text) {

  try {

    return JSON.parse(
      text
    );

  } catch (
    error
  ) {

    return null;

  }

}


function extractMimeType_(
  contentType
) {

  const match =
    contentType.match(
      /boundary=.*$/i
    );


  // For multipart request the actual
  // uploaded file content itself will
  // still be webm in our V1.
  return "audio/webm";

}
