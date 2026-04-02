# Railway Deployment Guide - Musashi MCP Server

## Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app)
- Generated API key(s) for authentication

## Step 1: Generate API Keys

Generate secure API keys with the required format:

```bash
# Generate a secure API key
echo "mcp_sk_$(openssl rand -hex 32)"
```

Or use this format: `mcp_sk_<32_random_characters>`

Example:
```
mcp_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

Save these keys securely - you'll need them for configuration.

## Step 2: Deploy to Railway

### Option A: One-Click Deploy (Recommended)

1. Click the deploy button below (will be added after first deploy)
2. Connect your GitHub account when prompted
3. Railway will automatically detect the `railway.toml` configuration
4. Add environment variables (see Step 3)
5. Deploy!

### Option B: Manual Deploy

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select `MusashiBot/Musashi` repository
6. Railway will detect it's a Node.js project

## Step 3: Configure Environment Variables

In your Railway project settings:

1. Click on your service
2. Go to "Variables" tab
3. Add the following environment variables:

### Required Variables

```bash
MCP_API_KEYS=mcp_sk_your_key_1,mcp_sk_your_key_2
PORT=3000
NODE_ENV=production
```

### Optional Variables

```bash
# REST API endpoint (default: https://musashi-api.vercel.app)
MUSASHI_API_BASE_URL=https://musashi-api.vercel.app

# Rate limiting (defaults shown)
MCP_RATE_LIMIT_PER_MINUTE=60
MCP_RATE_LIMIT_PER_HOUR=1000

# Logging
LOG_LEVEL=info
```

## Step 4: Configure Root Directory

**IMPORTANT:** Railway must build from the `mcp-server` subdirectory.

1. In your Railway project settings
2. Go to "Settings" tab
3. Find "Root Directory" setting
4. Set it to: `mcp-server`
5. Save

Railway will automatically use the `railway.toml` configuration in that directory.

## Step 5: Deploy

1. Click "Deploy" or wait for automatic deployment
2. Railway will:
   - Run `npm install`
   - Run `npm run build`
   - Start with `node dist/index.js --transport=http`
3. Monitor the build logs for any errors

## Step 6: Get Your Production URL

1. Go to "Settings" tab in your Railway service
2. Find "Domains" section
3. Click "Generate Domain"
4. Copy your production URL (e.g., `musashi-mcp-production.up.railway.app`)

## Step 7: Test Your Deployment

### Test 1: Health Check

```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-02T...",
  "version": "1.0.0",
  "transport": "http-sse",
  "uptime_seconds": 42,
  "active_sessions": 0,
  "active_connections": 0
}
```

### Test 2: Capabilities

```bash
curl https://your-app.up.railway.app/mcp/capabilities
```

### Test 3: Create Session

```bash
curl -X POST https://your-app.up.railway.app/mcp/session \
  -H "Authorization: Bearer mcp_sk_your_actual_key"
```

Expected response:
```json
{
  "session_id": "sess_...",
  "created_at": "2026-04-02T...",
  "expires_at": "2026-04-02T..."
}
```

### Test 4: Open SSE Stream

```bash
curl -N https://your-app.up.railway.app/mcp/stream/SESSION_ID \
  -H "Authorization: Bearer mcp_sk_your_actual_key"
```

Should output:
```
data: {"type":"connected","session_id":"sess_..."}

: keepalive
```

## Step 8: Update Documentation

Update the main repository README and MCP-INTEGRATION-GUIDE.md with your production URL:

```markdown
Production URL: https://your-app.up.railway.app
```

## Monitoring

### View Logs

1. In Railway project dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Click on latest deployment
5. View real-time logs

### Key Metrics to Monitor

- **Active Sessions:** Should stay under 50 for free tier
- **Memory Usage:** Should stay under 512MB for free tier
- **Request Rate:** Monitor for abuse patterns
- **Error Rate:** Should be < 1%

### Health Check Endpoint

The health endpoint at `/health` provides:
- Uptime
- Memory usage
- Active sessions count
- Active SSE connections

## Troubleshooting

### Build Fails

**Problem:** `npm install` or `npm run build` fails

**Solution:**
1. Check that root directory is set to `mcp-server`
2. Verify `package.json` is accessible
3. Check build logs for specific errors

### Server Won't Start

**Problem:** Server crashes on startup

**Solution:**
1. Verify `MCP_API_KEYS` environment variable is set
2. Check that `NODE_ENV=production`
3. Review deployment logs for error messages

### 401 Unauthorized Errors

**Problem:** Session creation returns 401

**Solution:**
1. Verify API key format: `mcp_sk_<32_chars>`
2. Check that key is in `MCP_API_KEYS` environment variable
3. Ensure `Authorization: Bearer` header is correct

### 429 Rate Limit Errors

**Problem:** Too many requests errors

**Solution:**
1. Review rate limits in environment variables
2. Check if multiple users sharing same API key
3. Consider increasing limits for production use

### CORS Errors

**Problem:** Browser requests blocked

**Solution:**
- CORS is pre-configured for `claude.ai` domain
- For testing, use curl or Postman instead of browser
- Check server logs for CORS-related errors

## Cost Estimation

### Railway Pricing (April 2026)

**Free Tier:**
- $5 free credit per month
- Enough for ~500 hours of runtime
- Good for testing and low-traffic use

**Starter Plan ($5/month):**
- $5 credit included
- Pay-as-you-go beyond credit
- Good for personal use

**Pro Plan ($20/month):**
- $20 credit included
- Priority support
- Good for production use

**Estimated Monthly Cost:**
- Low traffic (< 1000 sessions/month): **$0-5**
- Medium traffic (< 10000 sessions/month): **$5-15**
- High traffic (< 100000 sessions/month): **$15-50**

## Security Best Practices

1. **Rotate API Keys:** Change keys every 90 days
2. **Monitor Usage:** Check Railway metrics daily
3. **Rate Limiting:** Keep default limits unless necessary
4. **Separate Keys:** Use different keys for testing vs production
5. **Access Control:** Limit key distribution to trusted users

## Scaling

### Horizontal Scaling

Railway supports automatic horizontal scaling:
1. Go to service settings
2. Enable "Auto Scaling"
3. Set min/max replicas
4. Railway handles load balancing

### Vertical Scaling

Increase resources for single instance:
1. Railway automatically scales within plan limits
2. Upgrade plan for more resources

## Next Steps

After successful deployment:

1. ✅ Submit to Anthropic MCP directory
2. ✅ Update main README with production URL
3. ✅ Share with beta testers
4. ✅ Monitor usage and performance
5. ✅ Iterate based on feedback

## Support

- **GitHub Issues:** https://github.com/MusashiBot/Musashi/issues
- **Railway Docs:** https://docs.railway.app
- **MCP Docs:** https://modelcontextprotocol.io

## Production Checklist

Before going live:

- [ ] API keys generated and secured
- [ ] Environment variables configured
- [ ] Root directory set to `mcp-server`
- [ ] Health check returns 200 OK
- [ ] Session creation works with auth
- [ ] SSE streaming connects successfully
- [ ] Rate limits tested and working
- [ ] Production URL documented
- [ ] Monitoring enabled
- [ ] Logs reviewed for errors
- [ ] Cost estimation reviewed
- [ ] Security best practices implemented

---

**Status:** Ready for deployment ✅

**Next Action:** Deploy to Railway following steps above
