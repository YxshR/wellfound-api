const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level (can be set via environment variable)
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

// Logger class
class Logger {
  constructor() {
    this.logFile = path.join(logsDir, 'app.log');
    this.errorFile = path.join(logsDir, 'error.log');
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      pid: process.pid
    }) + '\n';
  }

  writeToFile(filename, content) {
    try {
      fs.appendFileSync(filename, content);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, meta = {}) {
    const logLevel = LOG_LEVELS[level];
    
    if (logLevel <= currentLogLevel) {
      const formattedMessage = this.formatMessage(level, message, meta);
      
      // Always write to console in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[${level}] ${message}`, meta);
      }
      
      // Write to log file
      this.writeToFile(this.logFile, formattedMessage);
      
      // Write errors to separate error file
      if (level === 'ERROR') {
        this.writeToFile(this.errorFile, formattedMessage);
      }
    }
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }
}

// Create logger instance
const logger = new Logger();

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logging middleware
const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  next(err);
};

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    
    // Log performance metrics
    const performanceData = {
      method: req.method,
      url: req.url,
      duration: `${duration.toFixed(2)}ms`,
      statusCode: res.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };
    
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      logger.warn('Slow request detected', performanceData);
    }
    
    // Log error responses
    if (res.statusCode >= 400) {
      logger.warn('Error response', performanceData);
    }
    
    // Log performance data for monitoring
    logger.debug('Request performance', performanceData);
  });

  next();
};

// System metrics tracking
class SystemMetrics {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.slowRequestCount = 0;
  }

  incrementRequestCount() {
    this.requestCount++;
  }

  incrementErrorCount() {
    this.errorCount++;
  }

  incrementSlowRequestCount() {
    this.slowRequestCount++;
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    return {
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      slowRequestCount: this.slowRequestCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount * 100).toFixed(2) : 0,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
  }
}

const systemMetrics = new SystemMetrics();

// Enhanced request logger with metrics
const requestLoggerWithMetrics = (req, res, next) => {
  const start = Date.now();
  
  systemMetrics.incrementRequestCount();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    // Track metrics
    if (res.statusCode >= 400) {
      systemMetrics.incrementErrorCount();
    }
    if (duration > 1000) {
      systemMetrics.incrementSlowRequestCount();
    }
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  logger,
  requestLogger: requestLoggerWithMetrics,
  errorLogger,
  performanceMonitor,
  systemMetrics
};