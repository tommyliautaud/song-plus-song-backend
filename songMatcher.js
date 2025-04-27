const axios = require('axios');
const { getAccessToken } = require('./spotifyAuth');
const { getGenresForArtist, fetchGenreArtists } = require('./everynoise.js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'everynoise.db'));

// Cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

// Average of two vectors
function averageVectors(vecA, vecB) {
  return vecA.map((val, i) => (val + vecB[i]) / 2);
}

// Fetch genre embedding from database
function getGenreEmbedding(genre) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT embedding FROM Genres WHERE name = ?`, [genre], (err, row) => {
      if (err) return reject(err);
      if (!row || !row.embedding) return resolve(null);
      try {
        const vector = JSON.parse(row.embedding);
        resolve(vector);
      } catch (e) {
        resolve(null);
      }
    });
  });
}

// Search Spotify tracks
async function searchSpotify(query, retryCount = 3, retryDelay = 1000) {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: query,
        type: 'track',
        limit: 20,
      },
    });

    const tracks = response.data.tracks.items;

    // New: Filter only tracks where artist is in the everynoise database
    const validTracks = [];

    for (const track of tracks) {
      const artistName = track.artists[0]?.name;
      if (!artistName) continue;

      const exists = await new Promise((resolve, reject) => {
        db.get(`SELECT 1 FROM GenreArtists WHERE artist_name = ?`, [artistName], (err, row) => {
          if (err) {
            console.error('Database error checking artist:', err);
            return resolve(false);
          }
          resolve(!!row);
        });
      });
      

      if (exists) {
        validTracks.push({
          id: track.id,
          name: track.name,
          artists: track.artists.map(a => ({ name: a.name })),
          album: {
            name: track.album.name,
            images: track.album.images,
          },
          url: track.external_urls.spotify,
          preview_url: track.preview_url,
          explicit: track.explicit,
        });
      }
    }

    return validTracks;
    
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying searchSpotify in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return searchSpotify(query, retryCount - 1, retryDelay * 2);
    } else {
      console.error('Error searching Spotify:', error);
      throw error;
    }
  }
}


// Find matching song
async function findMatchingSongs(song1Id, song2Id) {
  try {
    console.log(`Matching songs: ${song1Id}, ${song2Id}`);

    const accessToken = await getAccessToken();
    const [track1Response, track2Response] = await Promise.all([
      axios.get(`https://api.spotify.com/v1/tracks/${song1Id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      axios.get(`https://api.spotify.com/v1/tracks/${song2Id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
    ]);

    const artist1Name = track1Response.data.artists[0]?.name;
    const artist2Name = track2Response.data.artists[0]?.name;

    if (!artist1Name || !artist2Name) {
      console.error("Could not fetch artist names.");
      return null;
    }

    const genres1 = await getGenresForArtist(artist1Name);
    const genres2 = await getGenresForArtist(artist2Name);

    console.log(`Genres for song 1: ${genres1}`);
    console.log(`Genres for song 2: ${genres2}`);

    if (genres1.length === 0 || genres2.length === 0) {
      console.error('❌ One or both songs have no valid genres.');
      return null;
    }

    const song1Genre = genres1[Math.floor(Math.random() * genres1.length)];
    const song2Genre = genres2[Math.floor(Math.random() * genres2.length)];

    console.log(`Selected genres: ${song1Genre}, ${song2Genre}`);

    const embedding1 = await getGenreEmbedding(song1Genre);
    const embedding2 = await getGenreEmbedding(song2Genre);

    if (!embedding1 || !embedding2) {
      console.error('❌ Could not find embeddings for input genres.');
      return null;
    }

    const avgVector = averageVectors(embedding1, embedding2);

    const allEmbeddings = await new Promise((resolve, reject) => {
      db.all(`SELECT name, embedding FROM Genres WHERE embedding IS NOT NULL`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          name: row.name,
          vector: JSON.parse(row.embedding)
        })));
      });
    });

    let bestMatch = null;
    let highestSim = -1;

    for (const { name, vector } of allEmbeddings) {
      if (song1Genre !== song2Genre && (name === song1Genre || name === song2Genre)) {
        continue;
      }

      const sim = cosineSimilarity(avgVector, vector);

      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = name;
      }
    }

    console.log(`✅ Most similar genre: ${bestMatch} (similarity: ${highestSim.toFixed(4)})`);

    const genreArtists = await fetchGenreArtists(bestMatch);
    if (genreArtists.length === 0) {
      console.error(`⚠️ No artists found for genre: ${bestMatch}`);
      return null;
    }

    const randomArtist = genreArtists[Math.floor(Math.random() * genreArtists.length)];

    const randomTrackResponse = await axios.get(`https://api.spotify.com/v1/search`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: `artist:${randomArtist}`,
        type: 'track',
        limit: 10,
        market: 'US'
      }
    });

    const randomTrack = randomTrackResponse.data.tracks.items[0];

    if (!randomTrack) {
      console.error(`⚠️ No track found for artist: ${randomArtist}`);
      return null;
    }

    return {
      song: {
        name: randomTrack.name,
        artists: randomTrack.artists.map(a => ({ name: a.name })),
        album: {
          name: randomTrack.album.name,
          images: randomTrack.album.images,
        },
        url: randomTrack.external_urls.spotify,
        coverArt: randomTrack.album.images[0]?.url || null,
        preview_url: randomTrack.preview_url,
        explicit: randomTrack.explicit,
      },
      genreInfo: {
        genre1: song1Genre,
        genre2: song2Genre,
        matchedGenre: bestMatch,
        similarityScore: highestSim.toFixed(4),
      }
    };

  } catch (error) {
    console.error('❌ Error in findMatchingSongs:', error);
    throw error;
  }
}

module.exports = {
  findMatchingSongs,
  searchSpotify,
};
