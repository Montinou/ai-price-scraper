# Scraping Patterns Documentation

## Overview

This document describes the AI-powered scraping patterns used in the system, including script generation, self-healing, and best practices.

## Two-Phase Scraping Architecture

### Phase 1: Discovery (Explorer Agent)

The discovery phase uses Crawl4AI for initial extraction and generates Playwright scripts for future updates.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: DISCOVERY                            │
│                                                                  │
│  User Query                                                      │
│       │                                                          │
│       ▼                                                          │
│  Web Search (Tavily/SerpAPI)                                     │
│       │                                                          │
│       ▼                                                          │
│  For each result URL:                                            │
│       │                                                          │
│       ├──► Crawl4AI MCP: Extract page content                    │
│       │         │                                                │
│       │         ▼                                                │
│       │    AI analyzes HTML structure                            │
│       │         │                                                │
│       │         ▼                                                │
│       │    Generate Playwright script                            │
│       │         │                                                │
│       │         ▼                                                │
│       └──► Store: Product + Source + Script                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Update (Updater Agent)

The update phase executes stored scripts to refresh prices without re-analyzing pages.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: UPDATE                               │
│                                                                  │
│  Trigger (Cron/Manual)                                           │
│       │                                                          │
│       ▼                                                          │
│  Load active sources needing update                              │
│       │                                                          │
│       ▼                                                          │
│  For each source:                                                │
│       │                                                          │
│       ├──► Load stored Playwright script                         │
│       │         │                                                │
│       │         ▼                                                │
│       │    Execute via Playwright MCP                            │
│       │         │                                                │
│       │    ┌────┴────┐                                           │
│       │    │         │                                           │
│       │ Success    Failure                                       │
│       │    │         │                                           │
│       │    ▼         ▼                                           │
│       │  Save     Flag for                                       │
│       │  Price    Rediscovery                                    │
│       │                                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Crawl4AI Integration

### MCP Configuration

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

### Available Tools

| Tool | Description | Use Case |
|------|-------------|----------|
| `scrape` | Single page extraction | Product pages |
| `crawl` | Multi-page BFS crawling | Category pages |
| `crawl_site` | Full site crawl | Sitemap discovery |
| `crawl_sitemap` | Sitemap-based crawling | Large sites |

### Extraction Schema

```typescript
const extractSchema = {
  name: "string",
  price: "number",
  currency: "string",
  original_price: "number",
  in_stock: "boolean",
  image_url: "string",
  description: "string"
};

// Usage with Crawl4AI MCP
const result = await crawl4ai.scrape({
  url: productUrl,
  extract_schema: extractSchema
});
```

## AI-Generated Playwright Scripts

### Script Generation Process

1. **HTML Analysis**: AI examines page structure
2. **Element Identification**: Find stable selectors for data points
3. **Script Generation**: Create executable Playwright code
4. **Validation**: Test script against current page

### Script Template

```javascript
async function scrapeProduct(page, url) {
  // Navigate to page
  await page.goto(url, { waitUntil: 'networkidle' });

  // Wait for key element
  await page.waitForSelector('[data-testid="product-price"]', {
    timeout: 10000
  });

  // Handle dynamic content (if needed)
  // await page.click('.show-more-button');

  // Extract data
  const data = await page.evaluate(() => {
    // Helper function for safe text extraction
    const getText = (selector) =>
      document.querySelector(selector)?.textContent?.trim() || null;

    // Helper function for price parsing
    const getPrice = (selector) => {
      const text = getText(selector);
      return text ? parseFloat(text.replace(/[^0-9.]/g, '')) : null;
    };

    return {
      name: getText('h1.product-title') || getText('[data-testid="product-name"]'),
      price: getPrice('[data-testid="product-price"]') || getPrice('.current-price'),
      originalPrice: getPrice('.original-price') || getPrice('.was-price'),
      currency: 'USD', // Or extract from page
      inStock: !document.querySelector('.out-of-stock, .sold-out'),
      imageUrl: document.querySelector('.product-image img')?.src
    };
  });

  return data;
}
```

### Selector Strategy

**Priority Order** (most stable first):

1. `data-testid` attributes: `[data-testid="product-price"]`
2. `data-*` attributes: `[data-price]`
3. ARIA labels: `[aria-label="Price"]`
4. Semantic HTML: `<price>`, `<h1>`
5. Stable classes: `.product-price` (if consistent)
6. ID attributes: `#price`
7. Complex CSS selectors: `.product-info > .pricing > span:first-child`

### Storage Format

```typescript
interface ScrapeConfig {
  scriptType: 'playwright';
  script: string;
  selectors: {
    name: string[];      // Fallback selectors
    price: string[];
    originalPrice: string[];
    inStock: string[];
    imageUrl: string[];
  };
  waitFor: string;       // Primary wait selector
  actions: Array<{       // Pre-scrape actions
    type: 'click' | 'type' | 'scroll' | 'wait';
    selector?: string;
    value?: string;
    delay?: number;
  }>;
  lastGenerated: string;
  successRate: number;
  failureCount: number;
}
```

## Self-Healing Pattern

### Failure Detection

```typescript
enum FailureType {
  SELECTOR_NOT_FOUND = 'selector_not_found',
  TIMEOUT = 'timeout',
  BLOCKED = 'blocked',
  CAPTCHA = 'captcha',
  DATA_VALIDATION = 'data_validation',
  NETWORK_ERROR = 'network_error'
}

interface ScrapingResult {
  success: boolean;
  data?: ProductData;
  error?: {
    type: FailureType;
    message: string;
    selector?: string;
  };
}
```

### Recovery Strategies

| Failure Type | Strategy |
|--------------|----------|
| SELECTOR_NOT_FOUND | Trigger rediscovery |
| TIMEOUT | Retry with longer timeout |
| BLOCKED | Rotate proxy, add delay |
| CAPTCHA | Manual intervention or CAPTCHA solver |
| DATA_VALIDATION | Log warning, keep old data |
| NETWORK_ERROR | Retry with backoff |

### Rediscovery Flow

```typescript
async function handleScriptFailure(source: ScrapeSource, error: ScrapingError) {
  const failureCount = (source.scrapeConfig?.failureCount || 0) + 1;

  if (failureCount >= 3) {
    // Mark for rediscovery
    await db.update(scrapeSources)
      .set({
        needsRediscovery: true,
        scrapeConfig: {
          ...source.scrapeConfig,
          failureCount
        }
      })
      .where(eq(scrapeSources.id, source.id));

    // Create rediscovery job
    await db.insert(scrapeJobs).values({
      sourceId: source.id,
      jobType: 'rediscovery',
      status: 'pending'
    });
  } else {
    // Increment failure count
    await db.update(scrapeSources)
      .set({
        scrapeConfig: {
          ...source.scrapeConfig,
          failureCount
        }
      })
      .where(eq(scrapeSources.id, source.id));
  }
}
```

### Script Regeneration

```typescript
async function regenerateScript(source: ScrapeSource) {
  // 1. Re-crawl with Crawl4AI
  const crawlResult = await crawl4ai.scrape({
    url: source.url,
    extract_schema: productSchema
  });

  // 2. Get new HTML structure
  const pageHtml = crawlResult.html;

  // 3. AI generates new script
  const newScript = await explorerAgent.tools.generatePlaywrightScript({
    url: source.url,
    pageHtml,
    dataPoints: ['name', 'price', 'originalPrice', 'inStock', 'imageUrl']
  });

  // 4. Validate new script
  const testResult = await executeScript(newScript, source.url);

  if (testResult.success) {
    // 5. Save new script
    await db.update(scrapeSources)
      .set({
        scrapeConfig: {
          scriptType: 'playwright',
          script: newScript,
          lastGenerated: new Date().toISOString(),
          successRate: 1.0,
          failureCount: 0
        },
        needsRediscovery: false
      })
      .where(eq(scrapeSources.id, source.id));
  }
}
```

## Best Practices

### 1. Respectful Scraping

- Implement rate limiting per domain
- Respect robots.txt (when possible)
- Use reasonable delays between requests
- Identify your scraper in User-Agent

### 2. Data Validation

```typescript
function validateProductData(data: any): data is ProductData {
  return (
    typeof data.name === 'string' &&
    data.name.length > 0 &&
    typeof data.price === 'number' &&
    data.price > 0 &&
    data.price < 1000000 // Sanity check
  );
}
```

### 3. Error Handling

```typescript
async function safeScrape(source: ScrapeSource): Promise<ScrapingResult> {
  try {
    const data = await executeScript(source.scrapeConfig.script, source.url);

    if (!validateProductData(data)) {
      return {
        success: false,
        error: { type: FailureType.DATA_VALIDATION, message: 'Invalid data' }
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: classifyError(error)
    };
  }
}
```

### 4. Monitoring

Track these metrics per source:
- Success rate (last 7 days)
- Average scrape duration
- Last successful scrape
- Failure count
- Data freshness

## Anti-Bot Considerations

### Current MVP

- Basic delays between requests
- Standard browser fingerprint

### Future Enhancements

- Proxy rotation
- Browser fingerprint randomization
- CAPTCHA solving integration
- Residential proxy support
