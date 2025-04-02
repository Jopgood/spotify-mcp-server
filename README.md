# Spotify MCP Server

A Media Control Protocol (MCP) server that provides a unified interface for controlling Spotify playback across different devices and applications.

## Features

- Control Spotify playback (play, pause, skip, previous)
- Adjust volume
- Search for and play specific tracks, albums, or playlists
- Get current playback information
- RESTful API for easy integration with other applications

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

## Development

To run in development mode with automatic reloading:

```
npm run dev
```

## License

MIT
