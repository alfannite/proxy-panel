const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const http = require('http');

let lastTotal = null;

async function fetchMetrics() {
  return new Promise((resolve, reject) => {
    http.get('http://traefik-core:8080/metrics', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function collect() {
  try {
    const text = await fetchMetrics();
    let totalRequests = 0;
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('traefik_entrypoint_requests_total{')) {
        const parts = line.split(' ');
        if (parts.length === 2) {
          totalRequests += parseInt(parts[1], 10);
        }
      }
    }
    
    // We only log if we have a previous baseline to calculate delta
    if (lastTotal !== null && totalRequests >= lastTotal) {
      const delta = totalRequests - lastTotal;
      await prisma.trafficLog.create({
        data: { requests: delta }
      });
      // console.log(`Logged ${delta} requests`);
    } else if (lastTotal !== null && totalRequests < lastTotal) {
      // Traefik probably restarted, reset baseline
      lastTotal = totalRequests;
    }
    lastTotal = totalRequests;
  } catch (error) {
    console.error('Traffic collector error:', error.message);
  }
}

// Run every 1 minute
console.log('Traffic collector started. Polling every 1 minute...');
setInterval(collect, 60000);
collect();
