# AI Price Scraper - Architecture Documentation

## Overview

This document describes the system architecture for the AI-powered price tracking scraper. The system uses AI agents to discover product listings, generate extraction scripts, and track prices over time.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Search   │  │ Product  │  │ Price    │  │ Source           │ │
│  │ Interface│  │ Details  │  │ History  │  │ Management       │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                        │
│  POST /api/discover → Triggers ExplorerAgent                     │
│  POST /api/update   → Triggers UpdaterAgent                      │
│  GET  /api/products → Query products/prices                      │
│  POST /api/sources  → Register new scrape source                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI AGENTS (Vercel AI SDK 6)                  │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ EXPLORER AGENT  │───▶│ UPDATER AGENT   │───▶│ PRICE AGENT  │ │
│  │                 │    │                 │    │              │ │
│  │ - Web search    │    │ - Run scripts   │    │ - Compare    │ │
│  │ - Crawl4AI      │    │ - Extract data  │    │ - Track      │ │
│  │ - Gen scripts   │    │ - Self-heal     │    │ - Alert      │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         TOOL LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Crawl4AI    │  │ Playwright  │  │ Database Operations     │  │
│  │ MCP Server  │  │ MCP Server  │  │ (Drizzle ORM)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (NeonDB + Drizzle)                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ products │  │ prices   │  │ sources   │  │ scrape_jobs    │  │
│  └──────────┘  └──────────┘  └───────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16, React 19 | Server-side rendering, App Router |
| UI Components | shadcn/ui | Accessible, customizable components |
| Database | NeonDB (Serverless Postgres) | Scalable, serverless database |
| ORM | Drizzle ORM | Type-safe queries, migrations |
| AI Framework | Vercel AI SDK 6 | Agent orchestration, streaming |
| Scraping | Crawl4AI, Playwright | LLM-ready extraction, browser automation |
| Deployment | Vercel | Serverless hosting, edge functions |

## Data Flow

### 1. Discovery Flow (Explorer Agent)

```
User Query → Web Search → Find Product URLs → Crawl4AI Extraction
                                                      │
                                                      ▼
                                         Analyze Page Structure
                                                      │
                                                      ▼
                                     Generate Playwright Script
                                                      │
                                                      ▼
                              Store: Product + Source + Script
```

### 2. Update Flow (Updater Agent)

```
Cron/Manual Trigger → Load Sources needing update
                              │
                              ▼
                    For each source:
                    ├── Load stored Playwright script
                    ├── Execute script via MCP
                    ├── Extract price data
                    └── Store new price record
                              │
                    If script fails:
                    └── Flag for re-discovery
```

### 3. Self-Healing Flow

```
Script Execution Failure → Detect error type
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              Selector Changed           Site Blocked
                    │                           │
                    ▼                           ▼
           Re-run Crawl4AI              Rotate proxy/
           on same URL                  wait & retry
                    │
                    ▼
           AI compares old vs new
           page structure
                    │
                    ▼
           Generate new Playwright
           script
                    │
                    ▼
           Store updated script
```

## Key Design Decisions

### Why Crawl4AI + Playwright?

1. **Crawl4AI for Discovery**: Provides LLM-ready markdown output, handles JavaScript rendering, no API costs for self-hosted

2. **Playwright for Updates**: Faster execution of known scripts, reliable browser automation, good ecosystem

3. **AI-Generated Scripts**: More resilient than hardcoded selectors, can adapt to site changes

### Why NeonDB?

1. **Serverless**: Scales to zero, pay per use
2. **Branching**: Easy to create dev/staging environments
3. **Postgres**: Full SQL support, JSONB for flexible schemas

### Why Vercel AI SDK 6?

1. **Agent Abstraction**: Built-in tool loop handling
2. **MCP Support**: Easy integration with scraping tools
3. **Streaming**: Real-time feedback to users

## Security Considerations

1. **Rate Limiting**: Implement per-source rate limits to avoid being blocked
2. **Proxy Rotation**: Future enhancement for anti-bot bypass
3. **Data Validation**: Validate scraped data before storing
4. **API Keys**: All sensitive keys in environment variables

## Scalability Path

### MVP (Current)
- Single instance, manual triggers
- ~100 sources, ~1000 products

### Phase 2
- Cron-based updates
- Queue-based job processing
- ~1000 sources

### Phase 3
- Distributed scraping workers
- Redis for job queues
- ~10,000+ sources
