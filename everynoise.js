const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'everynoise.db');
const db = new sqlite3.Database(dbPath);

// Fetch genres for a given artist name
function getGenresForArtist(artistName) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT Genres.name
      FROM GenreArtists
      JOIN Genres ON GenreArtists.genre_id = Genres.id
      WHERE GenreArtists.artist_name = ?
    `;

    db.all(query, [artistName], (err, rows) => {
      if (err) {
        console.error('Database error fetching genres for artist:', err);
        reject(err);
      } else {
        const genres = rows.map(row => row.name);
        resolve(genres);
      }
    });
  });
}

function fetchGenreArtists(genreName) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT GenreArtists.artist_name
      FROM GenreArtists
      JOIN Genres ON GenreArtists.genre_id = Genres.id
      WHERE Genres.name = ?
    `;

    db.all(query, [genreName], (err, rows) => {
      if (err) {
        console.error('Database error fetching artists for genre:', err);
        reject(err);
      } else {
        const artists = rows.map(row => row.artist_name);
        resolve(artists);
      }
    });
  });
}


function getEmbedding(genreName) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT embedding
      FROM Genres
      WHERE name = ?
    `;

    db.get(query, [genreName], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row || !row.embedding) {
        resolve(null);
      } else {
        const embedding = JSON.parse(row.embedding);
        resolve(embedding);
      }
    });
  });
}

async function getAllGenresWithEmbeddings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT name, embedding FROM Genres WHERE embedding IS NOT NULL', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const genres = rows.map(row => ({
          name: row.name,
          embedding: JSON.parse(row.embedding)
        }));
        resolve(genres);
      }
    });
  });
}


module.exports = {
  getGenresForArtist,
  getEmbedding,
  getAllGenresWithEmbeddings,
  fetchGenreArtists
};
