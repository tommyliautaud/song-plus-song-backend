// genreExtractor.js

const seedGenres = require('./seedGenres');

const genreKeywordMap = {
  // Seed genres mapping to themselves
  'acoustic': 'acoustic',
  'afrobeat': 'afrobeat',
  'alt-rock': 'alt-rock',
  'alternative': 'alternative',
  'ambient': 'ambient',
  'anime': 'anime',
  'black-metal': 'black-metal',
  'bluegrass': 'bluegrass',
  'blues': 'blues',
  'bossanova': 'bossanova',
  'brazil': 'brazil',
  'breakbeat': 'breakbeat',
  'british': 'british',
  'cantopop': 'cantopop',
  'chicago-house': 'chicago-house',
  'children': 'children',
  'chill': 'chill',
  'classical': 'classical',
  'club': 'club',
  'comedy': 'comedy',
  'country': 'country',
  'dance': 'dance',
  'dancehall': 'dancehall',
  'death-metal': 'death-metal',
  'deep-house': 'deep-house',
  'detroit-techno': 'detroit-techno',
  'disco': 'disco',
  'disney': 'disney',
  'drum-and-bass': 'drum-and-bass',
  'dub': 'dub',
  'dubstep': 'dubstep',
  'edm': 'edm',
  'electro': 'electro',
  'electronic': 'electronic',
  'emo': 'emo',
  'folk': 'folk',
  'forro': 'forro',
  'french': 'french',
  'funk': 'funk',
  'garage': 'garage',
  'german': 'german',
  'gospel': 'gospel',
  'goth': 'goth',
  'grindcore': 'grindcore',
  'groove': 'groove',
  'grunge': 'grunge',
  'guitar': 'guitar',
  'happy': 'happy',
  'hard-rock': 'hard-rock',
  'hardcore': 'hardcore',
  'hardstyle': 'hardstyle',
  'heavy-metal': 'heavy-metal',
  'hip-hop': 'hip-hop',
  'holidays': 'holidays',
  'honky-tonk': 'honky-tonk',
  'house': 'house',
  'idm': 'idm',
  'indian': 'indian',
  'indie': 'indie',
  'indie-pop': 'indie-pop',
  'industrial': 'industrial',
  'iranian': 'iranian',
  'j-dance': 'j-dance',
  'j-idol': 'j-idol',
  'j-pop': 'j-pop',
  'j-rock': 'j-rock',
  'jazz': 'jazz',
  'k-pop': 'k-pop',
  'kids': 'kids',
  'latin': 'latin',
  'latino': 'latino',
  'malay': 'malay',
  'mandopop': 'mandopop',
  'metal': 'metal',
  'metal-misc': 'metal-misc',
  'metalcore': 'metalcore',
  'minimal-techno': 'minimal-techno',
  'movies': 'movies',
  'mpb': 'mpb',
  'new-age': 'new-age',
  'new-release': 'new-release',
  'opera': 'opera',
  'pagode': 'pagode',
  'party': 'party',
  'philippines-opm': 'philippines-opm',
  'piano': 'piano',
  'pop': 'pop',
  'pop-film': 'pop-film',
  'post-dubstep': 'post-dubstep',
  'power-pop': 'power-pop',
  'progressive-house': 'progressive-house',
  'psych-rock': 'psych-rock',
  'punk': 'punk',
  'punk-rock': 'punk-rock',
  'r-n-b': 'r-n-b',
  'rainy-day': 'rainy-day',
  'reggae': 'reggae',
  'reggaeton': 'reggaeton',
  'road-trip': 'road-trip',
  'rock': 'rock',
  'rock-n-roll': 'rock-n-roll',
  'rockabilly': 'rockabilly',
  'romance': 'romance',
  'sad': 'sad',
  'salsa': 'salsa',
  'samba': 'samba',
  'sertanejo': 'sertanejo',
  'show-tunes': 'show-tunes',
  'singer-songwriter': 'singer-songwriter',
  'ska': 'ska',
  'sleep': 'sleep',
  'songwriter': 'songwriter',
  'soul': 'soul',
  'soundtracks': 'soundtracks',
  'spanish': 'spanish',
  'study': 'study',
  'summer': 'summer',
  'swedish': 'swedish',
  'synth-pop': 'synth-pop',
  'tango': 'tango',
  'techno': 'techno',
  'trance': 'trance',
  'trip-hop': 'trip-hop',
  'turkish': 'turkish',
  'work-out': 'work-out',
  'world-music': 'world-music',

  // Additional mappings for non-seed genre terms
  'tronic': 'electronic',
  'indie pop' : 'indie-pop',
  'tronica': 'electronic',
  'electra': 'electro',
  'experimental' : 'electronic',
  'synth': 'synth-pop',
  'synthpop' : 'synth-pop',
  'electropop': 'synth-pop',
  'electronic pop': 'synth-pop',
  'dance-pop': 'dance',
  'europop': 'pop',
  'standard' : 'jazz',
  'standards' : 'jazz',
  'rap': 'hip-hop',
  'r&b': 'r-n-b',
  'rhythm and blues': 'r-n-b',
  'rythm and blues': 'r-n-b',
  'rnb': 'r-n-b',
  'rhythm & blues': 'r-n-b',
  'electronica': 'electronic',
  'alt': 'alt-rock',
  'alternative rock': 'alt-rock',
  'indie rock': 'indie',
  'atmospheric': 'ambient',
  'background': 'ambient',
  'japanese animation': 'anime',
  'cartoon': 'anime',
  'manga': 'anime',
  'extreme metal': 'metal',
  'country grass': 'bluegrass',
  'appalachian': 'bluegrass',
  'bossa nova': 'bossanova',
  'brazilian jazz': 'bossanova',
  'brazilian': 'brazil',
  'breakbeats': 'breakbeat',
  'glitch pop': 'electronic',
  'big beat': 'breakbeat',
  'brit': 'british',
  'uk': 'british',
  'cantonese': 'cantopop',
  'hong kong': 'cantopop',
  'windy city': 'chicago-house',
  'kid': 'kids',
  'toddler': 'children',
  'relax': 'chill',
  'lounge': 'chill',
  'orchestra': 'classical',
  'baroque': 'classical',
  'stand-up': 'comedy',
  'funny': 'comedy',
  'ballroom': 'dance',
  'jamaican': 'dancehall',
  'reggae fusion': 'dancehall',
  'tech house': 'deep-house',
  'motown': 'soul',
  'motor city': 'detroit-techno',
  '70s': 'disco',
  'retro': 'disco',
  'mickey mouse': 'disney',
  'pixar': 'disney',
  'dnb': 'drum-and-bass',
  'jungle': 'drum-and-bass',
  'reggae dub': 'dub',
  'step': 'dubstep',
  'brostep': 'dubstep',
  'dance music': 'edm',
  'rave': 'edm',
  'electric': 'electronic',
  'screamo': 'emo',
  'emotional hardcore': 'emo',
  'traditional': 'world-music',
  'ethnic': 'world-music',
  'exercise': 'work-out',
  'fitness': 'work-out',
  'gym': 'work-out',
  'melancholy': 'sad',
  'depressing': 'sad',
  'gloomy': 'sad',
  'melodic': 'pop',
  'top 40': 'pop',
  'chart': 'pop',
  'mainstream': 'pop',
  'contemporary r&b': 'r-n-b',
  'experimental rock': 'psych-rock',
  'psychedelic': 'psych-rock',
  'progressive rock': 'progressive-house',
  'art rock': 'psych-rock',
  'score': 'soundtracks',
  'ost': 'soundtracks',
  'original soundtrack': 'soundtracks',
  'film music': 'soundtracks',
  'synthwave': 'synth-pop',
  'new wave': 'synth-pop',
  '80s': 'synth-pop',
  'eighties': 'synth-pop',
  'downtempo': 'trip-hop',
  'abstract hip hop': 'trip-hop',
  'afropop': 'afrobeat',
  'africanbeat': 'afrobeat'
};

function mapGenresToSeedGenres(artistGenres) {
  const mappedGenres = new Set();

  for (const genre of artistGenres) {
    const lowerGenre = genre.toLowerCase();
    
    // Check if the genre is an exact match to a seed genre
    if (seedGenres.includes(lowerGenre)) {
      mappedGenres.add(lowerGenre);
      continue;
    }

    // Check for keyword matches
    for (const [keyword, seedGenre] of Object.entries(genreKeywordMap)) {
      if (lowerGenre.includes(keyword)) {
        mappedGenres.add(seedGenre);
      }
    }
  }

  return Array.from(mappedGenres);
}

function extractSeedGenres(artistGenres) {
  const extractedGenres = new Set();
  
  for (let artistGenre of artistGenres) {
    artistGenre = artistGenre.toLowerCase();
    
    // Check for exact matches first
    if (genreKeywordMap[artistGenre]) {
      extractedGenres.add(genreKeywordMap[artistGenre]);
      continue;
    }
    
    // Check for compound genres
    let matchFound = false;
    for (const [keyword, seedGenre] of Object.entries(genreKeywordMap)) {
      if (keyword.includes('-') || keyword.includes(' ')) {
        if (artistGenre.includes(keyword)) {
          extractedGenres.add(seedGenre);
          matchFound = true;
          break;
        }
      }
    }
    
    // If no compound genre match was found, check for individual words
    if (!matchFound) {
      const words = artistGenre.split(/[\s-]+/);
      for (const word of words) {
        if (genreKeywordMap[word]) {
          extractedGenres.add(genreKeywordMap[word]);
        }
      }
    }
  }

  return Array.from(extractedGenres);
}

module.exports = {
  extractSeedGenres,
  mapGenresToSeedGenres
};