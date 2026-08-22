import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/purchase-orders - list, optionally filter by status via ?status=pending
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");

  const orders = await prisma.purchaseOrder.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
    orderBy: { orderDate: "desc" },
  });

  return NextResponse.json(orders);
}

// POST /api/purchase-orders
// body: { supplierId?, referenceNo?, expectedDate?, items: [{ productId, quantityOrdered, unitCost }] }
// This is where you record what you've ORDERED. Products are referenced by id, not retyped.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { supplierId, referenceNo, expectedDate, items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items are required" }, { status: 400 });
  }

  const order = await prisma.purchaseOrder.create({
    data: {
      supplierId: supplierId ? Number(supplierId) : undefined,
      referenceNo,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      status: "pending",
      items: {
        create: items.map((it: any) => ({
          productId: Number(it.productId),
          quantityOrdered: Number(it.quantityOrdered),
          unitCost: it.unitCost,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  return NextResponse.json(order, { status: 201 });
}
