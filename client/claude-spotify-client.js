#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3001';
const COMMAND_LOG_PATH = path.join(__dirname, '../logs/commands.log');

// Ensure log directory exists
async function ensureLogDirectoryExists() {
  const logDir = path.dirname(COMMAND_LOG_PATH);
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    console.error('Error creating log directory:', error);
  }
}

// Log command and response
async function logCommandAndResponse(command, response) {
  await ensureLogDirectoryExists();
  
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] Command: "${command}"\nResponse: ${JSON.stringify(response, null, 2)}\n\n`;
  
  try {
    await fs.appendFile(COMMAND_LOG_PATH, logEntry, 'utf8');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

// Send command to Claude bridge
async function executeSpotifyCommand(command) {
  try {
    console.log(`Sending command to Claude bridge: "${command}"`);
    
    const response = await axios.post(`${BRIDGE_URL}/claude/command`, 
      { command },
      { 
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Log command and response
    await logCommandAndResponse(command, response.data);
    
    // Return response data
    return response.data;
  } catch (error) {
    console.error('Error sending command to Claude bridge:');
    
    if (error.response) {
      // The bridge server responded with an error
      console.error('Bridge error:', error.response.data);
      await logCommandAndResponse(command, { error: error.response.data });
      return error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from bridge server');
      const errorData = { error: 'No response from bridge server' };
      await logCommandAndResponse(command, errorData);
      return errorData;
    } else {
      // Something else went wrong
      console.error(error.message);
      const errorData = { error: error.message };
      await logCommandAndResponse(command, errorData);
      return errorData;
    }
  }
}

// Main function
async function main() {
  // Get command from command line arguments
  const command = process.argv.slice(2).join(' ');
  
  if (!command) {
    console.error('No command provided. Usage: node claude-spotify-client.js "play bohemian rhapsody"');
    process.exit(1);
  }
  
  try {
    const result = await executeSpotifyCommand(command);
    
    if (result.success) {
      console.log('\n✅ Success:', result.message);
      
      // If there are details in the response, show them
      if (result.details) {
        console.log('\nDetails:');
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      }
    } else {
      console.error('\n❌ Error:', result.message || 'Unknown error');
    }
  } catch (error) {
    console.error('\n❌ Execution error:', error.message);
  }
}

// Run the main function
main().catch(console.error);
