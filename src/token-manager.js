import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOKEN_STORAGE_PATH = path.join(__dirname, '../.token-storage.json');

/**
 * Save token data to the storage file
 * @param {Object} tokenData Object containing token information
 * @returns {Promise<boolean>} True if successful
 */
export async function saveTokenToStorage(tokenData) {
  try {
    // Make sure the token has all required fields
    const tokenToSave = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      created_at: Date.now()
    };
    
    await fs.writeFile(
      TOKEN_STORAGE_PATH, 
      JSON.stringify(tokenToSave, null, 2), 
      'utf8'
    );
    
    // Also update environment variables for the AI webhook
    process.env.SPOTIFY_ACCESS_TOKEN = tokenData.access_token;
    process.env.SPOTIFY_REFRESH_TOKEN = tokenData.refresh_token;
    process.env.SPOTIFY_TOKEN_EXPIRES_AT = tokenData.expires_at.toString();
    
    console.log('Token saved to storage:', TOKEN_STORAGE_PATH);
    return true;
  } catch (error) {
    console.error('Error saving token to storage:', error);
    return false;
  }
}

/**
 * Load token data from the storage file
 * @returns {Promise<Object|null>} Token data or null if not found
 */
export async function loadTokenFromStorage() {
  try {
    // Check if the file exists
    try {
      await fs.access(TOKEN_STORAGE_PATH);
    } catch (err) {
      // File doesn't exist yet, return null
      console.log('Token storage file does not exist yet');
      return null;
    }
    
    // Read and parse the file
    const data = await fs.readFile(TOKEN_STORAGE_PATH, 'utf8');
    const tokenData = JSON.parse(data);
    
    console.log('Token loaded from storage');
    return tokenData;
  } catch (error) {
    console.error('Error loading token from storage:', error);
    return null;
  }
}

/**
 * Initialize token storage
 * @returns {Promise<boolean>} True if successful
 */
export async function initializeTokenStorage() {
  try {
    // Check if the token file already exists
    try {
      await fs.access(TOKEN_STORAGE_PATH);
      console.log('Token storage file already exists');
      return true;
    } catch (err) {
      // File doesn't exist, create an empty one
      const emptyData = {
        access_token: null,
        refresh_token: null,
        expires_at: 0,
        created_at: Date.now(),
        initialized: true
      };
      
      await fs.writeFile(
        TOKEN_STORAGE_PATH, 
        JSON.stringify(emptyData, null, 2), 
        'utf8'
      );
      
      console.log('Created empty token storage file');
      return true;
    }
  } catch (error) {
    console.error('Error initializing token storage:', error);
    return false;
  }
}

/**
 * Check if token is expired
 * @param {Object} tokenData Token data
 * @returns {boolean} True if token is expired
 */
export function isTokenExpired(tokenData) {
  if (!tokenData || !tokenData.expires_at) {
    return true;
  }
  
  // Consider the token expired 1 minute before actual expiration
  const bufferTime = 60 * 1000; // 1 minute buffer
  return Date.now() > (tokenData.expires_at - bufferTime);
}

/**
 * Clear token from storage
 * @returns {Promise<boolean>} True if successful
 */
export async function clearTokenStorage() {
  try {
    const emptyData = {
      access_token: null,
      refresh_token: null,
      expires_at: 0,
      created_at: Date.now(),
      initialized: true
    };
    
    await fs.writeFile(
      TOKEN_STORAGE_PATH, 
      JSON.stringify(emptyData, null, 2), 
      'utf8'
    );
    
    console.log('Token storage cleared');
    return true;
  } catch (error) {
    console.error('Error clearing token storage:', error);
    return false;
  }
}
