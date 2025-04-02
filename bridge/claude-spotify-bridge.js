import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.BRIDGE_PORT || 3000;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:8888';
const API_KEY = process.env.AI_WEBHOOK_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Verify that the API key is configured
if (!API_KEY) {
  console.error('Error: AI_WEBHOOK_API_KEY is not configured. Please set it in your .env file.');
  process.exit(1);
}

// Claude bridge endpoint to forward commands to the MCP server
app.post('/claude/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    console.log(`Received command from Claude: ${command}`);
    
    // Forward the command to the MCP server
    const response = await axios.post(`${MCP_SERVER_URL}/ai/command`, 
      { command },
      { 
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      }
    );
    
    // Log the response
    console.log('MCP server response:', response.data);
    
    // Return the MCP server's response
    res.json(response.data);
  } catch (error) {
    console.error('Error forwarding command to MCP server:', error.message);
    
    if (error.response) {
      // The MCP server responded with an error
      console.error('MCP server error:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from MCP server');
      res.status(503).json({ 
        error: 'No response from MCP server', 
        message: 'The MCP server is not responding. Please ensure it is running.'
      });
    } else {
      // Something else went wrong
      res.status(500).json({ 
        error: 'Failed to send command to MCP server', 
        message: error.message 
      });
    }
  }
});

// Simple status endpoint
app.get('/status', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Claude-Spotify bridge is running',
    mcpServerUrl: MCP_SERVER_URL
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Claude-Spotify bridge is running on port ${PORT}`);
  console.log(`Ready to forward commands to ${MCP_SERVER_URL}`);
  console.log(`Test with: curl -X POST http://localhost:${PORT}/claude/command -H "Content-Type: application/json" -d '{"command":"status"}'`);
});
