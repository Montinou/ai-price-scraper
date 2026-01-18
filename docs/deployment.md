# Deployment Documentation

## Overview

This document covers deploying the AI Price Scraper to Vercel with NeonDB.

## Prerequisites

1. **Vercel Account**: https://vercel.com
2. **NeonDB Account**: https://neon.tech
3. **Anthropic API Key**: https://console.anthropic.com

## Environment Setup

### 1. Create NeonDB Project

1. Go to https://neon.tech
2. Create a new project
3. Copy the connection string:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### 2. Set Up Environment Variables

Create a `.env` file (do not commit):

```bash
# Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# AI Provider
ANTHROPIC_API_KEY=sk-ant-xxx

# Optional: Web Search
TAVILY_API_KEY=tvly-xxx
```

### 3. Initialize Database

```bash
# Install dependencies
pnpm install

# Push schema to NeonDB
pnpm db:push

# Verify with Drizzle Studio
pnpm db:studio
```

## Vercel Deployment

### 1. Connect Repository

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure project settings

### 2. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| DATABASE_URL | postgresql://... | Production, Preview |
| ANTHROPIC_API_KEY | sk-ant-xxx | Production, Preview |
| TAVILY_API_KEY | tvly-xxx | Production, Preview |

### 3. Deploy

```bash
# Using Vercel CLI
vercel

# Or push to main branch for automatic deployment
git push origin main
```

### 4. Verify Deployment

1. Visit deployed URL
2. Test search functionality
3. Check database connectivity

## Production Configuration

### next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel
  experimental: {
    // Enable for long-running AI agent tasks
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Vercel Configuration (vercel.json)

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

## MCP Setup for Claude Code

For local development with Claude Code, configure MCP servers:

### ~/.config/claude/settings.json

```json
{
  "mcpServers": {
    "crawl4ai": {
      "command": "uvx",
      "args": ["crawl4ai-mcp"]
    },
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    }
  }
}
```

### Verify MCP Tools

In Claude Code, run:
```
/mcp
```

Should show available tools from both servers.

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard → Analytics

### Database Monitoring

NeonDB Dashboard provides:
- Query performance
- Connection stats
- Storage usage

### Error Tracking (Optional)

Add Sentry for error tracking:

```bash
pnpm add @sentry/nextjs
```

## Scaling Considerations

### Current MVP Limits

- Vercel Hobby: 10s function timeout
- NeonDB Free: 0.5 GB storage

### Upgrading

**Vercel Pro** ($20/mo):
- 60s function timeout
- More bandwidth

**NeonDB Launch** ($19/mo):
- 10 GB storage
- More compute

### Future Architecture

For high-volume scraping:

```
┌─────────────────┐     ┌──────────────────┐
│   Vercel App    │────►│   Queue (Redis)  │
└─────────────────┘     └────────┬─────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
               ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
               │ Worker  │  │ Worker  │  │ Worker  │
               │   1     │  │   2     │  │   3     │
               └─────────┘  └─────────┘  └─────────┘
```

## Troubleshooting

### Common Issues

**1. Database Connection Errors**

```
Error: Connection refused
```

Solution: Check DATABASE_URL format, ensure sslmode=require

**2. Function Timeout**

```
Error: Function timed out after 10s
```

Solution: Upgrade to Vercel Pro or optimize queries

**3. AI SDK Errors**

```
Error: Invalid API key
```

Solution: Verify ANTHROPIC_API_KEY is set correctly

### Debug Mode

Add to `.env.local`:
```
DEBUG=true
```

Enable verbose logging in production:
```typescript
if (process.env.DEBUG) {
  console.log('Debug:', data);
}
```

## Rollback

### Via Vercel Dashboard

1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Via CLI

```bash
vercel rollback
```

## Security Checklist

- [ ] Environment variables not exposed in client code
- [ ] API routes validate input
- [ ] Database uses SSL connection
- [ ] Rate limiting implemented
- [ ] CORS configured properly
- [ ] No sensitive data in logs
