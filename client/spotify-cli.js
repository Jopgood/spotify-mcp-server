#!/usr/bin/env node

import axios from 'axios';
import readline from 'readline';

// Default server URL
const SERVER_URL = process.env.SPOTIFY_MCP_SERVER || 'http://localhost:8888';

// Create readline interface for command-line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to make API requests
async function callApi(endpoint, method = 'GET', data = null) {
  try {
    const url = `${SERVER_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      options.data = data;
    }
    
    const response = await axios(url, options);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Error (${error.response.status}): ${error.response.data.error || 'Unknown error'}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
    return null;
  }
}

// Format track information
function formatTrackInfo(data) {
  if (!data || !data.item) {
    return 'Not playing';
  }
  
  const { item } = data;
  const artists = item.artists.map(artist => artist.name).join(', ');
  const album = item.album.name;
  const progress = Math.floor(data.progress_ms / 1000);
  const duration = Math.floor(item.duration_ms / 1000);
  
  return `
Playing: ${item.name}
By: ${artists}
Album: ${album}
Progress: ${formatTime(progress)} / ${formatTime(duration)}
Volume: ${data.device.volume_percent}%
Device: ${data.device.name}
  `.trim();
}

// Format time from seconds to MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Format search results
function formatSearchResults(data) {
  if (!data || !data.tracks || !data.tracks.items.length) {
    return 'No tracks found';
  }
  
  return data.tracks.items.map((track, index) => {
    const artists = track.artists.map(artist => artist.name).join(', ');
    return `${index + 1}. "${track.name}" by ${artists} [${track.uri}]`;
  }).join('\n');
}

// Display available commands
function showHelp() {
  console.log(`
Spotify MCP CLI - Available Commands:
  status         - Show current playback status
  play           - Start/resume playback
  pause          - Pause playback
  next           - Skip to next track
  prev           - Go to previous track
  volume <level> - Set volume (0-100)
  search <query> - Search for tracks
  play-track <uri> - Play a specific track by URI
  exit           - Exit the CLI
  help           - Show this help menu
  `);
}

// Main function
async function main() {
  console.log('Spotify MCP CLI - Connect to your MCP Server');
  console.log(`Server: ${SERVER_URL}`);
  console.log('Type "help" for available commands');
  
  // Check server connection
  try {
    await axios.get(`${SERVER_URL}/api/status`);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('\nPlease authenticate with Spotify first:');
      console.log(`1. Open ${SERVER_URL} in your browser`);
      console.log('2. Click "Connect with Spotify"');
      console.log('3. Log in and authorize the application');
      console.log('4. Come back to this CLI\n');
    } else {
      console.error(`Error connecting to server: ${error.message}`);
      console.log(`Please make sure the server is running at ${SERVER_URL}`);
    }
  }
  
  promptCommand();
}

// Prompt for command
function promptCommand() {
  rl.question('> ', async (input) => {
    const [command, ...args] = input.trim().split(' ');
    
    switch (command.toLowerCase()) {
      case 'status':
        const status = await callApi('/api/status');
        if (status) {
          console.log(formatTrackInfo(status));
        }
        break;
        
      case 'play':
        await callApi('/api/play', 'POST');
        console.log('Playback started');
        break;
        
      case 'pause':
        await callApi('/api/pause', 'POST');
        console.log('Playback paused');
        break;
        
      case 'next':
        await callApi('/api/next', 'POST');
        console.log('Skipped to next track');
        break;
        
      case 'prev':
        await callApi('/api/previous', 'POST');
        console.log('Skipped to previous track');
        break;
        
      case 'volume':
        const volume = parseInt(args[0]);
        if (isNaN(volume) || volume < 0 || volume > 100) {
          console.log('Volume must be a number between 0 and 100');
        } else {
          await callApi('/api/volume', 'POST', { volume });
          console.log(`Volume set to ${volume}%`);
        }
        break;
        
      case 'search':
        const query = args.join(' ');
        if (!query) {
          console.log('Please provide a search query');
        } else {
          const results = await callApi(`/api/search?query=${encodeURIComponent(query)}`);
          if (results) {
            console.log(formatSearchResults(results));
          }
        }
        break;
        
      case 'play-track':
        const uri = args[0];
        if (!uri) {
          console.log('Please provide a track URI');
        } else {
          await callApi('/api/playTrack', 'POST', { uri });
          console.log(`Playing track: ${uri}`);
        }
        break;
        
      case 'help':
        showHelp();
        break;
        
      case 'exit':
      case 'quit':
        rl.close();
        return;
        
      case '':
        // Empty input, do nothing
        break;
        
      default:
        console.log(`Unknown command: ${command}. Type "help" for available commands.`);
    }
    
    promptCommand();
  });
}

// Start the CLI
main().catch(error => {
  console.error('Error starting CLI:', error);
  process.exit(1);
});

// Handle exit
rl.on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});
