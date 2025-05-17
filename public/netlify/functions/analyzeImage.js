const fetch = require('node-fetch');

exports.handler = async function (event) {
  const { imageUrl } = JSON.parse(event.body || '{}');
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!imageUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing imageUrl in request body' }),
    };
  }

  try {
    const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const body = {
      requests: [
        {
          image: {
            source: { imageUri: imageUrl }
          },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 }
          ]
        }
      ]
    };

    const response = await fetch(visionApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    const labels = data.responses?.[0]?.labelAnnotations || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        tags: labels.map(l => l.description),
        raw: labels
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
