import { prisma } from "@/lib/prisma";
import NewSaleForm from "./NewSaleForm";
import PageHeader from "@/components/PageHeader";

export default async function SalesPage() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { saleDate: { gte: today } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
      <div className="stack">
        <PageHeader title="Sales" subtitle="Record and review today's sales" />

        <NewSaleForm products={products} />

        <div className="card" style={{ padding: 0 }}>
          <div className="section-title" style={{ padding: "16px 16px 0" }}>
            Today&apos;s Sales <span className="tag">{sales.length} sale{sales.length === 1 ? "" : "s"}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
              <tr>
                <th>Time</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Profit</th>
              </tr>
              </thead>
              <tbody>
              {sales.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty">No sales recorded yet today.</div>
                    </td>
                  </tr>
              )}
              {sales.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Time" className="subtle">
                      {new Date(s.createdAt).toLocaleTimeString()}
                    </td>
                    <td data-label="Items">
                      {s.items.map((i) => `${i.product.name} x${i.quantity}`).join(", ")}
                    </td>
                    <td data-label="Amount" className="mono">
                      MWK {Number(s.totalAmount).toLocaleString()}
                    </td>
                    <td data-label="Profit" className="mono" style={{ color: "var(--success)" }}>
                      MWK {(Number(s.totalAmount) - Number(s.totalCost)).toLocaleString()}
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}