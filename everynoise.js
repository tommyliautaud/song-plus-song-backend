const axios = require('axios');
const cheerio = require('cheerio');

async function fetchGenreSimilarityData(genre, retryCount = 3, retryDelay = 1000) {
  const formattedGenre = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://everynoise.com/everynoise1d-${formattedGenre}.html`;
  console.log(`Fetching genre similarity data for ${genre} using URL: ${url}`);

  try {
    const response = await axios.get(url, { timeout: 10000 }); // Increase timeout to 10 seconds
    const html = response.data;
    const $ = cheerio.load(html);
    const genreSimilarityData = [genre];
    $('tr').each((index, element) => {
      const genreElement = $(element).find('a[href^="everynoise1d-"]');
      if (genreElement.length > 0) {
        const similarGenre = genreElement.text().trim();
        genreSimilarityData.push(similarGenre);
      }
    });
    console.log(`Genre similarity data for ${genre}:`, genreSimilarityData);
    return genreSimilarityData;
  } catch (error) {
    console.error(`Error fetching genre similarity data for ${genre}:`, error);

    if (retryCount > 0) {
      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetchGenreSimilarityData(genre, retryCount - 1, retryDelay * 2);
    } else {
      console.error(`Max retry attempts reached. Unable to fetch genre similarity data for ${genre}.`);
      return [genre]; // Return the original genre as a fallback
    }
  }
}
  
  function calculateSimilarityScore(genre, similarityList1, similarityList2) {
    const rank1 = similarityList1.indexOf(genre);
    const rank2 = similarityList2.indexOf(genre);
  
    if (rank1 === -1 || rank2 === -1) {
      return 0;
    }
  
    const normalizedRank1 = rank1 / (similarityList1.length - 1);
    const normalizedRank2 = rank2 / (similarityList2.length - 1);
  
    const weightedAverage = (normalizedRank1 + normalizedRank2) / 2;
    const score = 1 - weightedAverage;
  
    return score;
  }
  
  function findMostSimilarGenre(genre1, genre2, similarityData1, similarityData2) {
    let maxScore = -1;
    let mostSimilarGenres = [];
    let rank1 = -1;
    let rank2 = -1;
  
    for (const genre of similarityData1) {
      if (similarityData2.includes(genre)) {
        const score = calculateSimilarityScore(genre, similarityData1, similarityData2);
        if (score > maxScore) {
          maxScore = score;
          mostSimilarGenres = [genre];
          rank1 = similarityData1.indexOf(genre);
          rank2 = similarityData2.indexOf(genre);
        } else if (score === maxScore) {
          mostSimilarGenres.push(genre);
        }
      }
    }
  
    if (mostSimilarGenres.length > 0) {
      const randomIndex = Math.floor(Math.random() * mostSimilarGenres.length);
      const selectedGenre = mostSimilarGenres[randomIndex];
      console.log(`The most similar genre to "${genre1}" and "${genre2}" is: "${selectedGenre}"`);
      console.log(`Rank of "${selectedGenre}" in "${genre1}" similarity list: ${rank1}`);
      console.log(`Rank of "${selectedGenre}" in "${genre2}" similarity list: ${rank2}`);
      return selectedGenre;
    }
  
    return null;
  }
  
  async function findMostSimilarGenreTest(genre1, genre2) {
    const similarityData1 = await fetchGenreSimilarityData(genre1);
    const similarityData2 = await fetchGenreSimilarityData(genre2);
  
    const mostSimilarGenre = findMostSimilarGenre(genre1, genre2, similarityData1, similarityData2);
  
    if (mostSimilarGenre) {
      console.log(`The most similar genre to "${genre1}" and "${genre2}" is: "${mostSimilarGenre}"`);
      return mostSimilarGenre;
    } else {
      console.log(`No similar genre found between "${genre1}" and "${genre2}"`);
      return null;
    }
  }

  async function fetchGenreArtists(genre) {
  const formattedGenre = genre.toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://everynoise.com/engenremap-${formattedGenre}.html`;

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    let artists = [];

    $('div[id^="item"]').each((index, element) => {
      const onclickText = $(element).attr('onclick');
      
      // Use regex to extract the artist name from the onclick attribute
      const artistMatch = /playx\(.+?,\s*"(.*?)"\s*,/.exec(onclickText);
      if (artistMatch && artistMatch[1]) {
        let artistName = artistMatch[1].trim();
        
        // Check for "featuring" or "feat." and split into multiple artists
        if (artistName.toLowerCase().includes('feat.')) {
          const featuredArtists = artistName.split(/feat\.|featuring/i).map(name => name.trim());
          artists = artists.concat(featuredArtists);
        } else {
          artists.push(artistName);
        }
      }
    });

    // Remove any duplicates (optional)
    artists = [...new Set(artists)];

    console.log(`Artists for genre ${genre}:`, artists);
    return artists;
  } catch (error) {
    console.error(`Error fetching artists for genre ${genre}:`, error);
    throw error;
  }
}

  


  module.exports = {
    findMostSimilarGenreTest,
    fetchGenreArtists,
  };