# AI Agents Documentation

## Overview

The AI Price Scraper uses multiple specialized agents built with Vercel AI SDK 6. Each agent has specific responsibilities and tools.

## Agent Types

### 1. Explorer Agent (Discovery)

**Purpose**: Discover new product sources and generate extraction scripts.

**Model**: Claude Sonnet 4 (via AI Gateway)

**Tools**:
- `webSearch`: Search the web for product listings
- `crawl4aiScrape`: Extract data using Crawl4AI MCP
- `generatePlaywrightScript`: Create reusable extraction scripts
- `saveSource`: Store source and script in database

**Workflow**:
```
1. Receive product search query
2. Search web for product across e-commerce sites
3. For each result:
   a. Use Crawl4AI to extract page content
   b. Analyze HTML structure
   c. Generate Playwright script for future updates
   d. Save product, source, and script to database
4. Return ranked results by price
```

**Example Implementation**:
```typescript
import { Agent, tool } from 'ai';
import { z } from 'zod';

export const explorerAgent = new Agent({
  name: 'ExplorerAgent',
  model: 'claude-sonnet-4-20250514',
  instructions: `You are a product discovery agent. Given a product query:
    1. Search the web for the product across e-commerce sites
    2. Use Crawl4AI to scrape product pages
    3. Analyze page structure and generate Playwright scripts
    4. Register sources with scripts in the database
    5. Return results ranked by price (lowest first)`,
  tools: {
    webSearch: tool({
      description: 'Search the web for products',
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        // Implementation using Tavily or similar
      }
    }),
    crawl4aiScrape: tool({
      description: 'Scrape product data using Crawl4AI',
      parameters: z.object({
        url: z.string(),
        extractSchema: z.record(z.string())
      }),
      execute: async ({ url, extractSchema }) => {
        // Call Crawl4AI MCP tool
      }
    }),
    generatePlaywrightScript: tool({
      description: 'Generate a Playwright script based on page structure',
      parameters: z.object({
        url: z.string(),
        pageHtml: z.string(),
        dataPoints: z.array(z.string())
      }),
      execute: async ({ url, pageHtml, dataPoints }) => {
        // AI analyzes HTML and generates extraction script
      }
    }),
    saveSource: tool({
      description: 'Save source with Playwright script',
      parameters: z.object({
        url: z.string(),
        domain: z.string(),
        sourceType: z.enum(['ecommerce', 'marketplace', 'classified']),
        playwrightScript: z.string()
      }),
      execute: async (params) => {
        // Insert into scrape_sources table
      }
    }),
  }
});
```

### 2. Updater Agent (Price Refresh)

**Purpose**: Execute stored scripts to update prices.

**Model**: Claude Haiku 4 (cheaper for routine tasks)

**Tools**:
- `executePlaywright`: Run stored Playwright scripts
- `savePrice`: Store new price records
- `flagForRediscovery`: Mark sources needing script regeneration

**Workflow**:
```
1. Load sources due for update
2. For each source:
   a. Retrieve stored Playwright script
   b. Execute via Playwright MCP
   c. Validate extracted data
   d. If success: save new price
   e. If failure: flag for rediscovery
3. Report results
```

**Example Implementation**:
```typescript
export const updaterAgent = new Agent({
  name: 'UpdaterAgent',
  model: 'claude-haiku-4-20250514',
  instructions: `Execute stored Playwright scripts to update prices.
    1. Load the script for the source
    2. Execute via Playwright MCP
    3. Validate the extracted data
    4. If script fails, flag for re-discovery
    5. Store new price in database`,
  tools: {
    executePlaywright: tool({
      description: 'Execute a Playwright script',
      parameters: z.object({
        script: z.string(),
        url: z.string()
      }),
      execute: async ({ script, url }) => {
        // Execute via Playwright MCP
      }
    }),
    savePrice: tool({
      description: 'Save a new price record',
      parameters: z.object({
        productId: z.string(),
        sourceId: z.string(),
        price: z.number(),
        currency: z.string(),
        inStock: z.boolean()
      }),
      execute: async (params) => {
        // Insert into prices table
      }
    }),
    flagForRediscovery: tool({
      description: 'Mark source as needing script regeneration',
      parameters: z.object({ sourceId: z.string() }),
      execute: async ({ sourceId }) => {
        // Update source.needsRediscovery = true
      }
    }),
  }
});
```

### 3. Price Agent (Analysis) - Future

**Purpose**: Analyze price data and provide insights.

**Capabilities** (planned):
- Price trend analysis
- Best deal recommendations
- Price alert triggering
- Competitor price comparison

## MCP Integration

### Crawl4AI MCP Server

**Installation**:
```json
{
  "mcpServers": {
    "crawl4ai": {
      "command": "uvx",
      "args": ["crawl4ai-mcp"]
    }
  }
}
```

**Available Tools**:
- `scrape`: Single page extraction
- `crawl`: Multi-page breadth-first crawling
- `crawl_site`: Full site crawl
- `crawl_sitemap`: Sitemap-based crawling

### Playwright MCP Server

**Installation**:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    }
  }
}
```

**Available Tools**:
- `browser_navigate`: Navigate to URL
- `browser_click`: Click elements
- `browser_type`: Type into inputs
- `browser_snapshot`: Get accessibility tree
- `browser_screenshot`: Capture page

## AI-Generated Scripts

### Script Structure

Scripts are stored in the `scrape_sources.scrape_config` JSONB column:

```typescript
interface ScrapeConfig {
  scriptType: 'playwright' | 'crawl4ai';
  script: string;  // The actual Playwright code
  selectors?: Record<string, string>;  // Backup selectors
  waitFor?: string;  // Element to wait for
  actions?: Array<{
    type: 'click' | 'type' | 'scroll';
    selector: string;
    value?: string;
  }>;
  lastGenerated: string;  // ISO timestamp
  successRate: number;  // 0-1, updated on each run
}
```

### Example Generated Script

```javascript
async function scrapeProduct(page) {
  await page.goto(url);
  await page.waitForSelector('[data-testid="product-price"]');

  const data = await page.evaluate(() => ({
    name: document.querySelector('h1.product-title')?.textContent?.trim(),
    price: parseFloat(
      document.querySelector('[data-testid="product-price"]')
        ?.textContent?.replace(/[^0-9.]/g, '')
    ),
    originalPrice: parseFloat(
      document.querySelector('.original-price')
        ?.textContent?.replace(/[^0-9.]/g, '')
    ) || null,
    inStock: !document.querySelector('.out-of-stock'),
    imageUrl: document.querySelector('.product-image img')?.src
  }));

  return data;
}
```

## Best Practices

### 1. Agent Instructions

- Be specific about the task
- Include step-by-step guidance
- Specify output format expected

### 2. Tool Design

- Single responsibility per tool
- Clear parameter descriptions
- Proper error handling

### 3. Script Generation

- Use data-testid attributes when available
- Include fallback selectors
- Handle loading states

### 4. Error Handling

- Retry transient failures
- Flag persistent failures for rediscovery
- Log errors for debugging
