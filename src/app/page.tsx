import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

function startOf(period: "day" | "week" | "month" | "year"): Date {
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getFullYear(), 0, 1);
}

async function summaryFor(period: "day" | "week" | "month" | "year") {
  const from = startOf(period);
  const sales = await prisma.sale.findMany({ where: { saleDate: { gte: from } } });
  const revenue = sales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const cost = sales.reduce((s, x) => s + Number(x.totalCost), 0);
  return { revenue, cost, profit: revenue - cost, count: sales.length };
}

function fmt(n: number) {
  return "MWK " + Math.round(n).toLocaleString();
}

function SummaryCard({
  title,
  data,
}: {
  title: string;
  data: { revenue: number; cost: number; profit: number; count: number };
}) {
  return (
    <div className="card">
      <div className="stat-label">{title}</div>
      <div className="stat-value cyan">{fmt(data.revenue)}</div>
      <div className="stat-foot">
        Profit {fmt(data.profit)} · {data.count} sale{data.count === 1 ? "" : "s"}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [day, week, month, year] = await Promise.all([
    summaryFor("day"),
    summaryFor("week"),
    summaryFor("month"),
    summaryFor("year"),
  ]);

  const products = await prisma.product.findMany({ where: { isActive: true } });
  const stock = await prisma.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } });
  const stockMap = new Map(stock.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const lowStock = products.filter((p) => (stockMap.get(p.id) ?? 0) <= p.reorderLevel);

  const inventoryValue = products.reduce(
    (sum, p) => sum + (stockMap.get(p.id) ?? 0) * Number(p.avgCost),
    0
  );
  const unitsInStock = products.reduce((sum, p) => sum + (stockMap.get(p.id) ?? 0), 0);

  const pendingOrders = await prisma.purchaseOrder.count({
    where: { status: { in: ["pending", "partially_received"] } },
  });

  return (
    <div className="stack">
      <PageHeader title="Dashboard" subtitle="Your business at a glance" />

      <div className="grid grid-4">
        <SummaryCard title="Today" data={day} />
        <SummaryCard title="This Week" data={week} />
        <SummaryCard title="This Month" data={month} />
        <SummaryCard title="This Year" data={year} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">
            Low Stock <span className="tag">{lowStock.length} item(s)</span>
          </div>
          {lowStock.length === 0 ? (
            <div className="empty">Nothing low right now.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>In Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Product">
                        <b>{p.name}</b>
                      </td>
                      <td data-label="In Stock">
                        <span className="badge badge-low">{stockMap.get(p.id) ?? 0} left</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-title">Inventory Value</div>
          <div className="stat-value">{fmt(inventoryValue)}</div>
          <div className="stat-foot">{unitsInStock} units in stock, at cost</div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
            <div className="stat-label">Orders Pending Receipt</div>
            <div className="stat-value amber">{pendingOrders}</div>
            <Link href="/purchase-orders" className="link-action">
              View orders →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
