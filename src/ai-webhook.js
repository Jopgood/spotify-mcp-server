// AI Assistant webhook integration
import express from 'express';
import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import {
  loadTokenFromStorage,
  saveTokenToStorage,
  isTokenExpired
} from './token-manager.js';

dotenv.config();

// Initialize Spotify API client with credentials
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// Setup the router
const router = express.Router();

// Middleware to verify the API key
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.AI_WEBHOOK_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }
  
  next();
};

// Middleware to ensure the Spotify API has a valid token
const ensureToken = async (req, res, next) => {
  try {
    // Load token from storage
    const tokenData = await loadTokenFromStorage();
    
    if (!tokenData || !tokenData.access_token) {
      return res.status(401).json({ 
        error: 'Not authenticated with Spotify',
        message: 'Please open the web interface and authenticate with Spotify first' 
      });
    }
    
    // Set tokens
    spotifyApi.setAccessToken(tokenData.access_token);
    spotifyApi.setRefreshToken(tokenData.refresh_token);
    
    // Check if token needs refreshing
    if (isTokenExpired(tokenData)) {
      try {
        console.log('AI webhook: Token expired, refreshing...');
        const data = await spotifyApi.refreshAccessToken();
        spotifyApi.setAccessToken(data.body.access_token);
        
        // Save the refreshed token
        await saveTokenToStorage({
          access_token: data.body.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: Date.now() + (data.body.expires_in * 1000)
        });
        
        console.log('AI webhook: Token refreshed successfully');
      } catch (refreshError) {
        console.error('AI webhook: Error refreshing token:', refreshError);
        return res.status(401).json({ 
          error: 'Failed to refresh Spotify token', 
          message: 'Please re-authenticate with Spotify'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('AI webhook: Error ensuring token:', error);
    res.status(500).json({ error: 'Failed to authorize with Spotify' });
  }
};

// Natural language command parser
function parseCommand(command) {
  command = command.toLowerCase();
  
  // Play commands
  if (command.includes('play') && !command.includes('playlist')) {
    // Play specific song/artist
    const match = command.match(/play\s+(.+)/i);
    if (match && match[1]) {
      return { action: 'search-and-play', query: match[1] };
    }
    // Just play (resume)
    return { action: 'play' };
  }
  
  // Play playlist 
  if (command.includes('play') && command.includes('playlist')) {
    const match = command.match(/play\s+playlist\s+(.+)/i);
    if (match && match[1]) {
      return { action: 'play-playlist', query: match[1] };
    }
  }
  
  // Standard commands
  if (command.includes('pause')) return { action: 'pause' };
  if (command.includes('resume')) return { action: 'play' };
  if (command.includes('skip') || command.includes('next')) return { action: 'next' };
  if (command.includes('previous') || command.includes('go back')) return { action: 'previous' };
  
  // Volume commands
  const volumeMatch = command.match(/(?:set\s+)?volume\s+(?:to\s+)?(\d+)(?:\s*%)?/i);
  if (volumeMatch && volumeMatch[1]) {
    const volume = parseInt(volumeMatch[1]);
    if (!isNaN(volume) && volume >= 0 && volume <= 100) {
      return { action: 'volume', level: volume };
    }
  }
  
  if (command.includes('volume up')) return { action: 'volume-up' };
  if (command.includes('volume down')) return { action: 'volume-down' };
  
  // Status command
  if (command.includes('status') || command.includes('what') && command.includes('playing')) {
    return { action: 'status' };
  }
  
  return { action: 'unknown', originalCommand: command };
}

// Webhook endpoint for AI assistant
router.post('/command', verifyApiKey, ensureToken, async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    console.log(`Received command: ${command}`);
    
    // Parse the command
    const parsedCommand = parseCommand(command);
    console.log('Parsed command:', parsedCommand);
    
    // Execute the command
    let result;
    switch (parsedCommand.action) {
      case 'play':
        await spotifyApi.play();
        result = { success: true, message: 'Playback started' };
        break;
      
      case 'pause':
        await spotifyApi.pause();
        result = { success: true, message: 'Playback paused' };
        break;
      
      case 'next':
        await spotifyApi.skipToNext();
        result = { success: true, message: 'Skipped to next track' };
        break;
      
      case 'previous':
        await spotifyApi.skipToPrevious();
        result = { success: true, message: 'Skipped to previous track' };
        break;
      
      case 'volume':
        await spotifyApi.setVolume(parsedCommand.level);
        result = { success: true, message: `Volume set to ${parsedCommand.level}%` };
        break;
      
      case 'volume-up': {
        // Get current volume and increase by 10%
        const state = await spotifyApi.getMyCurrentPlaybackState();
        const currentVolume = state.body.device.volume_percent;
        const newVolume = Math.min(100, currentVolume + 10);
        await spotifyApi.setVolume(newVolume);
        result = { success: true, message: `Volume increased to ${newVolume}%` };
        break;
      }
      
      case 'volume-down': {
        // Get current volume and decrease by 10%
        const state = await spotifyApi.getMyCurrentPlaybackState();
        const currentVolume = state.body.device.volume_percent;
        const newVolume = Math.max(0, currentVolume - 10);
        await spotifyApi.setVolume(newVolume);
        result = { success: true, message: `Volume decreased to ${newVolume}%` };
        break;
      }
      
      case 'search-and-play': {
        // Search for tracks
        const searchResults = await spotifyApi.searchTracks(parsedCommand.query, { limit: 1 });
        
        if (searchResults.body.tracks.items.length > 0) {
          const track = searchResults.body.tracks.items[0];
          await spotifyApi.play({ uris: [track.uri] });
          result = { 
            success: true, 
            message: `Playing "${track.name}" by ${track.artists.map(a => a.name).join(', ')}` 
          };
        } else {
          result = { success: false, message: `No tracks found for "${parsedCommand.query}"` };
        }
        break;
      }
      
      case 'play-playlist': {
        // Search for playlists
        const searchResults = await spotifyApi.searchPlaylists(parsedCommand.query, { limit: 1 });
        
        if (searchResults.body.playlists.items.length > 0) {
          const playlist = searchResults.body.playlists.items[0];
          await spotifyApi.play({ context_uri: playlist.uri });
          result = { success: true, message: `Playing playlist "${playlist.name}"` };
        } else {
          result = { success: false, message: `No playlists found for "${parsedCommand.query}"` };
        }
        break;
      }
      
      case 'status': {
        try {
          const state = await spotifyApi.getMyCurrentPlaybackState();
          
          if (state.body && state.body.item) {
            const { item } = state.body;
            const artists = item.artists.map(artist => artist.name).join(', ');
            result = {
              success: true,
              message: `Currently playing "${item.name}" by ${artists}`,
              details: {
                track: item.name,
                artists,
                album: item.album.name,
                isPlaying: state.body.is_playing,
                volume: state.body.device.volume_percent,
                device: state.body.device.name
              }
            };
          } else {
            result = { success: true, message: 'Not currently playing anything' };
          }
        } catch (statusError) {
          console.error('Error getting playback state:', statusError);
          
          // Check if the error is because no active device was found
          if (statusError.message && statusError.message.includes('NO_ACTIVE_DEVICE')) {
            result = { 
              success: true, 
              message: 'No active Spotify device found. Please start playing on a device first.'
            };
          } else {
            throw statusError; // Re-throw to be caught by the outer catch
          }
        }
        break;
      }
      
      default:
        result = { 
          success: false, 
          message: 'I did not understand that command',
          originalCommand: command 
        };
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error processing command:', error);
    
    // Try to determine if it's a common Spotify API error
    let errorMessage = 'Failed to process command';
    
    if (error.message) {
      if (error.message.includes('NO_ACTIVE_DEVICE')) {
        errorMessage = 'No active Spotify device found. Please start playing on a device first.';
      } else if (error.message.includes('PREMIUM_REQUIRED')) {
        errorMessage = 'This feature requires a Spotify Premium account.';
      } else if (error.message.includes('NOT_FOUND')) {
        errorMessage = 'The requested resource was not found on Spotify.';
      }
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message 
    });
  }
});

export default router;
