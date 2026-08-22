import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const sales = await prisma.sale.findMany({
    where: {
      saleDate: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { items: { include: { product: true } } },
    orderBy: { saleDate: "desc" },
  });

  return NextResponse.json(sales);
}

// POST /api/sales
// body: { customerName?, items: [{ productId, quantity, unitPrice }] }
// unitCost is pulled automatically from the product's current average cost -
// you only type the selling price.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, items } = body as {
    customerName?: string;
    items: { productId: number; quantity: number; unitPrice: number }[];
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "items are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    let totalCost = 0;
    const saleItemsData = [];

    for (const item of items) {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: item.productId },
      });
      const unitCost = Number(product.avgCost);
      totalAmount += item.quantity * item.unitPrice;
      totalCost += item.quantity * unitCost;
      saleItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost,
      });
    }

    const sale = await tx.sale.create({
      data: {
        customerName,
        totalAmount,
        totalCost,
        items: { create: saleItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    // reduce stock for each item sold
    for (const item of sale.items) {
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          movementType: "sale",
          quantity: -item.quantity,
          referenceType: "sale_item",
          referenceId: item.id,
        },
      });
    }

    return sale;
  });

  return NextResponse.json(result, { status: 201 });
}
