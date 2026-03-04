#!/usr/bin/env node

// Simple performance check using fetch and timing
const https = require('https');

const urls = [
  'https://zintellident.netlify.app/',
  'https://zintellident.netlify.app/api/health',
  'https://zintellident.netlify.app/api/patients',
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          url,
          status: res.statusCode,
          duration,
          headers: res.headers,
          bodyLength: data.length,
          preview: data.substring(0, 200)
        });
      });
    }).on('error', (err) => {
      resolve({
        url,
        error: err.message,
        duration: Date.now() - start
      });
    });
  });
}

async function main() {
  console.log('🔍 Performance Check for IntelliDent\n');
  console.log('=' .repeat(60));
  
  for (const url of urls) {
    const result = await checkUrl(url);
    
    console.log(`\n📊 ${url}`);
    console.log('-'.repeat(60));
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}`);
    } else {
      console.log(`✅ Status: ${result.status}`);
      console.log(`⏱️  Duration: ${result.duration}ms`);
      console.log(`📦 Body Size: ${result.bodyLength} bytes`);
      
      if (result.headers['x-clerk-auth-status']) {
        console.log(`🔐 Auth Status: ${result.headers['x-clerk-auth-status']}`);
      }
      
      if (result.status === 307 && result.headers.location) {
        console.log(`↪️  Redirect: ${result.headers.location}`);
      }
      
      if (result.preview && result.preview.includes('error')) {
        console.log(`⚠️  Preview: ${result.preview}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Performance check complete!\n');
}

main();
