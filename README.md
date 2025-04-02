# Spotify MCP Server

A Media Control Protocol (MCP) server that provides a unified interface for controlling Spotify playback across different devices and applications.

## Features

- Control Spotify playback (play, pause, skip, previous)
- Adjust volume
- Search for and play specific tracks, albums, or playlists
- Get current playback information
- RESTful API for easy integration with other applications
- AI Assistant integration for controlling Spotify with natural language
- Voice control interface for speaking commands to Spotify

## Prerequisites

- Node.js (v16 or later)
- npm (v8 or later)
- Spotify Premium account
- Spotify Developer account and registered application

## Setup

1. Clone this repository:
   ```
   git clone https://github.com/Jopgood/spotify-mcp-server.git
   cd spotify-mcp-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   CLIENT_ID=your_spotify_client_id
   CLIENT_SECRET=your_spotify_client_secret
   REDIRECT_URI=http://localhost:8888/callback
   PORT=8888
   SESSION_SECRET=your_random_session_secret
   AI_WEBHOOK_API_KEY=your_secure_api_key_for_ai_assistant
   BRIDGE_PORT=3001
   VOICE_PORT=3002
   ```

4. Register a Spotify application at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) and note your Client ID and Client Secret.

## Usage

1. Start the MCP server:
   ```
   npm start
   ```

2. Open a browser and navigate to `http://localhost:8888` to authenticate with Spotify.

3. Once authenticated, you can use the API endpoints to control Spotify.

## API Endpoints

- `GET /api/status` - Get current playback status
- `POST /api/play` - Start or resume playback
- `POST /api/pause` - Pause playback
- `POST /api/next` - Skip to next track
- `POST /api/previous` - Go to previous track
- `POST /api/volume` - Set volume (body: `{ "volume": 50 }`)
- `POST /api/seek` - Seek to position (body: `{ "position_ms": 30000 }`)
- `POST /api/playTrack` - Play a specific track (body: `{ "uri": "spotify:track:xxxx" }`)

## Client Examples

### Using curl

```bash
# Play
curl -X POST http://localhost:8888/api/play

# Pause
curl -X POST http://localhost:8888/api/pause

# Next track
curl -X POST http://localhost:8888/api/next
```

### Using JavaScript (fetch)

```javascript
// Play a specific track
fetch('http://localhost:8888/api/playTrack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    uri: 'spotify:track:6rqhFgbbKwnb9MLmUQDhG6'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```

## Command Line Interface

A command-line interface is included for controlling Spotify from the terminal:

```bash
# Run the CLI
node client/spotify-cli.js

# Available commands
status          # Show current playback status
play            # Start/resume playback
pause           # Pause playback
next            # Skip to next track
prev            # Go to previous track
volume 50       # Set volume to 50%
search bohemian # Search for tracks with "bohemian" in the title
play-track spotify:track:xxxx # Play a specific track by URI
```

## AI Assistant Integration

This MCP server includes an AI webhook that allows AI assistants like Claude to control your Spotify through natural language commands.

### Setting up the Integration

1. Configure the webhook API key in your `.env` file:
   ```
   AI_WEBHOOK_API_KEY=your_secure_random_key
   ```

2. Start the Claude-Spotify bridge service:
   ```
   node bridge/claude-spotify-bridge.js
   ```

3. The bridge will run on port 3001 by default. You can customize this by adding `BRIDGE_PORT=xxxx` to your `.env` file.

### Running Claude Spotify Commands

Use the provided client script to execute Claude's Spotify commands:

```bash
node client/claude-spotify-client.js "play bohemian rhapsody"
```

### Supported Natural Language Commands

The AI webhook supports commands like:

- "Play Bohemian Rhapsody by Queen"
- "Play playlist chill vibes"
- "Pause the music"
- "Resume playback"
- "Skip to the next track"
- "Go back to the previous song"
- "Set volume to 50%"
- "Turn volume up"
- "Turn volume down"
- "What's currently playing?"

## Voice Control

For hands-free operation, you can use the voice control interface to speak commands to Spotify.

### Setting up Voice Control

1. Start the voice control server:
   ```
   node speech/voice-server.js
   ```

2. Open a browser and navigate to `http://localhost:3002` to access the voice control interface.

3. Make sure the bridge service is running:
   ```
   node bridge/claude-spotify-bridge.js
   ```

4. Click the microphone button and speak your command, starting with "Claude" (e.g., "Claude, play some jazz music").

### Browser Compatibility

The voice control interface uses the Web Speech API, which is not supported in all browsers. For best results, use:
- Google Chrome (recommended)
- Microsoft Edge
- Safari

Firefox has limited support for the Web Speech API and may not work as expected.

### Customizing the Voice Trigger

You can change the trigger phrase from "Claude" to anything you prefer by:
1. Going to the Settings section in the voice control interface
2. Entering your preferred trigger phrase
3. Clicking "Save Settings"

Your preferences will be saved in your browser for future sessions.

## Running Everything at Once

To run the complete system (MCP server, bridge, and voice interface), you can:

1. Start each component in separate terminal windows:
   ```bash
   # Terminal 1: Start MCP server
   npm start
   
   # Terminal 2: Start Claude bridge
   node bridge/claude-spotify-bridge.js
   
   # Terminal 3: Start voice interface
   node speech/voice-server.js
   ```

2. Or create a simple start script to run everything at once:
   ```javascript
   // Create a file called start-all.js in the root directory with:
   const { spawn } = require('child_process');
   
   const mcp = spawn('npm', ['start'], { stdio: 'inherit' });
   setTimeout(() => {
     const bridge = spawn('node', ['bridge/claude-spotify-bridge.js'], { stdio: 'inherit' });
     const voice = spawn('node', ['speech/voice-server.js'], { stdio: 'inherit' });
   }, 2000);
   
   // Usage: node start-all.js
   ```

## Troubleshooting

- **"Port already in use" error**: 
  - Change the port numbers in your `.env` file: `PORT`, `BRIDGE_PORT`, `VOICE_PORT`
  
- **Authentication issues**: 
  - Make sure you've visited the web interface at `http://localhost:8888` and authenticated with Spotify
  - Check that your Client ID and Secret are correct in `.env`
  
- **Voice control not working**:
  - Ensure you're using a compatible browser (Chrome recommended)
  - Check that your microphone is working and has the necessary permissions
  - Verify the bridge URL in the voice interface settings matches your bridge server address

- **"No active device" error**:
  - Start playing something in Spotify on any device, then try again
  - Spotify requires an active device to control playback

## Development

To run in development mode with automatic reloading:

```
npm run dev
```

## License

MIT
