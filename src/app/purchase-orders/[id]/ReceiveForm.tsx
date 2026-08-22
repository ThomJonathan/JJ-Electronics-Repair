"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: number;
  quantityOrdered: number;
  quantityReceived: number;
  product: { name: string };
};
type Order = { id: number; items: Item[] };

export default function ReceiveForm({ order }: { order: Order }) {
  const router = useRouter();
  const outstanding = order.items.filter((i) => i.quantityReceived < i.quantityOrdered);

  const [quantities, setQuantities] = useState<Record<number, string>>(
    Object.fromEntries(
      outstanding.map((i) => [i.id, String(i.quantityOrdered - i.quantityReceived)])
    )
  );
  const [saving, setSaving] = useState(false);

  if (outstanding.length === 0) {
    return (
      <div className="card">
        <span className="badge badge-ok">Fully Received</span>
        <p className="subtle" style={{ marginTop: 10 }}>
          This order has already been fully received.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/purchase-orders/${order.id}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: outstanding
          .map((i) => ({ poItemId: i.id, quantity: Number(quantities[i.id] || 0) }))
          .filter((i) => i.quantity > 0),
      }),
    });
    setSaving(false);
    router.push("/purchase-orders");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: 0 }}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Ordered</th>
              <th>Already Received</th>
              <th>Receiving Now</th>
            </tr>
          </thead>
          <tbody>
            {outstanding.map((item) => (
              <tr key={item.id}>
                <td data-label="Product">
                  <b>{item.product.name}</b>
                </td>
                <td data-label="Ordered" className="mono">
                  {item.quantityOrdered}
                </td>
                <td data-label="Already Received" className="mono">
                  {item.quantityReceived}
                </td>
                <td data-label="Receiving Now">
                  <input
                    type="number"
                    min={0}
                    max={item.quantityOrdered - item.quantityReceived}
                    value={quantities[item.id] ?? ""}
                    onChange={(e) =>
                      setQuantities({ ...quantities, [item.id]: e.target.value })
                    }
                    style={{
                      width: 90,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      padding: "8px 10px",
                      borderRadius: 7,
                      fontFamily: "inherit",
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="form-actions" style={{ padding: 16 }}>
        <button disabled={saving} className="btn btn-primary">
          {saving ? "Saving..." : "Confirm Receipt"}
        </button>
      </div>
    </form>
  );
}
