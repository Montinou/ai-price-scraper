import {
  pgTable,
  text,
  timestamp,
  decimal,
  jsonb,
  uuid,
  index,
  pgEnum,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "ecommerce",
  "marketplace",
  "classified",
  "custom",
]);

// Products table
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    category: text("category"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("products_name_idx").on(table.name),
    index("products_category_idx").on(table.category),
  ]
);

// Scrape Sources table - stores URLs and generated Playwright scripts
export const scrapeSources = pgTable(
  "scrape_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull().unique(),
    domain: text("domain").notNull(),
    sourceType: sourceTypeEnum("source_type").notNull(),
    // Stores the AI-generated Playwright script and config
    scrapeConfig: jsonb("scrape_config").$type<{
      scriptType?: "playwright" | "crawl4ai";
      script?: string;
      selectors?: Record<string, string>;
      waitFor?: string;
      actions?: Array<{ type: string; selector: string; value?: string }>;
      lastGenerated?: string;
      successRate?: number;
    }>(),
    isActive: boolean("is_active").default(true),
    needsRediscovery: boolean("needs_rediscovery").default(false),
    lastScrapedAt: timestamp("last_scraped_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("sources_domain_idx").on(table.domain),
    index("sources_active_idx").on(table.isActive),
    index("sources_needs_rediscovery_idx").on(table.needsRediscovery),
  ]
);

// Prices table - historical price tracking
export const prices = pgTable(
  "prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => scrapeSources.id, { onDelete: "cascade" }),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("USD").notNull(),
    originalPrice: decimal("original_price", { precision: 12, scale: 2 }),
    inStock: boolean("in_stock").default(true),
    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  },
  (table) => [
    index("prices_product_idx").on(table.productId),
    index("prices_source_idx").on(table.sourceId),
    index("prices_scraped_at_idx").on(table.scrapedAt),
    index("prices_product_scraped_idx").on(table.productId, table.scrapedAt),
  ]
);

// Scrape Jobs table - tracks execution of scrape tasks
export const scrapeJobs = pgTable(
  "scrape_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").references(() => scrapeSources.id, {
      onDelete: "set null",
    }),
    status: jobStatusEnum("status").default("pending").notNull(),
    jobType: text("job_type").notNull(), // 'discovery' | 'update' | 'rediscovery'
    query: text("query"), // Original search query for discovery jobs
    result: jsonb("result").$type<{
      productsFound?: number;
      pricesUpdated?: number;
      errors?: string[];
      scriptGenerated?: boolean;
    }>(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("jobs_status_idx").on(table.status),
    index("jobs_source_idx").on(table.sourceId),
    index("jobs_type_idx").on(table.jobType),
  ]
);

// Product-Source junction table (many-to-many)
export const productSources = pgTable(
  "product_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => scrapeSources.id, { onDelete: "cascade" }),
    externalId: text("external_id"), // Product ID on the source website
    productUrl: text("product_url"), // Direct URL to product on source
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("product_sources_product_idx").on(table.productId),
    index("product_sources_source_idx").on(table.sourceId),
  ]
);

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  prices: many(prices),
  productSources: many(productSources),
}));

export const scrapeSourcesRelations = relations(scrapeSources, ({ many }) => ({
  prices: many(prices),
  scrapeJobs: many(scrapeJobs),
  productSources: many(productSources),
}));

export const pricesRelations = relations(prices, ({ one }) => ({
  product: one(products, {
    fields: [prices.productId],
    references: [products.id],
  }),
  source: one(scrapeSources, {
    fields: [prices.sourceId],
    references: [scrapeSources.id],
  }),
}));

export const scrapeJobsRelations = relations(scrapeJobs, ({ one }) => ({
  source: one(scrapeSources, {
    fields: [scrapeJobs.sourceId],
    references: [scrapeSources.id],
  }),
}));

export const productSourcesRelations = relations(productSources, ({ one }) => ({
  product: one(products, {
    fields: [productSources.productId],
    references: [products.id],
  }),
  source: one(scrapeSources, {
    fields: [productSources.sourceId],
    references: [scrapeSources.id],
  }),
}));

// Type exports
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ScrapeSource = typeof scrapeSources.$inferSelect;
export type NewScrapeSource = typeof scrapeSources.$inferInsert;
export type Price = typeof prices.$inferSelect;
export type NewPrice = typeof prices.$inferInsert;
export type ScrapeJob = typeof scrapeJobs.$inferSelect;
export type NewScrapeJob = typeof scrapeJobs.$inferInsert;
export type ProductSource = typeof productSources.$inferSelect;
export type NewProductSource = typeof productSources.$inferInsert;
