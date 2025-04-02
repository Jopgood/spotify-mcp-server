# Spotify MCP Server

A Media Control Protocol (MCP) server that provides a unified interface for controlling Spotify playback across different devices and applications.

## Features

- Control Spotify playback (play, pause, skip, previous)
- Adjust volume
- Search for and play specific tracks, albums, or playlists
- Get current playback information
- RESTful API for easy integration with other applications
- AI Assistant integration for controlling Spotify with natural language

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
   ```

4. Register a Spotify application at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/) and note your Client ID and Client Secret.

## Usage

1. Start the server:
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

3. The bridge will run on port 3000 by default. You can customize this by adding `BRIDGE_PORT=xxxx` to your `.env` file.

### Exposing the Bridge to the Internet

For Claude to access your bridge, you need to expose it to the internet. You can use a service like ngrok:

1. Install ngrok: [https://ngrok.com/download](https://ngrok.com/download)

2. Expose your bridge:
   ```
   ngrok http 3000
   ```

3. Note the HTTPS URL that ngrok provides (e.g., `https://abcd1234.ngrok.io`)

### Connecting Claude to Your Spotify

Claude can now control your Spotify through natural language commands by sending requests to the bridge. Create a simple endpoint or function that forwards Claude's commands to your bridge.

Example implementation:

```javascript
async function controlSpotify(command) {
  try {
    const response = await fetch('https://your-ngrok-url/claude/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error controlling Spotify:', error);
    return { error: 'Failed to control Spotify' };
  }
}

// Example usage:
// controlSpotify("Play Bohemian Rhapsody by Queen");
// controlSpotify("Pause the music");
// controlSpotify("Skip to the next track");
// controlSpotify("Set volume to 70%");
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

## Development

To run in development mode with automatic reloading:

```
npm run dev
```

## License

MIT
