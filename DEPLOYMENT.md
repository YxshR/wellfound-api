# Deployment Guide

This guide covers deploying the Project & Task Management System to various hosting platforms.

## Overview

The application consists of two main components:
- **Frontend**: React.js application (static files after build)
- **Backend**: Node.js/Express API server

## Prerequisites

Before deploying, ensure you have:
- MongoDB database (MongoDB Atlas recommended for production)
- Google Gemini API key
- Domain name (optional but recommended)
- SSL certificate (handled by most hosting platforms)

## Environment Configuration

### Production Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmanagement?retryWrites=true&w=majority
GEMINI_API_KEY=your_production_gemini_api_key
FRONTEND_URL=https://your-frontend-domain.com
JWT_SECRET=your_jwt_secret_for_future_auth
```

#### Frontend (.env.production)
```env
REACT_APP_API_URL=https://your-backend-domain.com/api
REACT_APP_ENV=production
```

## Frontend Deployment

### Vercel (Recommended)

Vercel provides excellent React.js hosting with automatic deployments.

#### Setup Steps

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Build the frontend**
```bash
cd frontend
npm run build
```

3. **Deploy to Vercel**
```bash
vercel --prod
```

#### Automatic Deployment with GitHub

1. Connect your GitHub repository to Vercel
2. Set build settings:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
3. Add environment variables in Vercel dashboard
4. Deploy automatically on git push

#### Custom Domain Setup

1. Add domain in Vercel dashboard
2. Configure DNS records:
   - Type: CNAME
   - Name: www (or @)
   - Value: cname.vercel-dns.com

### Netlify

Alternative hosting for React applications.

#### Setup Steps

1. **Build the frontend**
```bash
cd frontend
npm run build
```

2. **Deploy via Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=frontend/build
```

#### Automatic Deployment

1. Connect GitHub repository to Netlify
2. Set build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/build`
3. Configure environment variables
4. Enable automatic deployments

### AWS S3 + CloudFront

For enterprise deployments requiring AWS infrastructure.

#### Setup Steps

1. **Create S3 bucket**
```bash
aws s3 mb s3://your-app-frontend
```

2. **Build and upload**
```bash
cd frontend
npm run build
aws s3 sync build/ s3://your-app-frontend --delete
```

3. **Configure CloudFront distribution**
4. **Set up custom domain with Route 53**

## Backend Deployment

### Railway (Recommended)

Railway provides simple Node.js hosting with database integration.

#### Setup Steps

1. **Install Railway CLI**
```bash
npm install -g @railway/cli
```

2. **Login and initialize**
```bash
railway login
railway init
```

3. **Deploy**
```bash
railway up
```

#### Configuration

1. Set environment variables in Railway dashboard
2. Connect MongoDB Atlas database
3. Configure custom domain (optional)

#### Dockerfile (Optional)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/ .

EXPOSE 5000

CMD ["npm", "start"]
```

### Render

Alternative platform for Node.js hosting.

#### Setup Steps

1. Connect GitHub repository to Render
2. Create new Web Service
3. Configure settings:
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
4. Set environment variables
5. Deploy

### Heroku

Traditional platform-as-a-service option.

#### Setup Steps

1. **Install Heroku CLI**
```bash
npm install -g heroku
```

2. **Create Heroku app**
```bash
heroku create your-app-name
```

3. **Configure buildpack**
```bash
heroku buildpacks:set heroku/nodejs
```

4. **Set environment variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set GEMINI_API_KEY=your_api_key
```

5. **Deploy**
```bash
git push heroku main
```

#### Procfile
Create `Procfile` in backend directory:
```
web: npm start
```

### DigitalOcean App Platform

Modern platform with competitive pricing.

#### Setup Steps

1. Connect GitHub repository
2. Configure app settings:
   - **Source Directory**: `backend`
   - **Build Command**: `npm install`
   - **Run Command**: `npm start`
3. Set environment variables
4. Deploy

### AWS Elastic Beanstalk

Enterprise-grade deployment on AWS.

#### Setup Steps

1. **Install EB CLI**
```bash
pip install awsebcli
```

2. **Initialize application**
```bash
cd backend
eb init
```

3. **Create environment**
```bash
eb create production
```

4. **Deploy**
```bash
eb deploy
```

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas account**
2. **Create new cluster**
3. **Configure database user**
4. **Set up IP whitelist** (0.0.0.0/0 for cloud deployments)
5. **Get connection string**

#### Connection String Format
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Self-Hosted MongoDB

For advanced users who prefer self-hosting:

1. **Set up MongoDB server**
2. **Configure authentication**
3. **Set up SSL/TLS**
4. **Configure firewall rules**
5. **Set up backups**

## SSL/HTTPS Configuration

Most modern hosting platforms provide automatic SSL certificates:

- **Vercel**: Automatic SSL with Let's Encrypt
- **Netlify**: Automatic SSL with Let's Encrypt
- **Railway**: Automatic SSL
- **Render**: Automatic SSL
- **Heroku**: Automatic SSL on paid plans

## Domain Configuration

### Custom Domain Setup

1. **Purchase domain** from registrar (Namecheap, GoDaddy, etc.)
2. **Configure DNS records**:
   - Frontend: Point to hosting platform
   - Backend: Point to API server
3. **Set up subdomains** (optional):
   - `app.yourdomain.com` → Frontend
   - `api.yourdomain.com` → Backend

### DNS Records Example
```
Type    Name    Value
A       @       192.168.1.1 (or CNAME to platform)
CNAME   www     yourdomain.com
CNAME   api     your-backend-platform.com
```

## Monitoring and Logging

### Application Monitoring

1. **Set up error tracking** (Sentry, Bugsnag)
2. **Configure performance monitoring**
3. **Set up uptime monitoring** (UptimeRobot, Pingdom)

### Logging

1. **Centralized logging** (LogDNA, Papertrail)
2. **Error aggregation**
3. **Performance metrics**

### Health Checks

The application includes health check endpoints:
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

## Backup Strategy

### Database Backups

1. **MongoDB Atlas**: Automatic backups included
2. **Self-hosted**: Set up automated backup scripts
3. **Backup frequency**: Daily recommended
4. **Retention policy**: 30 days minimum

### Application Backups

1. **Source code**: Git repository (GitHub, GitLab)
2. **Environment variables**: Secure backup of configuration
3. **Static assets**: CDN or S3 backup

## Security Considerations

### Environment Variables

- Never commit secrets to version control
- Use platform-specific secret management
- Rotate API keys regularly
- Use different keys for different environments

### Network Security

- Enable HTTPS everywhere
- Configure CORS properly
- Use security headers (Helmet.js)
- Implement rate limiting

### Database Security

- Use strong passwords
- Enable authentication
- Configure IP whitelisting
- Use SSL/TLS connections

## Performance Optimization

### Frontend Optimization

1. **Code splitting** with React.lazy()
2. **Image optimization**
3. **CDN usage** for static assets
4. **Caching strategies**

### Backend Optimization

1. **Database indexing**
2. **Response caching**
3. **Connection pooling**
4. **Load balancing** (for high traffic)

## Scaling Considerations

### Horizontal Scaling

1. **Load balancers**
2. **Multiple server instances**
3. **Database clustering**
4. **CDN for global distribution**

### Vertical Scaling

1. **Increase server resources**
2. **Database performance tuning**
3. **Memory optimization**

## Troubleshooting Deployment Issues

### Common Problems

#### Build Failures
```bash
# Check Node.js version compatibility
node --version
npm --version

# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Environment Variable Issues
```bash
# Verify environment variables are set
echo $MONGODB_URI
echo $GEMINI_API_KEY

# Check application logs for missing variables
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongosh "mongodb+srv://cluster.mongodb.net/test" --username username

# Check IP whitelist in MongoDB Atlas
# Verify connection string format
```

#### CORS Issues
```bash
# Verify FRONTEND_URL is set correctly
# Check browser developer tools for CORS errors
# Ensure API endpoints return proper CORS headers
```

### Debugging Steps

1. **Check application logs**
2. **Verify environment variables**
3. **Test database connectivity**
4. **Validate API endpoints**
5. **Check network configuration**

## Rollback Strategy

### Quick Rollback

1. **Keep previous deployment available**
2. **Use platform rollback features**
3. **Database migration rollback plan**
4. **DNS failover configuration**

### Deployment Pipeline

1. **Staging environment** for testing
2. **Automated testing** before production
3. **Blue-green deployment** for zero downtime
4. **Feature flags** for gradual rollouts

## Cost Optimization

### Free Tier Options

- **Frontend**: Vercel (free tier), Netlify (free tier)
- **Backend**: Railway (free tier), Render (free tier)
- **Database**: MongoDB Atlas (free tier - 512MB)

### Paid Recommendations

- **Small projects**: $10-20/month total
- **Medium projects**: $50-100/month
- **Enterprise**: $200+/month with advanced features

## Support and Maintenance

### Regular Tasks

1. **Update dependencies** monthly
2. **Monitor security vulnerabilities**
3. **Review performance metrics**
4. **Backup verification**
5. **SSL certificate renewal** (usually automatic)

### Emergency Procedures

1. **Incident response plan**
2. **Emergency contacts**
3. **Rollback procedures**
4. **Communication plan**

## Conclusion

This deployment guide covers the most common scenarios for deploying the Project & Task Management System. Choose the platforms that best fit your requirements, budget, and technical expertise.

For additional help:
- Check platform-specific documentation
- Review application logs for errors
- Test in staging environment first
- Keep backups of working configurations