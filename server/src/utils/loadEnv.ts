import * as fs from 'fs';
import * as path from 'path';

/**
 * Simple .env file loader - no dependencies needed
 * Looks for .env file in project root (two directories up from src/)
 */
export function loadEnv(): void {
  const envPath = path.resolve(__dirname, '../../../.env');
  
  if (!fs.existsSync(envPath)) {
    console.warn(`Warning: .env file not found at ${envPath}`);
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      
      // Only set if not already in environment
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
