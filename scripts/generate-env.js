import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../src/environments/environment.ts');
const examplePath = path.join(__dirname, '../src/environments/environment.example.ts');

// Ensure the environments directory exists
const envDir = path.dirname(envPath);
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

if (fs.existsSync(envPath)) {
  console.log('environment.ts already exists. Skipping generation.');
} else {
  // Use API_KEY from environment variables or fallback to a placeholder/example
  // Note: On Vercel, you should set API_KEY in the project settings.
  const apiKey = process.env.API_KEY || 'PLACEHOLDER_API_KEY';
  
  const content = `export const environment = {
  production: true,
  apiKey: '${apiKey}'
};
`;
  
  try {
    fs.writeFileSync(envPath, content);
    console.log('Successfully generated environment.ts from environment variables.');
  } catch (error) {
    console.error('Error generating environment.ts:', error);
    process.exit(1);
  }
}
