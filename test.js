const { findMatchingSongs } = require('./songMatcher');
const { getAccessToken } = require('./spotifyAuth');

async function runTest() {
  try {
    const accessToken = await getAccessToken();
    const song1Id = '3Gi5nk0bgPcPVgUK4nrBY8';  // Replace with your actual track ID
    const song2Id = '47Y7zbY54UmViUUDUrq7Sk';  // Replace with your actual track ID
    
    const matchingSongs = await findMatchingSongs(song1Id, song2Id, accessToken);
    
    console.log('Matching Songs:');
    if (matchingSongs.length > 0) {
      matchingSongs.forEach((track, index) => {
        console.log(`${index + 1}. "${track.name}" by ${track.artists.map(a => a.name).join(', ')}`);
      });
    } else {
      console.log('No matching songs found.');
    }
  } catch (error) {
    console.error('Error running test:', error);
  }
}

runTest();