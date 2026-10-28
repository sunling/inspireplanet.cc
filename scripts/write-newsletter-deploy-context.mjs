import { mkdir, writeFile } from 'node:fs/promises';
const directory = new URL('../src/netlify/generated/', import.meta.url);
await mkdir(directory, { recursive: true });
const context = process.env.CONTEXT || 'development';
await writeFile(
  new URL('newsletterDeployment.json', directory),
  JSON.stringify({ production: context === 'production', context }) + '\n'
);
console.log(
  `Newsletter deployment: ${context === 'production' ? 'production' : 'sending disabled'}`
);
