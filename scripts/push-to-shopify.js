#!/usr/bin/env node

/**
 * Direct Shopify Theme Deployment Script
 * Connects directly to Shopify Admin API via Client Credentials OAuth
 * and syncs modified theme assets to selected themes.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (!process.env[k]) process.env[k] = v;
      }
    }
  }
}

const STORE = process.env.SHOPIFY_STORE || 'araadhyafashion.myshopify.com';
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const BASE_DIR = path.resolve(__dirname, '..', 'shopify-theme');

// Target Themes:
// 189186605282 = "Araadhya – Storefront fixes preview" (Draft / Active preview in user browser)
// 189170057442 = "Araadhya – Product page polish v26" (Main Live Theme)
const TARGET_THEMES = process.env.THEME_IDS
  ? process.env.THEME_IDS.split(',').map(s => s.trim())
  : ['189186605282', '189170057442'];

const ASSETS_TO_PUSH = [
  'sections/aa-product.liquid',
  'sections/aa-collection.liquid',
  'sections/aa-price-anchor.liquid',
  'sections/annoucement.liquid',
  'sections/page-search.liquid',
  'snippets/aa-currency-switcher.liquid',
  'snippets/search-popup.liquid',
  'templates/product.json',
  'templates/index.json'
];

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function getAccessToken() {
  console.log(`Authenticating with Shopify Admin OAuth on ${STORE}...`);
  const res = await request({
    hostname: STORE,
    path: '/admin/oauth/access_token',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'client_credentials'
  });

  if (res.statusCode !== 200 || !res.data.access_token) {
    throw new Error(`Failed to authenticate: ${res.statusCode} ${JSON.stringify(res.data)}`);
  }

  console.log(`Authenticated successfully! Scope: ${res.data.scope}`);
  return res.data.access_token;
}

async function getThemeInfo(token, themeId) {
  const res = await request({
    hostname: STORE,
    path: `/admin/api/2024-01/themes/${themeId}.json`,
    method: 'GET',
    headers: { 'X-Shopify-Access-Token': token }
  });
  if (res.statusCode === 200 && res.data.theme) {
    return res.data.theme;
  }
  return { id: themeId, name: `Theme #${themeId}`, role: 'unknown' };
}

async function pushAsset(token, themeId, assetKey, content) {
  const payload = JSON.stringify({
    asset: {
      key: assetKey,
      value: content
    }
  });

  const res = await request({
    hostname: STORE,
    path: `/admin/api/2024-01/themes/${themeId}/assets.json`,
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);

  if (res.statusCode !== 200) {
    throw new Error(`Failed to upload ${assetKey} to theme ${themeId}: ${res.statusCode} ${JSON.stringify(res.data)}`);
  }

  return res.data.asset;
}

async function main() {
  console.log('='.repeat(60));
  console.log('   ARAADHYA FASHION DIRECT SHOPIFY THEME DEPLOYMENT   ');
  console.log('='.repeat(60));

  const token = await getAccessToken();

  for (const themeId of TARGET_THEMES) {
    const themeInfo = await getThemeInfo(token, themeId);
    console.log(`\nDeploying to Theme: "${themeInfo.name}" (ID: ${themeInfo.id}, Role: ${themeInfo.role})`);
    console.log('-'.repeat(55));

    for (const key of ASSETS_TO_PUSH) {
      const filePath = path.join(BASE_DIR, key);
      if (!fs.existsSync(filePath)) {
        console.warn(`[SKIP] Local file not found: ${filePath}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      process.stdout.write(`  Uploading ${key} (${content.length} bytes)... `);

      try {
        const result = await pushAsset(token, themeId, key, content);
        console.log(`OK (checksum: ${result.checksum.substring(0, 8)})`);
      } catch (err) {
        console.log(`FAILED!`);
        console.error(`    Error: ${err.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(' Deployment completed successfully! ');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('\nFatal Error:', err);
  process.exit(1);
});
