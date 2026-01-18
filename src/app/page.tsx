import { SearchForm } from "@/components/search-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            AI Price Scraper
          </h1>
          <p className="text-muted-foreground text-lg">
            Find the best prices across the web with AI-powered search
          </p>
        </header>

        <SearchForm />

        <section className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-3xl mb-3">1</div>
              <h3 className="font-semibold mb-2">Search</h3>
              <p className="text-muted-foreground text-sm">
                Enter a product name and our AI agent searches across multiple e-commerce sites
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-3xl mb-3">2</div>
              <h3 className="font-semibold mb-2">Compare</h3>
              <p className="text-muted-foreground text-sm">
                See prices from different sources ranked from lowest to highest
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="text-3xl mb-3">3</div>
              <h3 className="font-semibold mb-2">Track</h3>
              <p className="text-muted-foreground text-sm">
                Save products to track price changes over time with automatic updates
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
