const fetch = require('node-fetch');
const { getBaseUrl } = require('./utils');

exports.handler = async function (event) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Only POST requests are allowed' }),
        };
    }

    // Parse request body
    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body format' }),
        };
    }

    // Check if text parameter is provided
    const { text } = requestBody;
    if (!text) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing text parameter' }),
        };
    }

    // Get Replicate API key
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_API_TOKEN) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server missing Replicate API key' }),
        };
    }

    try {
        // Get the base URL for the optimizeText function
        const baseUrl = getBaseUrl();
        
        // First, optimize the text using optimizeText function
        const optimizeResponse = await fetch(`${baseUrl}/.netlify/functions/optimizeText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        const optimizedData = await optimizeResponse.json();
        if (!optimizeResponse.ok) {
            throw new Error(optimizedData.error || 'Failed to optimize text');
        }

        // Generate prompt based on the optimized text
        console.log(optimizedData.optimized);
        const prompt = `${optimizedData.optimized}, artistic illustration, minimalist, elegant, suitable for card background, soft colors, no text`;

        // Call Replicate API
        const response = await fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "black-forest-labs/flux-schnell",
                input: {
                    prompt: prompt,
                    negative_prompt: "text, words, letters, ugly, blurry, low quality, distorted, deformed",
                    width: 768,
                    height: 512,
                    num_outputs: 1,
                    scheduler: "K_EULER",
                    num_inference_steps: 4,
                    guidance_scale: 7.5,
                }
            }),
        });

        const prediction = await response.json();
        console.log("API Response:", prediction);

        // Check Replicate response
        if (prediction.error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: prediction.error }),
            };
        }

        // Poll for results
        let result;
        if (prediction.status === 'succeeded') {
            result = prediction.output;
        } else {
            // Poll for results
            const getResult = async (url) => {
                const pollResponse = await fetch(url, {
                    headers: {
                        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                    },
                });
                return await pollResponse.json();
            };

            // Poll until we get results or timeout
            let pollUrl = prediction.urls.get;
            let attempts = 0;
            let pollResult;

            while (attempts < 30) { // Try up to 30 times, waiting 2 seconds between attempts
                pollResult = await getResult(pollUrl);

                if (pollResult.status === 'succeeded') {
                    result = pollResult.output;
                    break;
                } else if (pollResult.status === 'failed') {
                    return {
                        statusCode: 500,
                        body: JSON.stringify({ error: 'Model processing failed', details: pollResult }),
                    };
                }

                await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
                attempts++;
            }

            if (!result) {
                return {
                    statusCode: 504,
                    body: JSON.stringify({ error: 'Result timeout' }),
                };
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                imageUrl: result[0],
                prompt: prompt,
                originalText: text,
                optimizedText: optimizedData.optimized
            }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error processing request', details: error.message }),
        };
    }
}; 