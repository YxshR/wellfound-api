const http = require('http');

// Configuration
const config = {
  host: process.env.HEALTH_CHECK_HOST || 'localhost',
  port: process.env.PORT || 5000,
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
  retries: parseInt(process.env.HEALTH_CHECK_RETRIES) || 3,
  retryDelay: parseInt(process.env.HEALTH_CHECK_RETRY_DELAY) || 1000
};

// Health check function
async function performHealthCheck(attempt = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      host: config.host,
      port: config.port,
      path: '/api/health',
      timeout: config.timeout,
      method: 'GET'
    };

    console.log(`Health check attempt ${attempt}/${config.retries}`);
    console.log(`Checking: http://${config.host}:${config.port}/api/health`);

    const request = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const healthData = JSON.parse(data);
            console.log('Health check response:', JSON.stringify(healthData, null, 2));
            
            // Check if status is OK or DEGRADED (both acceptable)
            if (healthData.status === 'OK' || healthData.status === 'DEGRADED') {
              console.log('✅ Health check passed');
              resolve(healthData);
            } else {
              console.log(`❌ Health check failed - Status: ${healthData.status}`);
              reject(new Error(`Unhealthy status: ${healthData.status}`));
            }
          } catch (parseError) {
            console.log('❌ Failed to parse health check response');
            reject(parseError);
          }
        } else {
          console.log(`❌ Health check failed - HTTP ${res.statusCode}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    request.on('error', (err) => {
      console.log(`❌ Health check request failed: ${err.message}`);
      reject(err);
    });

    request.on('timeout', () => {
      console.log(`❌ Health check timed out after ${config.timeout}ms`);
      request.destroy();
      reject(new Error('Request timeout'));
    });

    request.setTimeout(config.timeout);
    request.end();
  });
}

// Retry logic
async function healthCheckWithRetry() {
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const result = await performHealthCheck(attempt);
      return result;
    } catch (error) {
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < config.retries) {
        console.log(`Retrying in ${config.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      } else {
        console.log(`All ${config.retries} attempts failed`);
        throw error;
      }
    }
  }
}

// Main execution
async function main() {
  console.log('Starting health check...');
  console.log('Configuration:', {
    host: config.host,
    port: config.port,
    timeout: config.timeout,
    retries: config.retries,
    retryDelay: config.retryDelay
  });

  try {
    await healthCheckWithRetry();
    console.log('Health check completed successfully');
    process.exit(0);
  } catch (error) {
    console.log('Health check failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('Health check interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('Health check terminated');
  process.exit(1);
});

// Run the health check
main();