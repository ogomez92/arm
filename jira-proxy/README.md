# Jira CORS Proxy Server - Deployment Guide

This is a simple proxy server that allows your static accessibility reporter app to communicate with Jira's API without CORS issues.

## Privacy Notice

**NO DATA IS COLLECTED OR STORED.** The proxy server:
- Forwards requests directly to Jira
- Returns responses immediately to your browser
- Does not log, store, or collect any data
- Does not inspect or modify request/response content

## Quick Deploy Options

### Option 1: Railway (Easiest - Free Tier Available)

1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Create a new GitHub repo with just these files:
   - `jira-proxy-server.js`
   - Rename `jira-proxy-package.json` to `package.json`
4. Select your repo in Railway
5. Railway will auto-detect and deploy
6. Copy your deployment URL (e.g., `https://your-app.railway.app`)
7. Use this URL in your app's Jira proxy setting: `https://your-app.railway.app/proxy`

### Option 2: Render (Free Tier Available)

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repo (same files as above)
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Deploy
6. Copy your service URL (e.g., `https://your-service.onrender.com`)
7. Use: `https://your-service.onrender.com/proxy`

### Option 3: Fly.io (Free Tier Available)

1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Sign up: `fly auth signup`
3. In a directory with the proxy files, run:
   ```bash
   fly launch
   ```
4. Follow prompts (accept defaults)
5. Deploy: `fly deploy`
6. Get URL: `fly status`
7. Use: `https://your-app.fly.dev/proxy`

### Option 4: Your Own Server

If you have a VPS or server with Node.js:

```bash
# Copy the files to your server
scp jira-proxy-server.js user@yourserver.com:/path/to/proxy/
scp jira-proxy-package.json user@yourserver.com:/path/to/proxy/package.json

# SSH into your server
ssh user@yourserver.com

# Install and run
cd /path/to/proxy
npm install
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start jira-proxy-server.js --name jira-proxy
pm2 save
```

Configure nginx/apache to proxy to port 3000.

## Testing Your Deployment

Once deployed, visit your proxy URL in a browser. You should see:

```json
{
  "status": "ok",
  "message": "Jira CORS Proxy Server is running",
  "version": "1.0.0",
  "privacy": "No data is collected or stored. All requests are forwarded directly to Jira."
}
```

## Configure Your App

After deployment, you need to update your accessibility reporter app:

1. Open `src/lib/services/jira.ts`
2. Find the line near the top that says:
   ```typescript
   const PROXY_URL = 'YOUR_PROXY_URL_HERE';
   ```
3. Replace with your deployed proxy URL:
   ```typescript
   const PROXY_URL = 'https://your-app.railway.app/proxy';
   ```
4. Rebuild your app: `npm run build`
5. Deploy the updated app

## Security Notes

- The proxy forwards all headers including your Jira API token
- Your API token is never stored on the proxy server
- Consider restricting CORS origins in production (edit `cors()` in the server file)
- For production, add rate limiting if needed

## Cost Estimates

All these services have free tiers that should be sufficient:
- **Railway**: 500 hours/month free ($5 credit)
- **Render**: 750 hours/month free
- **Fly.io**: 3 small VMs free

This proxy uses minimal resources and should easily fit within free tiers.
