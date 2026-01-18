# Database Schema Documentation

## Overview

The AI Price Scraper uses NeonDB (Serverless Postgres) with Drizzle ORM for type-safe database operations.

## Connection Setup

```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

## Tables

### products

Stores product information discovered during scraping.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Product name |
| description | TEXT | Product description |
| image_url | TEXT | Main product image |
| category | TEXT | Product category |
| metadata | JSONB | Additional attributes |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes**:
- `products_name_idx` on `name`
- `products_category_idx` on `category`

### scrape_sources

Stores URLs and their generated Playwright scripts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| url | TEXT | Source URL (unique) |
| domain | TEXT | Domain name |
| source_type | ENUM | ecommerce, marketplace, classified, custom |
| scrape_config | JSONB | Playwright script and selectors |
| is_active | BOOLEAN | Whether to include in updates |
| needs_rediscovery | BOOLEAN | Script needs regeneration |
| last_scraped_at | TIMESTAMP | Last successful scrape |
| created_at | TIMESTAMP | Creation time |

**Indexes**:
- `sources_domain_idx` on `domain`
- `sources_active_idx` on `is_active`
- `sources_needs_rediscovery_idx` on `needs_rediscovery`

**scrape_config Structure**:
```typescript
{
  scriptType: 'playwright' | 'crawl4ai',
  script: string,           // Playwright code
  selectors: {              // Backup selectors
    name: string,
    price: string,
    image: string
  },
  waitFor: string,          // Element to wait for
  actions: [{               // Pre-scrape actions
    type: 'click' | 'type',
    selector: string,
    value?: string
  }],
  lastGenerated: string,    // ISO timestamp
  successRate: number       // 0-1
}
```

### prices

Historical price records for tracking over time.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| product_id | UUID | FK to products |
| source_id | UUID | FK to scrape_sources |
| price | DECIMAL(12,2) | Current price |
| currency | TEXT | Currency code (default: USD) |
| original_price | DECIMAL(12,2) | Price before discount |
| in_stock | BOOLEAN | Availability status |
| scraped_at | TIMESTAMP | When price was captured |

**Indexes**:
- `prices_product_idx` on `product_id`
- `prices_source_idx` on `source_id`
- `prices_scraped_at_idx` on `scraped_at`
- `prices_product_scraped_idx` on `(product_id, scraped_at)`

### scrape_jobs

Tracks execution of scrape tasks.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| source_id | UUID | FK to scrape_sources (nullable) |
| status | ENUM | pending, running, completed, failed |
| job_type | TEXT | discovery, update, rediscovery |
| query | TEXT | Search query (for discovery) |
| result | JSONB | Job results and errors |
| started_at | TIMESTAMP | Execution start |
| completed_at | TIMESTAMP | Execution end |
| created_at | TIMESTAMP | Job creation time |

**Indexes**:
- `jobs_status_idx` on `status`
- `jobs_source_idx` on `source_id`
- `jobs_type_idx` on `job_type`

### product_sources

Junction table linking products to their sources.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| product_id | UUID | FK to products |
| source_id | UUID | FK to scrape_sources |
| external_id | TEXT | Product ID on source site |
| product_url | TEXT | Direct URL to product |
| created_at | TIMESTAMP | Link creation time |

**Indexes**:
- `product_sources_product_idx` on `product_id`
- `product_sources_source_idx` on `source_id`

## Entity Relationships

```
┌──────────────┐       ┌────────────────────┐       ┌─────────────────┐
│   products   │◄──────│  product_sources   │──────►│  scrape_sources │
│              │       │                    │       │                 │
│ - id         │       │ - product_id (FK)  │       │ - id            │
│ - name       │       │ - source_id (FK)   │       │ - url           │
│ - metadata   │       │ - external_id      │       │ - scrape_config │
└──────┬───────┘       └────────────────────┘       └────────┬────────┘
       │                                                      │
       │                                                      │
       │               ┌────────────────────┐                 │
       └──────────────►│      prices        │◄────────────────┘
                       │                    │
                       │ - product_id (FK)  │
                       │ - source_id (FK)   │
                       │ - price            │
                       │ - scraped_at       │
                       └────────────────────┘
                                │
                                │
                       ┌────────┴───────────┐
                       │    scrape_jobs     │
                       │                    │
                       │ - source_id (FK)   │
                       │ - status           │
                       │ - job_type         │
                       └────────────────────┘
```

## Common Queries

### Get latest prices for a product

```typescript
const latestPrices = await db
  .select({
    price: prices.price,
    currency: prices.currency,
    sourceUrl: scrapeSources.url,
    domain: scrapeSources.domain,
    scrapedAt: prices.scrapedAt,
  })
  .from(prices)
  .innerJoin(scrapeSources, eq(prices.sourceId, scrapeSources.id))
  .where(eq(prices.productId, productId))
  .orderBy(desc(prices.scrapedAt))
  .limit(10);
```

### Get price history for a product

```typescript
const priceHistory = await db
  .select({
    price: prices.price,
    scrapedAt: prices.scrapedAt,
    source: scrapeSources.domain,
  })
  .from(prices)
  .innerJoin(scrapeSources, eq(prices.sourceId, scrapeSources.id))
  .where(
    and(
      eq(prices.productId, productId),
      gte(prices.scrapedAt, thirtyDaysAgo)
    )
  )
  .orderBy(asc(prices.scrapedAt));
```

### Get sources needing update

```typescript
const sourcesToUpdate = await db
  .select()
  .from(scrapeSources)
  .where(
    and(
      eq(scrapeSources.isActive, true),
      or(
        isNull(scrapeSources.lastScrapedAt),
        lt(scrapeSources.lastScrapedAt, twentyFourHoursAgo)
      )
    )
  );
```

### Get sources needing rediscovery

```typescript
const sourcesToRediscover = await db
  .select()
  .from(scrapeSources)
  .where(
    and(
      eq(scrapeSources.isActive, true),
      eq(scrapeSources.needsRediscovery, true)
    )
  );
```

## Migrations

### Initial Setup

```bash
# Generate migration
pnpm db:generate

# Push to database
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

### Adding New Columns

1. Update `src/lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:push` to apply

## Performance Considerations

### Indexes

The schema includes indexes for:
- Foreign key lookups
- Common filter conditions (is_active, status)
- Time-based queries (scraped_at)
- Composite queries (product_id + scraped_at)

### JSONB Optimization

For frequently queried JSONB fields, consider:
```sql
CREATE INDEX idx_scrape_config_script_type
ON scrape_sources ((scrape_config->>'scriptType'));
```

### Partitioning (Future)

For large price tables, consider partitioning by date:
```sql
CREATE TABLE prices (
  ...
) PARTITION BY RANGE (scraped_at);
```
