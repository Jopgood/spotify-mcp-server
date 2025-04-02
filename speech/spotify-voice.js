#!/usr/bin/env node

import childProcess from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CLIENT_PATH = path.join(__dirname, '../client/claude-spotify-client.js');
const TRIGGER_PHRASE = process.env.TRIGGER_PHRASE || 'claude';
const SPOTIFY_KEYWORDS = ['play', 'pause', 'volume', 'skip', 'next', 'previous', 'status', 'music', 'song', 'playlist', 'spotify'];

// Function to check if a command is Spotify-related
function isSpotifyCommand(command) {
  const lowerCommand = command.toLowerCase();
  return SPOTIFY_KEYWORDS.some(keyword => lowerCommand.includes(keyword));
}

// Function to extract the actual command by removing the trigger phrase
function extractCommand(input) {
  const lowerInput = input.toLowerCase();
  const triggerIndex = lowerInput.indexOf(TRIGGER_PHRASE.toLowerCase());
  
  if (triggerIndex === -1) {
    return input; // No trigger found, return the original input
  }
  
  // Return everything after the trigger phrase
  return input.substring(triggerIndex + TRIGGER_PHRASE.length).trim();
}

// Function to execute the Spotify command
async function executeSpotifyCommand(command) {
  try {
    console.log(`Executing Spotify command: "${command}"`);
    
    // Execute the client script with the command
    const process = childProcess.spawn('node', [CLIENT_PATH, command], {
      stdio: 'inherit'
    });
    
    return new Promise((resolve, reject) => {
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}`));
        }
      });
      
      process.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error executing Spotify command:', error);
    throw error;
  }
}

// Main function - this would be called by your speech recognition system
export async function processVoiceCommand(voiceInput) {
  try {
    console.log(`Received voice input: "${voiceInput}"`);
    
    // Check if the input contains the trigger phrase
    if (!voiceInput.toLowerCase().includes(TRIGGER_PHRASE.toLowerCase())) {
      console.log('Trigger phrase not detected, ignoring command');
      return {
        success: false,
        message: 'Trigger phrase not detected'
      };
    }
    
    // Extract the actual command
    const command = extractCommand(voiceInput);
    
    // Check if it's a Spotify-related command
    if (!isSpotifyCommand(command)) {
      console.log('Not a Spotify command, ignoring');
      return {
        success: false,
        message: 'Not a Spotify command'
      };
    }
    
    // Execute the Spotify command
    await executeSpotifyCommand(command);
    
    return {
      success: true,
      message: `Executed command: ${command}`
    };
  } catch (error) {
    console.error('Error processing voice command:', error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// This is just a placeholder for demonstration
// In a real implementation, you would integrate with a speech recognition API
async function mockSpeechRecognition() {
  console.log('🎤 Listening for voice commands...');
  console.log('Say something like "Claude, play some music" or "Claude, what song is playing?"');
  
  // This is where you'd integrate with a real speech recognition system
  // For demonstration purposes, we'll just simulate some commands
  const mockCommands = [
    "Claude, play some relaxing music",
    "What time is it?", // Not a Spotify command, should be ignored
    "Claude, turn up the volume",
    "Claude, what song is playing right now?"
  ];
  
  for (const command of mockCommands) {
    console.log(`\nSimulating voice input: "${command}"`);
    const result = await processVoiceCommand(command);
    
    if (result.success) {
      console.log(`✅ ${result.message}`);
    } else {
      console.log(`ℹ️ ${result.message}`);
    }
    
    // Wait a bit between commands
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// If this script is run directly, execute the mock function
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mockSpeechRecognition().catch(console.error);
}
