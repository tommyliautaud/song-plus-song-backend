const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const { throttle } = require('lodash');
const SpotifyWebApi = require('spotify-web-api-node');
const { searchSpotify, findMatchingSongs } = require('./songMatcher');
require('dotenv').config();

const app = express();
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

let accessToken = null;
let refreshToken = null;
let expiresIn = null;

const refreshAccessToken = async () => {
  try {
    const data = await spotifyApi.refreshAccessToken();
    accessToken = data.body['access_token'];
    expiresIn = data.body['expires_in'];
    spotifyApi.setAccessToken(accessToken);

    // Set a timeout to refresh the token before it expires
    setTimeout(refreshAccessToken, (expiresIn - 60) * 1000);
  } catch (error) {
    console.error('Error refreshing access token:', error);
  }
};

const allowedOrigins = [
  'https://song-plus-song-frontend.vercel.app',
  'https://song-plus-song-frontend-tommy-liautauds-projects.vercel.app',
  'https://song-plus-song-frontend-git-main-tommy-liautauds-projects.vercel.app',
  'https://www.songplussong.com',
];

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use(cors({
  origin: function (origin, callback) {
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true); // Allow request
    } else {
      callback(new Error('Not allowed by CORS')); // Reject request
    }
  }
}));

app.use(express.json());
app.use('/api/', limiter);

const searchSpotifyThrottled = throttle(searchSpotify, 1000, { trailing: false });

app.get('/auth/spotify', (req, res) => {
  const scopes = ['user-read-private', 'user-read-email'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

app.get('/auth/spotify/callback', (req, res) => {
  const { code } = req.query;
  spotifyApi.authorizationCodeGrant(code).then(
    (data) => {
      accessToken = data.body['access_token'];
      refreshToken = data.body['refresh_token'];
      expiresIn = data.body['expires_in'];

      spotifyApi.setAccessToken(accessToken);
      spotifyApi.setRefreshToken(refreshToken);

      // Set a timeout to refresh the token before it expires
      setTimeout(refreshAccessToken, (expiresIn - 60) * 1000);

      res.redirect('/');
    },
    (error) => {
      console.error('Error retrieving access token:', error);
      res.redirect('/error');
    }
  );
});

app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;
    const cacheKey = `search:${query}`;
    const cachedResults = cache.get(cacheKey);

    if (cachedResults) {
      return res.json(cachedResults);
    }

    const searchResults = await searchSpotifyThrottled(query);
    cache.set(cacheKey, searchResults);
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching Spotify:', error);
    res.status(500).json({ error: 'An error occurred while searching Spotify' });
  }
});

app.post('/api/match', async (req, res) => {
  try {
    const { song1Id, song2Id } = req.body;
    console.log('Matching songs:', song1Id, song2Id);
    const cacheKey = `match:${song1Id}:${song2Id}`;
    const cachedResults = cache.get(cacheKey);

    if (cachedResults) {
      return res.json(cachedResults);
    }

    const matchedSong = await findMatchingSongs(song1Id, song2Id);
    if (matchedSong) {
      cache.set(cacheKey, matchedSong);
      res.json(matchedSong);
    } else {
      res.status(404).json({ error: 'No matching song found' });
    }
  } catch (error) {
    console.error('Error matching songs:', error);
    res.status(500).json({ error: 'An error occurred while matching songs' });
  }
});

app.post('/api/generate-new', async (req, res) => {
  try {
    const { song1Id, song2Id } = req.body;
    const cacheKey = `match:${song1Id}:${song2Id}`;

    // Clear the cache for the current song combination
    cache.del(cacheKey);

    const matchedSong = await findMatchingSongs(song1Id, song2Id);
    if (matchedSong) {
      cache.set(cacheKey, matchedSong);
      res.json(matchedSong);
    } else {
      res.status(404).json({ error: 'No matching song found' });
    }
  } catch (error) {
    console.error('Error generating new song:', error);
    res.status(500).json({ error: 'An error occurred while generating a new song' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;