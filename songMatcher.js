const axios = require('axios');
const { getAccessToken } = require('./spotifyAuth');
const { extractSeedGenres, mapGenresToSeedGenres } = require('./genreExtractor');
const genres = require('./genres.js');
const { findMostSimilarGenreTest, fetchGenreArtists } = require('./everynoise.js');

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
        genres: filteredGenres
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
      album: trackInfo.data.album,
      preview_url: trackInfo.data.preview_url,
      external_urls: trackInfo.data.external_urls,
      genres: [...new Set(genres)],
      coverArt: coverArt,
      audioFeatures: audioFeatures.data
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
          url: track.external_urls.spotify,
          coverArt: coverArt,
          preview_url: track.preview_url
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

    const randomIndex1 = Math.floor(Math.random() * filteredSong1Genres.length);
    const randomIndex2 = Math.floor(Math.random() * filteredSong2Genres.length);

    const genre1 = filteredSong1Genres[randomIndex1];
    const genre2 = filteredSong2Genres[randomIndex2];

    const MostSimilarGenre = await findMostSimilarGenreTest(genre1, genre2);

    if (MostSimilarGenre) {
      console.log("Most similar genre artists:");
      const genreArtists = await fetchGenreArtists(MostSimilarGenre);
      console.log(genreArtists);

      if (genreArtists.length > 0) {
        const randomArtist = genreArtists[Math.floor(Math.random() * genreArtists.length)];
        console.log("Outputted song");
        const matchedSong = await getRandomSongByArtist(randomArtist);

        if (matchedSong) {
          console.log(`Matching song: "${matchedSong.name}" by ${matchedSong.artists.map(a => a.name).join(', ')}`);
          console.log(`Spotify URL: ${matchedSong.url}`);
          console.log(`Cover Art URL: ${matchedSong.coverArt}`);

          const matchedSongData = {
            song: {
              name: matchedSong.name,
              artists: matchedSong.artists,
              url: matchedSong.url,
              coverArt: matchedSong.coverArt,
              preview_url: matchedSong.preview_url
            },
            inputSongsCoverArt: [song1Data.coverArt, song2Data.coverArt],
            genreInfo: {
              genre1,
              genre2,
              matchedGenre: MostSimilarGenre
            }
          };

          console.log('Matched song data:', JSON.stringify(matchedSongData, null, 2));
          return matchedSongData;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error in findMatchingSongs:', error);
    throw error;
  }
}

module.exports = {
  findMatchingSongs,
  searchSpotify,
};