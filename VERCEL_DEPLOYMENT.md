# Vercel Deployment Guide

## Prerequisites
1. Backend services deployed and accessible via public URLs
2. MongoDB Atlas or cloud database setup
3. Vercel account

## Deployment Steps

### 1. Prepare Backend Services
Deploy your backend services to a cloud platform (Railway, Render, etc.):
- auth-service
- trade-service
- analytics-service
- market-data-service
- broker-service

Note the public URLs for each service.

### 2. Environment Variables in Vercel
Add these environment variables in your Vercel project settings:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NODE_ENV=production
```

### 3. Deploy to Vercel

#### Option 1: Vercel CLI
```bash
cd frontend
npm install -g vercel
vercel login
vercel --prod
```

#### Option 2: GitHub Integration
1. Push code to GitHub
2. Import repository in Vercel
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy

### 4. Build Configuration
Vercel will automatically detect Next.js and use these settings:
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`
- Root Directory: `frontend`

### 5. Post-Deployment
1. Test all API endpoints
2. Verify charts and data loading
3. Check performance metrics
4. Enable Vercel Analytics (optional)

## Optimization Applied
- ✅ Standalone output mode
- ✅ SWC minification
- ✅ Console removal in production
- ✅ Image optimization
- ✅ Source maps disabled
- ✅ Webpack optimizations
- ✅ Dynamic imports for charts
- ✅ React.memo for components
- ✅ useMemo/useCallback hooks

## Performance Features
- Parallel API loading (60-80% faster)
- Chart data sampling (>100 points)
- Search debouncing (300ms)
- SWR caching infrastructure
- Lazy loading utilities

## Troubleshooting

### Build Fails
- Check Node.js version (>=18.0.0)
- Verify all dependencies installed
- Check for TypeScript errors

### API Connection Issues
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS settings on backend
- Ensure backend services are running

### Performance Issues
- Enable Vercel Analytics
- Check bundle size
- Review Lighthouse scores
- Monitor Core Web Vitals
