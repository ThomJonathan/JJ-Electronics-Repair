import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/products/:id/restock
// body: { quantity, unitCost, sellingPrice? }
//
// Use this when stock physically arrived but was never placed as a formal
// purchase order (e.g. a quick top-up run). It:
//  1. Adds a stock_movement (type=purchase) - increases what shows as "In Stock"
//  2. Recalculates the product's weighted-average cost, blending the new
//     unit cost with whatever cost basis the existing stock had
//  3. Optionally updates the product's default sell price going forward
//
// It does NOT touch Sale or SaleItem records in any way, so historical sales
// reports (quantity sold, price sold at, profit) are completely unaffected -
// those rows already snapshot their own unitPrice/unitCost at the time they
// were recorded and never look back at the product afterwards.
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const productId = Number(id);
    const body = await req.json();
    const { quantity, unitCost, sellingPrice } = body as {
        quantity: number;
        unitCost: number;
        sellingPrice?: number;
    };

    if (!quantity || quantity <= 0) {
        return NextResponse.json({ error: "quantity must be greater than 0" }, { status: 400 });
    }
    if (unitCost === undefined || unitCost === null || unitCost < 0) {
        return NextResponse.json({ error: "unitCost is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });

        const priorStock = await tx.stockMovement.aggregate({
            where: { productId },
            _sum: { quantity: true },
        });
        const stockBefore = priorStock._sum.quantity ?? 0;
        const oldAvgCost = Number(product.avgCost);

        const newAvgCost =
            stockBefore > 0
                ? (stockBefore * oldAvgCost + quantity * unitCost) / (stockBefore + quantity)
                : unitCost;

        await tx.stockMovement.create({
            data: {
                productId,
                movementType: "purchase",
                quantity,
                referenceType: "manual",
            },
        });

        const updated = await tx.product.update({
            where: { id: productId },
            data: {
                avgCost: newAvgCost,
                ...(sellingPrice !== undefined && sellingPrice !== null ? { sellingPrice } : {}),
            },
        });

        return updated;
    });

    return NextResponse.json({
        id: result.id,
        name: result.name,
        avgCost: Number(result.avgCost),
        sellingPrice: Number(result.sellingPrice),
    });
}