const axios = require('axios');
require('dotenv').config();

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
let accessToken = null;
let tokenExpirationTime = null;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

async function refreshAccessToken() {
  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      headers: {
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    accessToken = response.data.access_token;
    console.log(accessToken);
    tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);
  } catch (error) {
    console.error('Error refreshing access token:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function getAccessToken() {
  if (!accessToken || Date.now() >= tokenExpirationTime) {
    console.log('Access token is null or expired. Refreshing...');
    await refreshAccessToken();
  }
  return accessToken;
}

module.exports = {
  getAccessToken,
};