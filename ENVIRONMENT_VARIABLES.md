# Environment Variables Configuration

This document provides comprehensive information about all environment variables used in the Project & Task Management System.

## Overview

The application uses environment variables to configure different aspects of the system, including database connections, API keys, and deployment-specific settings.

## File Locations

- **Backend**: `backend/.env`
- **Frontend**: `frontend/.env`
- **Production Frontend**: `frontend/.env.production`

## Backend Environment Variables

### Required Variables

#### `MONGODB_URI`
- **Description**: MongoDB database connection string
- **Required**: Yes
- **Format**: MongoDB connection URI
- **Examples**:
  ```env
  # Local MongoDB
  MONGODB_URI=mongodb://localhost:27017/taskmanagement
  
  # MongoDB Atlas
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmanagement?retryWrites=true&w=majority
  ```
- **Notes**: 
  - For production, use MongoDB Atlas or a secure MongoDB instance
  - Ensure the database name is included in the URI
  - For Atlas, include authentication credentials

#### `GEMINI_API_KEY`
- **Description**: Google Gemini AI API key for AI features
- **Required**: Yes (for AI functionality)
- **Format**: String API key
- **Example**:
  ```env
  GEMINI_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
  ```
- **Notes**:
  - Obtain from [Google AI Studio](https://makersuite.google.com/app/apikey)
  - Keep this key secure and never commit to version control
  - Monitor usage to avoid unexpected charges

### Optional Variables

#### `PORT`
- **Description**: Port number for the backend server
- **Required**: No
- **Default**: `5000`
- **Format**: Integer
- **Example**:
  ```env
  PORT=5000
  ```
- **Notes**: Most hosting platforms set this automatically

#### `NODE_ENV`
- **Description**: Node.js environment mode
- **Required**: No
- **Default**: `development`
- **Values**: `development`, `production`, `test`
- **Example**:
  ```env
  NODE_ENV=production
  ```
- **Notes**: Affects logging, error handling, and performance optimizations

#### `FRONTEND_URL`
- **Description**: Frontend application URL for CORS configuration
- **Required**: No
- **Default**: `http://localhost:3000`
- **Format**: Full URL with protocol
- **Examples**:
  ```env
  # Development
  FRONTEND_URL=http://localhost:3000
  
  # Production
  FRONTEND_URL=https://your-app.vercel.app
  ```
- **Notes**: Must match the actual frontend URL to avoid CORS issues

#### `JWT_SECRET`
- **Description**: Secret key for JWT token signing (future authentication feature)
- **Required**: No (not currently used)
- **Format**: Random string (minimum 32 characters recommended)
- **Example**:
  ```env
  JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
  ```
- **Notes**: Generate using `openssl rand -base64 32` or similar

#### `LOG_LEVEL`
- **Description**: Logging level for application logs
- **Required**: No
- **Default**: `info`
- **Values**: `error`, `warn`, `info`, `debug`
- **Example**:
  ```env
  LOG_LEVEL=info
  ```

#### `RATE_LIMIT_WINDOW_MS`
- **Description**: Rate limiting window in milliseconds
- **Required**: No
- **Default**: `900000` (15 minutes)
- **Format**: Integer (milliseconds)
- **Example**:
  ```env
  RATE_LIMIT_WINDOW_MS=900000
  ```

#### `RATE_LIMIT_MAX_REQUESTS`
- **Description**: Maximum requests per rate limit window
- **Required**: No
- **Default**: `100`
- **Format**: Integer
- **Example**:
  ```env
  RATE_LIMIT_MAX_REQUESTS=100
  ```

#### `AI_RATE_LIMIT_MAX_REQUESTS`
- **Description**: Maximum AI API requests per minute
- **Required**: No
- **Default**: `10`
- **Format**: Integer
- **Example**:
  ```env
  AI_RATE_LIMIT_MAX_REQUESTS=10
  ```

## Frontend Environment Variables

### Optional Variables

#### `REACT_APP_API_URL`
- **Description**: Backend API base URL
- **Required**: No
- **Default**: `http://localhost:5000/api`
- **Format**: Full URL with protocol, no trailing slash
- **Examples**:
  ```env
  # Development
  REACT_APP_API_URL=http://localhost:5000/api
  
  # Production
  REACT_APP_API_URL=https://your-api.railway.app/api
  ```
- **Notes**: Must start with `REACT_APP_` to be accessible in React

#### `REACT_APP_ENV`
- **Description**: Frontend environment identifier
- **Required**: No
- **Default**: `development`
- **Values**: `development`, `production`, `staging`
- **Example**:
  ```env
  REACT_APP_ENV=production
  ```

#### `REACT_APP_VERSION`
- **Description**: Application version for display
- **Required**: No
- **Format**: Semantic version string
- **Example**:
  ```env
  REACT_APP_VERSION=1.0.0
  ```

## Environment-Specific Configurations

### Development Environment

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/taskmanagement-dev
GEMINI_API_KEY=your_development_api_key
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

### Production Environment

**Backend (.env)**
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskmanagement
GEMINI_API_KEY=your_production_api_key
FRONTEND_URL=https://your-app.vercel.app
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_MAX_REQUESTS=10
```

**Frontend (.env.production)**
```env
REACT_APP_API_URL=https://your-api.railway.app/api
REACT_APP_ENV=production
REACT_APP_VERSION=1.0.0
```

### Testing Environment

**Backend (.env.test)**
```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/taskmanagement-test
GEMINI_API_KEY=test_api_key_or_mock
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=error
```

## Setting Up Environment Variables

### Local Development

1. **Copy example files**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Edit the files** with your actual values

3. **Verify configuration**:
   ```bash
   # Check if variables are loaded
   cd backend && node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
   ```

### Production Deployment

#### Vercel (Frontend)
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with appropriate values

#### Railway (Backend)
1. Go to Railway dashboard
2. Select your project
3. Go to Variables tab
4. Add each environment variable

#### Heroku
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set GEMINI_API_KEY=your_api_key
```

#### Render
1. Go to Render dashboard
2. Select your service
3. Go to Environment tab
4. Add environment variables

## Security Best Practices

### Protecting Sensitive Variables

1. **Never commit `.env` files** to version control
2. **Use different keys** for different environments
3. **Rotate API keys** regularly
4. **Use platform secret management** in production
5. **Limit API key permissions** when possible

### `.gitignore` Configuration
Ensure your `.gitignore` includes:
```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Backend environment
backend/.env
backend/.env.local
backend/.env.production

# Frontend environment
frontend/.env.local
frontend/.env.production.local
```

## Validation and Error Handling

### Backend Validation

The application validates required environment variables on startup:

```javascript
// Example validation in server.js
const requiredEnvVars = ['MONGODB_URI', 'GEMINI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  process.exit(1);
}
```

### Common Validation Errors

1. **Missing MONGODB_URI**: Application won't start
2. **Invalid MongoDB URI**: Database connection fails
3. **Missing GEMINI_API_KEY**: AI features disabled
4. **Invalid API key**: AI requests fail with authentication error
5. **CORS issues**: Frontend can't connect to backend

## Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Check if .env file exists
ls -la backend/.env

# Verify file contents (be careful with sensitive data)
cat backend/.env | grep -v "API_KEY\|PASSWORD\|SECRET"

# Check if dotenv is installed
npm list dotenv
```

#### CORS Errors
- Verify `FRONTEND_URL` matches actual frontend URL
- Check for trailing slashes (should not have them)
- Ensure protocol (http/https) is correct

#### Database Connection Issues
- Verify MongoDB URI format
- Check database name in URI
- Ensure IP whitelist includes deployment server IP (for Atlas)
- Test connection with MongoDB client

#### API Key Issues
- Verify API key is correct and active
- Check API quotas and billing
- Ensure key has necessary permissions

### Debugging Commands

```bash
# Check environment variables in Node.js
node -e "console.log(process.env)"

# Test MongoDB connection
mongosh "your_mongodb_uri"

# Test API endpoint
curl -X GET http://localhost:5000/api/health
```

## Environment Variable Templates

### Backend .env.example
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/taskmanagement

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_MAX_REQUESTS=10

# Future Authentication (not currently used)
JWT_SECRET=your_jwt_secret_here
```

### Frontend .env.example
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Environment Configuration
REACT_APP_ENV=development

# Version Information
REACT_APP_VERSION=1.0.0
```

## Monitoring and Maintenance

### Regular Tasks

1. **Rotate API keys** quarterly
2. **Review environment configurations** monthly
3. **Update example files** when adding new variables
4. **Audit access** to environment variables
5. **Monitor API usage** and costs

### Alerts and Monitoring

Set up monitoring for:
- API key usage approaching limits
- Database connection failures
- Environment variable changes
- Unauthorized access attempts

## Additional Resources

- [MongoDB Connection Strings](https://docs.mongodb.com/manual/reference/connection-string/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)