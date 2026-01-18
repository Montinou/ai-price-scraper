// Product types
export interface ProductData {
  name: string;
  price: number;
  currency: string;
  originalPrice?: number | null;
  inStock: boolean;
  imageUrl?: string | null;
  description?: string | null;
}

export interface ProductWithPrices {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  prices: PriceRecord[];
  sources: SourceInfo[];
}

// Price types
export interface PriceRecord {
  id: string;
  price: string;
  currency: string;
  originalPrice?: string | null;
  inStock: boolean;
  scrapedAt: Date;
  source: SourceInfo;
}

export interface PriceHistory {
  date: Date;
  price: number;
  source: string;
}

// Source types
export interface SourceInfo {
  id: string;
  url: string;
  domain: string;
  sourceType: "ecommerce" | "marketplace" | "classified" | "custom";
}

export interface ScrapeConfig {
  scriptType: "playwright" | "crawl4ai";
  script?: string;
  selectors?: Record<string, string[]>;
  waitFor?: string;
  actions?: ScrapeAction[];
  lastGenerated?: string;
  successRate?: number;
  failureCount?: number;
}

export interface ScrapeAction {
  type: "click" | "type" | "scroll" | "wait";
  selector?: string;
  value?: string;
  delay?: number;
}

// Job types
export interface ScrapeJobResult {
  productsFound?: number;
  pricesUpdated?: number;
  errors?: string[];
  scriptGenerated?: boolean;
}

// API types
export interface DiscoverRequest {
  query: string;
}

export interface DiscoverResponse {
  success: boolean;
  jobId: string;
  results?: SearchResult[];
  error?: string;
}

export interface SearchResult {
  url: string;
  title: string;
  price?: number;
  currency?: string;
  domain: string;
  snippet?: string;
}

export interface UpdateRequest {
  sourceIds?: string[];
  all?: boolean;
}

export interface UpdateResponse {
  success: boolean;
  jobId: string;
  updated: number;
  failed: number;
  errors?: string[];
}

// Scraping result types
export enum FailureType {
  SELECTOR_NOT_FOUND = "selector_not_found",
  TIMEOUT = "timeout",
  BLOCKED = "blocked",
  CAPTCHA = "captcha",
  DATA_VALIDATION = "data_validation",
  NETWORK_ERROR = "network_error",
}

export interface ScrapingError {
  type: FailureType;
  message: string;
  selector?: string;
}

export interface ScrapingResult {
  success: boolean;
  data?: ProductData;
  error?: ScrapingError;
}
