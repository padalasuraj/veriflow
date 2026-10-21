import { readFileSync, writeFileSync } from 'node:fs';

// Run before committing/deploying; hosting routing is read before build commands.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/configure-hosting.mjs https://your-api.onrender.com');
const origin = new URL(input);
if (origin.protocol !== 'https:' || origin.origin !== input || origin.hostname.endsWith('.invalid')) {
  throw new Error('Supply the actual HTTPS backend origin without a path or trailing slash.');
}
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
vercel.rewrites[0].destination = `${origin.origin}/api/:path*`;
const netlify = readFileSync('netlify.toml', 'utf8').replace(/to = "https:\/\/[^"\n]+\/api\/:splat"/, `to = "${origin.origin}/api/:splat"`);
if (!netlify.includes(`to = "${origin.origin}/api/:splat"`)) throw new Error('API proxy rule missing from netlify.toml.');
writeFileSync('vercel.json', `${JSON.stringify(vercel, null, 2)}\n`);
writeFileSync('netlify.toml', netlify);
console.log(`Vercel and Netlify API proxies configured for ${origin.origin}. Commit both files before deployment.`);
