import { NextRequest, NextResponse } from "next/server";
// import { db, scrapeSources } from "@/lib/db";
// import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceId = searchParams.get("id");
    const activeOnly = searchParams.get("active") === "true";

    // TODO: Implement with database
    // const query = db.select().from(scrapeSources);
    //
    // if (activeOnly) {
    //   query.where(eq(scrapeSources.isActive, true));
    // }
    //
    // const sources = await query.orderBy(desc(scrapeSources.createdAt));

    // Placeholder response
    const placeholderSources = [
      {
        id: "1",
        url: "https://example.com/products/1",
        domain: "example.com",
        sourceType: "ecommerce",
        isActive: true,
        needsRediscovery: false,
        lastScrapedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    if (sourceId) {
      return NextResponse.json(
        placeholderSources.find((s) => s.id === sourceId) || null
      );
    }

    return NextResponse.json(placeholderSources);
  } catch (error) {
    console.error("Sources error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // TODO: Implement with database
    // const domain = new URL(body.url).hostname;
    //
    // const [source] = await db.insert(scrapeSources).values({
    //   url: body.url,
    //   domain,
    //   sourceType: body.sourceType || 'custom',
    //   scrapeConfig: body.scrapeConfig || null,
    // }).returning();

    // Placeholder response
    const source = {
      id: crypto.randomUUID(),
      url: body.url,
      domain: new URL(body.url).hostname,
      sourceType: body.sourceType || "custom",
      isActive: true,
      needsRediscovery: false,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error("Create source error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
