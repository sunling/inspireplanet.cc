// netlify/functions/uploadImageToGitHub.js
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ 
          success: false, 
          error: 'Method Not Allowed' 
        })
      };
    }

    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const base64Image = requestBody.base64Image;

    // Validate the input
    if (!base64Image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing base64Image in request body' 
        })
      };
    }

    // Extract the base64 data part (remove the prefix like "data:image/png;base64,")
    const base64Data = base64Image.split(',')[1];
    if (!base64Data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid base64 image format' 
        })
      };
    }

    // Get GitHub configuration from environment variables
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
    const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
    const GITHUB_BRANCH = process.env.GITHUB_BRANCH;

    // Validate environment variables
    if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME || !GITHUB_BRANCH) {
      console.error('Missing GitHub environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        })
      };
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const filename = `user_uploads/image_${timestamp}_${randomString}.png`;

    // Prepare the GitHub API request
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${filename}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Upload image: ${filename}`,
        content: base64Data,
        branch: GITHUB_BRANCH
      })
    });

    const data = await response.json();

    if (response.ok && data.content && data.content.path) {
      
      // Construct the raw.githubusercontent.com link
      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/${GITHUB_BRANCH}/${data.content.path}`;
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          url: rawUrl 
        })
      };
    } else {
      console.error('❌ Image upload failed:', data);
      return {
        statusCode: response.status || 500,
        body: JSON.stringify({ 
          success: false, 
          error: data.message || 'Failed to upload image to GitHub',
          details: data
        })
      };
    }
  } catch (error) {
    console.error('❌ Error in uploadImageToGitHub function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal Server Error',
        message: error.message
      })
    };
  }
};
