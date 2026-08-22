import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

export default async function PurchaseOrdersPage() {
  const orders = await prisma.purchaseOrder.findMany({
    include: { supplier: true, items: true },
    orderBy: { orderDate: "desc" },
  });

  const badgeClass: Record<string, string> = {
    pending: "badge-pending",
    partially_received: "badge-pending",
    received: "badge-ok",
    cancelled: "badge-muted",
  };

  const pendingCount = orders.filter((o) => o.status !== "received" && o.status !== "cancelled").length;

  return (
    <div className="stack">
      <PageHeader
        title="Purchase Orders"
        subtitle="Stock you have ordered but not yet received"
        action={
          <Link href="/purchase-orders/new" className="btn btn-primary">
            + New Order
          </Link>
        }
      />

      <div className="subtle" style={{ marginTop: -8 }}>
        {pendingCount} pending order{pendingCount === 1 ? "" : "s"}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Reference</th>
                <th>Items</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      No orders yet. Log stock you&apos;ve ordered so you can track what&apos;s coming.
                    </div>
                  </td>
                </tr>
              )}
              {orders.map((o) => (
                <tr key={o.id}>
                  <td data-label="Date" className="subtle">
                    {new Date(o.orderDate).toLocaleDateString()}
                  </td>
                  <td data-label="Supplier">
                    <b>{o.supplier?.name ?? "-"}</b>
                  </td>
                  <td data-label="Reference" className="subtle">
                    {o.referenceNo ?? "-"}
                  </td>
                  <td data-label="Items" className="mono">
                    {o.items.length}
                  </td>
                  <td data-label="Status">
                    <span className={`badge ${badgeClass[o.status] ?? "badge-muted"}`}>
                      {o.status.replace("_", " ")}
                    </span>
                  </td>
                  <td data-label="" className="cell-actions">
                    {o.status !== "received" && (
                      <div className="row-actions">
                        <Link href={`/purchase-orders/${o.id}`} className="btn btn-sm btn-primary">
                          Receive
                        </Link>
                      </div>
                    )}
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
