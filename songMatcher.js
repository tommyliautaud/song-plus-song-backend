const axios = require('axios');
const { getAccessToken } = require('./spotifyAuth');
const genres = require('./genres.js');
const { findMostSimilarGenreTest, fetchGenreArtists } = require('./everynoise.js');

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'everynoise.db'));

async function searchSpotify(query, retryCount = 3, retryDelay = 1000) {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: query,
        type: 'track',
        limit: 20,
      },
    });

    const tracks = response.data.tracks.items;
    const tracksWithGenres = await Promise.all(tracks.map(async (track) => {
      const artistId = track.artists[0].id;
      const artistResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      const genres = artistResponse.data.genres;
      const filteredGenres = genres.filter(genre => genres.includes(genre));

      if (filteredGenres.length === 0) {
        return null; // Exclude the track if none of the genres are in the available genres list
      }

      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map(artist => ({ name: artist.name })),
        album: {
          name: track.album.name,
          images: track.album.images
        },
        preview_url: track.preview_url,
        external_urls: track.external_urls,
        genres: filteredGenres,
        explicit: track.explicit // Add this line
      };
    }));

    // Filter out tracks with no valid genres and limit to top 5
    const filteredTracks = tracksWithGenres
      .filter(track => track !== null)
      .slice(0, 5);

    return filteredTracks;
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying searchSpotify in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return searchSpotify(query, retryCount - 1, retryDelay * 2);
    } else {
      console.error('Error searching Spotify:', error);
      throw error;
    }
  }
}


async function getTrackData(trackId, retryCount = 3, retryDelay = 1000) {
  const accessToken = await getAccessToken();
  try {
    const [trackInfo, audioFeatures] = await Promise.all([
      axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }),
      axios.get(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    ]);

    const artistIds = trackInfo.data.artists.map(artist => artist.id);
    const coverArt = trackInfo.data.album.images[0].url;
    const artistPromises = artistIds.map(artistId =>
      axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
    );

    const artistResponses = await Promise.all(artistPromises);
    const genres = artistResponses.flatMap(response => response.data.genres);

    if (!audioFeatures.data || !trackInfo.data) {
      throw new Error('Failed to fetch track data or audio features');
    }

    return {
      id: trackInfo.data.id,
      name: trackInfo.data.name,
      artists: trackInfo.data.artists.map(artist => ({ name: artist.name })),
      album: {
        name: trackInfo.data.album.name,
        images: trackInfo.data.album.images,
      },
      preview_url: trackInfo.data.preview_url,
      external_urls: trackInfo.data.external_urls,
      genres: [...new Set(genres)],
      coverArt: coverArt,
      audioFeatures: audioFeatures.data,
      explicit: trackInfo.data.explicit,
    };
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying getTrackData in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return getTrackData(trackId, retryCount - 1, retryDelay * 2);
    } else {
      console.error('Error in getTrackData:', error);
      throw error;
    }
  }
}

async function getRandomSongByArtist(artistName, retryCount = 3, retryDelay = 1000) {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.data.artists.items.length > 0) {
      const artistId = response.data.artists.items[0].id;

      const trackResponse = await axios.get(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (trackResponse.data.tracks.length > 0) {
        const track = trackResponse.data.tracks[0];
        const allArtists = track.artists.map(artist => artist.name).join(', ');
        const coverArt = track.album.images[0].url;

        return {
          id: track.id,
          name: track.name,
          artists: track.artists.map(artist => ({ name: artist.name })),
          album: {
            name: track.album.name,
            images: track.album.images,
          },
          url: track.external_urls.spotify,
          coverArt: coverArt,
          preview_url: track.preview_url,
          explicit: track.explicit,
        };
      }
    }

    return null;
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying getRandomSongByArtist in ${retryDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return getRandomSongByArtist(artistName, retryCount - 1, retryDelay * 2);
    } else {
      console.error(`Error fetching song for artist ${artistName}:`, error);
      throw error;
    }
  }
}


// Cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}


function averageVectors(vecA, vecB) {
  return vecA.map((val, i) => (val + vecB[i]) / 2);
}

// Fetch embedding for a given genre from SQLite
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

async function findMatchingSongs(song1Id, song2Id) {
  try {
    const song1Data = await getTrackData(song1Id);
    const song2Data = await getTrackData(song2Id);

    const filteredSong1Genres = song1Data.genres ? song1Data.genres.filter(genre => genres.includes(genre)) : [];
    const filteredSong2Genres = song2Data.genres ? song2Data.genres.filter(genre => genres.includes(genre)) : [];

    if (filteredSong1Genres.length === 0 || filteredSong2Genres.length === 0) {
      console.log("One or more input songs do not have a valid genre association");
      return null;
    }

    const genre1 = filteredSong1Genres[Math.floor(Math.random() * filteredSong1Genres.length)];
    const genre2 = filteredSong2Genres[Math.floor(Math.random() * filteredSong2Genres.length)];
    console.log(`Selected genres: ${genre1}, ${genre2}`);

    const embedding1 = await getGenreEmbedding(genre1);
    const embedding2 = await getGenreEmbedding(genre2);

    if (!embedding1 || !embedding2) {
      console.log("Missing embedding data for selected genres.");
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
      const sim = cosineSimilarity(avgVector, vector);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = name;
      }
    }

    const MostSimilarGenre = bestMatch;
    console.log(`✅ Most similar genre: ${MostSimilarGenre} (similarity: ${highestSim.toFixed(4)})`);

    const genreArtists = await fetchGenreArtists(MostSimilarGenre);
    if (genreArtists.length === 0) {
      console.log(`⚠️ No artists found for genre: ${MostSimilarGenre}`);
      return null;
    }

    const randomArtist = genreArtists[Math.floor(Math.random() * genreArtists.length)];
    const matchedSong = await getRandomSongByArtist(randomArtist);

    if (matchedSong) {
      const matchedSongData = {
        song: {
          name: matchedSong.name,
          artists: matchedSong.artists,
          album: matchedSong.album,
          url: matchedSong.url,
          coverArt: matchedSong.coverArt,
          preview_url: matchedSong.preview_url,
          explicit: matchedSong.explicit
        },
        inputSongsCoverArt: [song1Data.coverArt, song2Data.coverArt],
        genreInfo: {
          genre1,
          genre2,
          matchedGenre: MostSimilarGenre,
          similarityScore: highestSim.toFixed(4)
        }
      };

      console.log('🎧 Matched song data:', JSON.stringify(matchedSongData, null, 2));
      return matchedSongData;
    }

    return null;
  } catch (error) {
    console.error('❌ Error in findMatchingSongs:', error);
    throw error;
  }
}


module.exports = {
  findMatchingSongs,
  searchSpotify,
};