import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import SpotifyWebApi from 'spotify-web-api-node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import aiWebhook from './ai-webhook.js';
import { 
  saveTokenToStorage, 
  loadTokenFromStorage, 
  initializeTokenStorage,
  isTokenExpired
} from './token-manager.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8888;

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'spotify-mcp-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// Spotify authorization
app.get('/login', (req, res) => {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'app-remote-control'
  ];
  
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, 'state');
  res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    const { access_token, refresh_token, expires_in } = data.body;
    
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);
    
    // Store tokens in session
    req.session.access_token = access_token;
    req.session.refresh_token = refresh_token;
    req.session.expires_at = Date.now() + expires_in * 1000;
    
    // Save tokens to storage for the AI webhook
    await saveTokenToStorage({
      access_token,
      refresh_token,
      expires_at: Date.now() + expires_in * 1000
    });
    
    res.redirect('/');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('/#error=auth_error');
  }
});

// Middleware to check if user is authenticated
const ensureAuthenticated = async (req, res, next) => {
  if (!req.session.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  // Set the tokens from session
  spotifyApi.setAccessToken(req.session.access_token);
  spotifyApi.setRefreshToken(req.session.refresh_token);
  
  // Check if token needs refreshing
  if (Date.now() > req.session.expires_at) {
    try {
      const data = await spotifyApi.refreshAccessToken();
      const { access_token, expires_in } = data.body;
      
      spotifyApi.setAccessToken(access_token);
      
      // Update session
      req.session.access_token = access_token;
      req.session.expires_at = Date.now() + expires_in * 1000;
      
      // Update storage
      await saveTokenToStorage({
        access_token,
        refresh_token: req.session.refresh_token,
        expires_at: Date.now() + expires_in * 1000
      });
    } catch (error) {
      console.error('Error refreshing token:', error);
      return res.status(401).json({ error: 'Failed to refresh token' });
    }
  }
  
  next();
};

// API Routes
// Get playback status
app.get('/api/status', ensureAuthenticated, async (req, res) => {
  try {
    const data = await spotifyApi.getMyCurrentPlaybackState();
    res.json(data.body);
  } catch (error) {
    console.error('Error getting playback state:', error);
    res.status(500).json({ error: error.message });
  }
});

// Play
app.post('/api/play', ensureAuthenticated, async (req, res) => {
  try {
    await spotifyApi.play();
    res.json({ success: true });
  } catch (error) {
    console.error('Error playing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Pause
app.post('/api/pause', ensureAuthenticated, async (req, res) => {
  try {
    await spotifyApi.pause();
    res.json({ success: true });
  } catch (error) {
    console.error('Error pausing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Next track
app.post('/api/next', ensureAuthenticated, async (req, res) => {
  try {
    await spotifyApi.skipToNext();
    res.json({ success: true });
  } catch (error) {
    console.error('Error skipping to next:', error);
    res.status(500).json({ error: error.message });
  }
});

// Previous track
app.post('/api/previous', ensureAuthenticated, async (req, res) => {
  try {
    await spotifyApi.skipToPrevious();
    res.json({ success: true });
  } catch (error) {
    console.error('Error skipping to previous:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set volume
app.post('/api/volume', ensureAuthenticated, async (req, res) => {
  const { volume } = req.body;
  
  if (typeof volume !== 'number' || volume < 0 || volume > 100) {
    return res.status(400).json({ error: 'Volume must be a number between 0 and 100' });
  }
  
  try {
    await spotifyApi.setVolume(volume);
    res.json({ success: true });
  } catch (error) {
    console.error('Error setting volume:', error);
    res.status(500).json({ error: error.message });
  }
});

// Seek to position
app.post('/api/seek', ensureAuthenticated, async (req, res) => {
  const { position_ms } = req.body;
  
  if (typeof position_ms !== 'number' || position_ms < 0) {
    return res.status(400).json({ error: 'Position must be a positive number' });
  }
  
  try {
    await spotifyApi.seek(position_ms);
    res.json({ success: true });
  } catch (error) {
    console.error('Error seeking:', error);
    res.status(500).json({ error: error.message });
  }
});

// Play a specific track
app.post('/api/playTrack', ensureAuthenticated, async (req, res) => {
  const { uri } = req.body;
  
  if (!uri) {
    return res.status(400).json({ error: 'URI is required' });
  }
  
  try {
    await spotifyApi.play({ uris: [uri] });
    res.json({ success: true });
  } catch (error) {
    console.error('Error playing track:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search for tracks
app.get('/api/search', ensureAuthenticated, async (req, res) => {
  const { query, type = 'track', limit = 10 } = req.query;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  try {
    const data = await spotifyApi.search(query, [type], { limit });
    res.json(data.body);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mount AI webhook router
app.use('/ai', aiWebhook);

// Check token on server start and initialize the token storage
(async () => {
  try {
    // Initialize token storage (creates file if it doesn't exist)
    await initializeTokenStorage();
    
    // Load saved token
    const savedToken = await loadTokenFromStorage();
    if (savedToken && savedToken.access_token) {
      console.log('Loaded saved token from storage');
      
      // Set environment variables for the AI webhook
      process.env.SPOTIFY_ACCESS_TOKEN = savedToken.access_token;
      process.env.SPOTIFY_REFRESH_TOKEN = savedToken.refresh_token;
      process.env.SPOTIFY_TOKEN_EXPIRES_AT = savedToken.expires_at.toString();
      
      // If token is expired, try to refresh it
      if (isTokenExpired(savedToken) && savedToken.refresh_token) {
        console.log('Saved token is expired, attempting to refresh...');
        
        try {
          spotifyApi.setRefreshToken(savedToken.refresh_token);
          const data = await spotifyApi.refreshAccessToken();
          
          // Save the new token
          const newTokenData = {
            access_token: data.body.access_token,
            refresh_token: savedToken.refresh_token,
            expires_at: Date.now() + data.body.expires_in * 1000
          };
          
          await saveTokenToStorage(newTokenData);
          console.log('Token refreshed successfully');
          
          // Update environment variables
          process.env.SPOTIFY_ACCESS_TOKEN = newTokenData.access_token;
          process.env.SPOTIFY_REFRESH_TOKEN = newTokenData.refresh_token;
          process.env.SPOTIFY_TOKEN_EXPIRES_AT = newTokenData.expires_at.toString();
        } catch (refreshError) {
          console.error('Error refreshing token on startup:', refreshError);
          console.log('You will need to re-authenticate');
        }
      }
    } else {
      console.log('No valid token found. You need to authenticate via the web interface first.');
    }
  } catch (error) {
    console.error('Error during startup token check:', error);
  }
})();

// Start the server
app.listen(PORT, () => {
  console.log(`Spotify MCP Server is running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to get started`);
  console.log(`AI webhook available at http://localhost:${PORT}/ai/command`);
});
