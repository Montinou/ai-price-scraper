# AI Price Scraper

An AI-powered price tracking system that uses intelligent agents to discover, scrape, and monitor product prices across the web.

## Features

- **AI-Powered Discovery**: Search for products and let AI agents find the best prices across multiple e-commerce sites
- **Smart Script Generation**: AI automatically generates Playwright scripts for each source
- **Self-Healing**: Scripts automatically regenerate when websites change their structure
- **Price History**: Track price changes over time with historical data
- **Multiple Sources**: Compare prices from Amazon, eBay, Best Buy, and more

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Database**: NeonDB (Serverless Postgres) with Drizzle ORM
- **AI**: Vercel AI SDK 6 with Claude
- **Scraping**: Crawl4AI + Playwright MCP
- **UI**: shadcn/ui components
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- NeonDB account
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ai-scrapper

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...  # Optional
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AI AGENTS (Vercel AI SDK 6)                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ EXPLORER AGENT  │───▶│ UPDATER AGENT   │                     │
│  │ - Discover URLs │    │ - Run scripts   │                     │
│  │ - Gen scripts   │    │ - Update prices │                     │
│  └─────────────────┘    └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (NeonDB + Drizzle)                   │
│  products │ prices │ scrape_sources │ scrape_jobs               │
└─────────────────────────────────────────────────────────────────┘
```

## How It Works

### Phase 1: Discovery

1. User enters a product search query
2. Explorer Agent searches the web for product listings
3. For each result:
   - Crawl4AI extracts the page content
   - AI analyzes the structure
   - Playwright script is generated
   - Product, source, and initial price are saved

### Phase 2: Updates

1. Updater Agent loads sources needing refresh
2. Executes stored Playwright scripts
3. Validates extracted data
4. Saves new price records
5. If script fails, flags for rediscovery

## Project Structure

```
/ai-scrapper
├── /src
│   ├── /app                  # Next.js App Router
│   │   ├── /api              # API routes
│   │   └── page.tsx          # Main page
│   ├── /components           # React components
│   │   └── /ui               # shadcn components
│   ├── /lib
│   │   ├── /agents           # AI agent definitions
│   │   └── /db               # Database schema
│   └── /types                # TypeScript types
├── /docs                     # Documentation
├── drizzle.config.ts         # Database config
└── package.json
```

## Documentation

- [Architecture](./docs/architecture.md)
- [AI Agents](./docs/agents.md)
- [Database Schema](./docs/database.md)
- [Scraping Patterns](./docs/scraping-patterns.md)
- [Deployment](./docs/deployment.md)

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio
pnpm db:generate  # Generate migrations
```

## MCP Setup (for Claude Code)

Add to your Claude settings:

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

## MVP Scope

### Included
- [x] Project setup with Next.js 16
- [x] Database schema (products, prices, sources, jobs)
- [x] Basic UI with search form
- [x] API route stubs
- [ ] Explorer Agent implementation
- [ ] Updater Agent implementation
- [ ] Price history charts
- [ ] Source management UI

### Future
- Automated cron updates
- Price alerts
- Advanced analytics
- User authentication
- Multi-currency support

## License

MIT

## Research Sources

- [AI SDK 6 Documentation](https://ai-sdk.dev/docs/introduction)
- [Crawl4AI](https://github.com/unclecode/crawl4ai)
- [NeonDB + Drizzle](https://orm.drizzle.team/docs/tutorials/drizzle-nextjs-neon)
- [Best AI Web Scrapers 2026](https://www.kadoa.com/blog/best-ai-web-scrapers-2026)
