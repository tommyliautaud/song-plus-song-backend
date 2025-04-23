const sqlite3 = require('sqlite3').verbose();

// Open the database connection
const db = new sqlite3.Database(process.env.DATABASE_URL || './everynoise.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create the index on the similar_genre_id column
    db.run('CREATE INDEX IF NOT EXISTS idx_genresimilarities_similar_genre_id ON GenreSimilarities (similar_genre_id)', (err) => {
      if (err) {
        console.error('Error creating index:', err.message);
      } else {
        console.log('Index created successfully.');
      }
    });
  }
});

async function fetchGenreSimilarityData(genre) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT g2.name AS similar_genre
      FROM Genres g1
      JOIN GenreSimilarities gs ON g1.id = gs.genre_id
      JOIN Genres g2 ON gs.similar_genre_id = g2.id
      WHERE g1.name = ?
      ORDER BY gs.similarity_rank
    `;

    db.all(query, [genre], (err, rows) => {
      if (err) {
        console.error(`Error fetching similarity data for ${genre}:`, err.message);
        reject(err);
      } else {
        const similarityData = [genre, ...rows.map(row => row.similar_genre)];
        console.log(`Genre similarity data for ${genre}:`, similarityData);
        resolve(similarityData);
      }
    });
  });
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
  try {
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
  } catch (error) {
    console.error('Error in findMostSimilarGenreTest:', error);
    return null;
  }
}

async function fetchGenreArtists(genre) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT artist_name
      FROM Genres g
      JOIN GenreArtists ga ON g.id = ga.genre_id
      WHERE g.name = ?
    `;

    db.all(query, [genre], (err, rows) => {
      if (err) {
        console.error(`Error fetching artists for genre ${genre}:`, err.message);
        reject(err);
      } else {
        const artists = rows.map(row => row.artist_name);
        console.log(`Artists for genre ${genre}:`, artists);
        resolve(artists);
      }
    });
  });
}

process.on('exit', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database connection:', err.message);
    } else {
      console.log('Database connection closed.');
    }
  });
});

module.exports = {
  findMostSimilarGenreTest,
  fetchGenreArtists,
};