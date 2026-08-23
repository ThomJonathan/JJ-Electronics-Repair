import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, items } = body as {
    customerName?: string;
    items: { productId: number; quantity: number; unitPrice: number }[];
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "items are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(
      async (tx) => {
        // one round trip for all products instead of one per item
        const productIds = items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });
        const productById = new Map(products.map((p) => [p.id, p]));

        let totalAmount = 0;
        let totalCost = 0;
        const saleItemsData = items.map((item) => {
          const product = productById.get(item.productId);
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }
          const unitCost = Number(product.avgCost);
          totalAmount += item.quantity * item.unitPrice;
          totalCost += item.quantity * unitCost;
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            unitCost,
          };
        });

        const sale = await tx.sale.create({
          data: {
            customerName,
            totalAmount,
            totalCost,
            items: { create: saleItemsData },
          },
          include: { items: { include: { product: true } } },
        });

        // one round trip for all stock movements instead of one per item
        await tx.stockMovement.createMany({
          data: sale.items.map((item) => ({
            productId: item.productId,
            movementType: "sale",
            quantity: -item.quantity,
            referenceType: "sale_item",
            referenceId: item.id,
          })),
        });

        return sale;
      },
      { maxWait: 10000, timeout: 15000 }
  );

  return NextResponse.json(result, { status: 201 });
}