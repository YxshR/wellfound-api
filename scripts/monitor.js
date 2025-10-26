#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const config = {
  endpoints: [
    {
      name: 'Backend Health',
      url: process.env.BACKEND_URL || 'http://localhost:5000/api/health',
      critical: true
    },
    {
      name: 'Backend Detailed Health',
      url: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/health/detailed` : 'http://localhost:5000/api/health/detailed',
      critical: false
    },
    {
      name: 'Backend Metrics',
      url: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api/metrics` : 'http://localhost:5000/api/metrics',
      critical: false
    },
    {
      name: 'Frontend',
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
      critical: true
    }
  ],
  timeout: 10000,
  interval: process.env.MONITOR_INTERVAL || 30000, // 30 seconds
  alertThreshold: 3 // Number of consecutive failures before alerting
};

// Monitoring state
const monitoringState = {
  results: {},
  consecutiveFailures: {},
  startTime: Date.now()
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatTimestamp() {
  return new Date().toISOString();
}

function formatUptime() {
  const uptime = Date.now() - monitoringState.startTime;
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
}

// HTTP request function
function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: timeout,
      headers: {
        'User-Agent': 'Project-Monitor/1.0'
      }
    };

    const startTime = Date.now();
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        let parsedData = null;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          // Not JSON, that's okay for some endpoints
        }
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          data: parsedData,
          rawData: data
        });
      });
    });

    req.on('error', (error) => {
      reject({
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        responseTime: timeout
      });
    });

    req.setTimeout(timeout);
    req.end();
  });
}

// Check single endpoint
async function checkEndpoint(endpoint) {
  try {
    const result = await makeRequest(endpoint.url, config.timeout);
    
    const isHealthy = result.statusCode >= 200 && result.statusCode < 300;
    
    return {
      name: endpoint.name,
      url: endpoint.url,
      status: isHealthy ? 'healthy' : 'unhealthy',
      statusCode: result.statusCode,
      responseTime: result.responseTime,
      data: result.data,
      timestamp: formatTimestamp(),
      critical: endpoint.critical
    };
  } catch (error) {
    return {
      name: endpoint.name,
      url: endpoint.url,
      status: 'error',
      error: error.error,
      responseTime: error.responseTime,
      timestamp: formatTimestamp(),
      critical: endpoint.critical
    };
  }
}

// Check all endpoints
async function checkAllEndpoints() {
  console.log(colorize(`\n=== Health Check - ${formatTimestamp()} ===`, 'cyan'));
  console.log(colorize(`Monitor uptime: ${formatUptime()}`, 'blue'));
  
  const results = [];
  
  for (const endpoint of config.endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
    
    // Update monitoring state
    monitoringState.results[endpoint.name] = result;
    
    // Track consecutive failures
    if (result.status !== 'healthy') {
      monitoringState.consecutiveFailures[endpoint.name] = 
        (monitoringState.consecutiveFailures[endpoint.name] || 0) + 1;
    } else {
      monitoringState.consecutiveFailures[endpoint.name] = 0;
    }
    
    // Display result
    const statusColor = result.status === 'healthy' ? 'green' : 'red';
    const statusIcon = result.status === 'healthy' ? '✅' : '❌';
    
    console.log(`${statusIcon} ${colorize(result.name, statusColor)}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${colorize(result.status.toUpperCase(), statusColor)}`);
    
    if (result.statusCode) {
      console.log(`   HTTP: ${result.statusCode}`);
    }
    
    if (result.responseTime) {
      const timeColor = result.responseTime > 1000 ? 'yellow' : 'green';
      console.log(`   Response Time: ${colorize(`${result.responseTime}ms`, timeColor)}`);
    }
    
    if (result.error) {
      console.log(`   Error: ${colorize(result.error, 'red')}`);
    }
    
    if (result.data && result.data.status) {
      console.log(`   Health Status: ${result.data.status}`);
      
      if (result.data.database) {
        const dbColor = result.data.database === 'connected' ? 'green' : 'red';
        console.log(`   Database: ${colorize(result.data.database, dbColor)}`);
      }
      
      if (result.data.uptime) {
        console.log(`   Uptime: ${result.data.uptime}s`);
      }
    }
    
    // Check for alerts
    const failures = monitoringState.consecutiveFailures[endpoint.name] || 0;
    if (failures >= config.alertThreshold && endpoint.critical) {
      console.log(colorize(`   🚨 ALERT: ${failures} consecutive failures!`, 'red'));
    }
    
    console.log('');
  }
  
  // Summary
  const healthyCount = results.filter(r => r.status === 'healthy').length;
  const totalCount = results.length;
  const criticalIssues = results.filter(r => r.critical && r.status !== 'healthy').length;
  
  console.log(colorize('=== Summary ===', 'cyan'));
  console.log(`Healthy: ${colorize(`${healthyCount}/${totalCount}`, healthyCount === totalCount ? 'green' : 'yellow')}`);
  
  if (criticalIssues > 0) {
    console.log(colorize(`🚨 Critical Issues: ${criticalIssues}`, 'red'));
  } else {
    console.log(colorize('✅ No critical issues', 'green'));
  }
  
  return results;
}

// Main monitoring loop
async function startMonitoring() {
  console.log(colorize('🔍 Starting Project Task Management System Monitor', 'magenta'));
  console.log(colorize(`Monitor interval: ${config.interval}ms`, 'blue'));
  console.log(colorize(`Alert threshold: ${config.alertThreshold} consecutive failures`, 'blue'));
  
  // Initial check
  await checkAllEndpoints();
  
  // Set up interval
  const intervalId = setInterval(async () => {
    try {
      await checkAllEndpoints();
    } catch (error) {
      console.error(colorize(`Monitor error: ${error.message}`, 'red'));
    }
  }, config.interval);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(colorize('\n🛑 Stopping monitor...', 'yellow'));
    clearInterval(intervalId);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log(colorize('\n🛑 Monitor terminated', 'yellow'));
    clearInterval(intervalId);
    process.exit(0);
  });
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Project Task Management System Monitor

Usage: node monitor.js [options]

Options:
  --once, -o          Run once and exit
  --help, -h          Show this help message

Environment Variables:
  BACKEND_URL         Backend URL (default: http://localhost:5000)
  FRONTEND_URL        Frontend URL (default: http://localhost:3000)
  MONITOR_INTERVAL    Check interval in ms (default: 30000)
    `);
    process.exit(0);
  }
  
  if (args.includes('--once') || args.includes('-o')) {
    // Run once and exit
    checkAllEndpoints().then(() => {
      process.exit(0);
    }).catch((error) => {
      console.error(colorize(`Monitor error: ${error.message}`, 'red'));
      process.exit(1);
    });
  } else {
    // Start continuous monitoring
    startMonitoring().catch((error) => {
      console.error(colorize(`Failed to start monitor: ${error.message}`, 'red'));
      process.exit(1);
    });
  }
}

module.exports = {
  checkEndpoint,
  checkAllEndpoints,
  startMonitoring
};