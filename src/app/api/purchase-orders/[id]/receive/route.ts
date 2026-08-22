import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/purchase-orders/:id/receive
// body: { receivedBy?, items: [{ poItemId, quantity }] }
//
// This is the "receiving" step. You do NOT create new products or new orders here -
// you're confirming quantities against the PO line items that were already entered
// when the order was placed. Each call:
//  1. Records a goods-received note
//  2. Bumps quantityReceived on the matching purchase_order_item
//  3. Adds a stock_movement (type=purchase) - this is what increases stock
//  4. Recalculates the product's weighted-average cost
//  5. Updates the PO status to partially_received or received
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const purchaseOrderId = Number(id);
  const body = await req.json();
  const { receivedBy, items } = body as {
    receivedBy?: string;
    items: { poItemId: number; quantity: number }[];
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "items are required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const grn = await tx.goodsReceivedNote.create({
      data: { purchaseOrderId, receivedBy },
    });

    for (const item of items) {
      if (item.quantity <= 0) continue;

      const poItem = await tx.purchaseOrderItem.findUniqueOrThrow({
        where: { id: item.poItemId },
        include: { product: true },
      });

      // 1. record the received line
      await tx.goodsReceivedItem.create({
        data: { grnId: grn.id, poItemId: item.poItemId, quantity: item.quantity },
      });

      // 2. bump quantityReceived on the PO item
      const updatedPoItem = await tx.purchaseOrderItem.update({
        where: { id: item.poItemId },
        data: { quantityReceived: { increment: item.quantity } },
      });

      // 3. stock movement (increases stock)
      await tx.stockMovement.create({
        data: {
          productId: poItem.productId,
          movementType: "purchase",
          quantity: item.quantity,
          referenceType: "purchase_order_item",
          referenceId: poItem.id,
        },
      });

      // 4. recalculate weighted-average cost for the product
      const priorStock = await tx.stockMovement.aggregate({
        where: { productId: poItem.productId, id: { not: undefined } },
        _sum: { quantity: true },
      });
      const stockBeforeThis = (priorStock._sum.quantity ?? 0) - item.quantity;
      const oldAvgCost = Number(poItem.product.avgCost);
      const newUnitCost = Number(poItem.unitCost);

      const newAvgCost =
        stockBeforeThis > 0
          ? (stockBeforeThis * oldAvgCost + item.quantity * newUnitCost) /
            (stockBeforeThis + item.quantity)
          : newUnitCost;

      await tx.product.update({
        where: { id: poItem.productId },
        data: { avgCost: newAvgCost },
      });
    }

    // 5. recompute PO status
    const allItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
    });
    const fullyReceived = allItems.every(
      (i) => i.quantityReceived >= i.quantityOrdered
    );
    const anyReceived = allItems.some((i) => i.quantityReceived > 0);

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: fullyReceived
          ? "received"
          : anyReceived
          ? "partially_received"
          : "pending",
      },
    });

    return tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: { include: { product: true } } },
    });
  });

  return NextResponse.json(result);
}
