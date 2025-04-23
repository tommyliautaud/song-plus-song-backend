// generate_genre_embeddings.js

const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
require('dotenv').config();

const db = new sqlite3.Database(process.env.DATABASE_URL || './everynoise.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database.');
    generateEmbeddings(); // start the process once connected
  }
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = 'text-embedding-3-small'; // or 'text-embedding-ada-002'

async function getEmbedding(text) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: OPENAI_MODEL,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    return response.data.data[0].embedding;
  } catch (err) {
    console.error(`❌ Error generating embedding for "${text}"`, err.response?.data || err.message);
    throw err;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getGenresToEmbed() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT id, name FROM Genres WHERE embedding IS NULL OR embedding = ''`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function saveEmbedding(id, embedding) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE Genres SET embedding = ? WHERE id = ?`,
      [JSON.stringify(embedding), id],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function generateEmbeddings() {
  try {
    const genres = await getGenresToEmbed();
    console.log(`🧠 Found ${genres.length} genres to embed`);

    for (const genre of genres) {
      const prompt = `The music genre ${genre.name}`;

      try {
        const embedding = await getEmbedding(prompt);
        await saveEmbedding(genre.id, embedding);
        console.log(`✅ Embedded: ${genre.name}`);
      } catch {
        console.log(`⚠️ Skipping: ${genre.name}`);
      }

      await sleep(1000); // Throttle to avoid OpenAI rate limits
    }

    console.log('🎉 Finished embedding all genres!');
    db.close();
  } catch (err) {
    console.error('Fatal error during embedding process:', err.message);
    db.close();
  }
}
