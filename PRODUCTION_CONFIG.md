# Production Configuration Guide

This guide helps you configure environment variables and settings for production deployment.

## Backend Environment Variables (Railway)

Set these environment variables in your Railway dashboard:

### Required Variables
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/project-task-management?retryWrites=true&w=majority
GEMINI_API_KEY=your_actual_gemini_api_key_here
FRONTEND_URL=https://your-frontend-domain.vercel.app
TRUST_PROXY=true
```

### Optional Variables (with defaults)
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
```

## Frontend Environment Variables (Vercel)

Set these environment variables in your Vercel dashboard:

### Required Variables
```env
REACT_APP_API_URL=https://your-backend-domain.railway.app/api
REACT_APP_ENV=production
```

### Optional Variables
```env
GENERATE_SOURCEMAP=false
```

## Step-by-Step Configuration

### 1. MongoDB Atlas Setup

1. **Create Cluster**
   - Go to MongoDB Atlas dashboard
   - Create a new cluster (M0 free tier is sufficient for testing)
   - Choose a cloud provider and region

2. **Create Database User**
   - Go to Database Access
   - Add new database user
   - Choose password authentication
   - Set appropriate permissions (readWrite to any database)

3. **Configure Network Access**
   - Go to Network Access
   - Add IP Address
   - For testing: Add 0.0.0.0/0 (allow access from anywhere)
   - For production: Add specific IP addresses of your hosting platform

4. **Get Connection String**
   - Go to Clusters
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Replace `<dbname>` with `project-task-management`

### 2. Gemini AI API Setup

1. **Get API Key**
   - Go to Google AI Studio: https://makersuite.google.com/app/apikey
   - Create a new API key
   - Copy the API key

2. **Set Billing (if needed)**
   - Go to Google Cloud Console
   - Enable billing for your project
   - Set up usage limits to control costs

### 3. Railway Backend Configuration

1. **Deploy Backend**
   ```bash
   cd backend
   railway login
   railway init
   railway up
   ```

2. **Set Environment Variables**
   - Go to Railway dashboard
   - Select your project
   - Go to Variables tab
   - Add all required environment variables

3. **Get Backend URL**
   - Copy the generated Railway URL
   - It will look like: `https://your-app-name.railway.app`

### 4. Vercel Frontend Configuration

1. **Deploy Frontend**
   ```bash
   cd frontend
   vercel login
   vercel --prod
   ```

2. **Set Environment Variables**
   - Go to Vercel dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add `REACT_APP_API_URL` with your Railway backend URL

3. **Update Backend CORS**
   - Go back to Railway dashboard
   - Update `FRONTEND_URL` with your Vercel URL

## Verification Checklist

### Backend Verification
- [ ] Health check endpoint works: `https://your-backend.railway.app/api/health`
- [ ] Database connection is successful (check Railway logs)
- [ ] CORS is configured correctly
- [ ] Rate limiting is working
- [ ] Gemini AI integration is working

### Frontend Verification
- [ ] Application loads without errors
- [ ] API calls are successful (check browser network tab)
- [ ] All features work as expected
- [ ] Responsive design works on different screen sizes

### Integration Verification
- [ ] Create a new project
- [ ] Add tasks to the project
- [ ] Test drag and drop functionality
- [ ] Test AI assistant features
- [ ] Test error handling

## Security Best Practices

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique passwords for database users
- Rotate API keys regularly
- Use least-privilege access for database users

### Database Security
- Enable MongoDB Atlas security features
- Use IP whitelisting when possible
- Monitor database access logs
- Set up alerts for unusual activity

### API Security
- Monitor API usage and costs
- Set up rate limiting
- Use HTTPS for all communications
- Monitor error logs for security issues

## Cost Optimization

### Railway
- Monitor resource usage in dashboard
- Use appropriate plan for your needs
- Optimize database queries to reduce CPU usage

### Vercel
- Optimize bundle size to reduce bandwidth costs
- Use proper caching headers
- Monitor function execution time

### MongoDB Atlas
- Use appropriate cluster size
- Monitor storage usage
- Set up data archiving for old data

### Gemini AI
- Cache responses where appropriate
- Optimize prompt length to reduce token usage
- Set up usage alerts
- Monitor costs in Google Cloud Console

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```
   Error: Access to fetch at 'https://backend.railway.app/api/...' from origin 'https://frontend.vercel.app' has been blocked by CORS policy
   ```
   **Solution**: Verify `FRONTEND_URL` in Railway environment variables matches your Vercel URL exactly

2. **Database Connection Errors**
   ```
   MongoNetworkError: failed to connect to server
   ```
   **Solution**: Check MongoDB Atlas IP whitelist and connection string

3. **API Key Errors**
   ```
   Error: Invalid API key for Gemini AI
   ```
   **Solution**: Verify `GEMINI_API_KEY` is set correctly in Railway

4. **Build Failures**
   ```
   Module not found: Can't resolve './component'
   ```
   **Solution**: Check file paths and imports, ensure all dependencies are installed

### Getting Help

- **Railway Support**: https://railway.app/help
- **Vercel Support**: https://vercel.com/support
- **MongoDB Atlas Support**: https://support.mongodb.com/
- **Google AI Support**: https://ai.google.dev/support

## Monitoring and Alerts

### Set Up Monitoring

1. **Railway Monitoring**
   - Enable logging in Railway dashboard
   - Set up uptime monitoring
   - Monitor resource usage

2. **Vercel Monitoring**
   - Enable error tracking
   - Monitor build times
   - Set up performance monitoring

3. **Database Monitoring**
   - Enable MongoDB Atlas monitoring
   - Set up alerts for high CPU usage
   - Monitor connection counts

### Log Analysis

- Check Railway logs for backend errors
- Check Vercel function logs for frontend issues
- Monitor MongoDB Atlas logs for database issues
- Set up log aggregation if needed