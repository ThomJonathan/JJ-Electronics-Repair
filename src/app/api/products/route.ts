import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/products - list all products, with current stock computed from stock_movements
export async function GET() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const stockByProduct = await prisma.stockMovement.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
  });
  const stockMap = new Map(
    stockByProduct.map((s) => [s.productId, s._sum.quantity ?? 0])
  );

  const result = products.map((p) => ({
    ...p,
    quantityOnHand: stockMap.get(p.id) ?? 0,
    lowStock: (stockMap.get(p.id) ?? 0) <= p.reorderLevel,
  }));

  return NextResponse.json(result);
}

// POST /api/products - create a new product (enter it ONCE here, never again)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sku, name, categoryId, brand, description, reorderLevel, buyingPrice, sellingPrice, initialQuantity } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        sku: sku || undefined,
        name,
        categoryId: categoryId ? Number(categoryId) : undefined,
        brand,
        description,
        reorderLevel: reorderLevel ? Number(reorderLevel) : 5,
        avgCost: buyingPrice ? Number(buyingPrice) : 0,
        sellingPrice: sellingPrice ? Number(sellingPrice) : 0,
      },
    });

    if (initialQuantity && Number(initialQuantity) !== 0) {
      await tx.stockMovement.create({
        data: {
          productId: p.id,
          movementType: "adjustment",
          quantity: Number(initialQuantity),
          referenceType: "manual",
        },
      });
    }

    return p;
  });

  return NextResponse.json(product, { status: 201 });
}
