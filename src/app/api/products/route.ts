import { NextRequest, NextResponse } from "next/server";
// import { db, products, prices, scrapeSources } from "@/lib/db";
// import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get("id");
    const limit = parseInt(searchParams.get("limit") || "20");

    // TODO: Implement with database
    // if (productId) {
    //   // Get single product with prices
    //   const product = await db.query.products.findFirst({
    //     where: eq(products.id, productId),
    //     with: {
    //       prices: {
    //         orderBy: desc(prices.scrapedAt),
    //         limit: 10,
    //         with: {
    //           source: true
    //         }
    //       }
    //     }
    //   });
    //   return NextResponse.json(product);
    // }
    //
    // // Get all products
    // const allProducts = await db.query.products.findMany({
    //   limit,
    //   orderBy: desc(products.updatedAt),
    // });

    // Placeholder response
    const placeholderProducts = [
      {
        id: "1",
        name: "Example Product",
        description: "A sample product",
        imageUrl: null,
        category: "Electronics",
        prices: [
          {
            price: "99.99",
            currency: "USD",
            scrapedAt: new Date().toISOString(),
          },
        ],
      },
    ];

    if (productId) {
      return NextResponse.json(
        placeholderProducts.find((p) => p.id === productId) || null
      );
    }

    return NextResponse.json(placeholderProducts);
  } catch (error) {
    console.error("Products error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
