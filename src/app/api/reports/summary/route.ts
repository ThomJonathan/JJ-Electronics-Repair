import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOf(period: "day" | "week" | "month" | "year"): Date {
  const now = new Date();
  if (period === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const day = now.getDay(); // 0 = Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date(now.getFullYear(), 0, 1);
}

async function summaryFor(period: "day" | "week" | "month" | "year") {
  const from = startOf(period);
  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: from } },
  });
  const revenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const cost = sales.reduce((sum, s) => sum + Number(s.totalCost), 0);
  return {
    period,
    from,
    salesCount: sales.length,
    revenue,
    cost,
    profit: revenue - cost,
  };
}

// GET /api/reports/summary - today, this week, this month, this year, all in one call
export async function GET() {
  const [day, week, month, year] = await Promise.all([
    summaryFor("day"),
    summaryFor("week"),
    summaryFor("month"),
    summaryFor("year"),
  ]);

  const lowStockProducts = await prisma.product.findMany({
    where: { isActive: true },
  });
  const stockByProduct = await prisma.stockMovement.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
  });
  const stockMap = new Map(
    stockByProduct.map((s) => [s.productId, s._sum.quantity ?? 0])
  );
  const lowStock = lowStockProducts
    .map((p) => ({ ...p, quantityOnHand: stockMap.get(p.id) ?? 0 }))
    .filter((p) => p.quantityOnHand <= p.reorderLevel);

  const pendingOrders = await prisma.purchaseOrder.count({
    where: { status: { in: ["pending", "partially_received"] } },
  });

  return NextResponse.json({ day, week, month, year, lowStock, pendingOrders });
}
