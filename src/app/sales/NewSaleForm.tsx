"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: number; name: string };
type Line = { productId: string; quantity: string; unitPrice: string };

export default function NewSaleForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);

  function updateLine(i: number, field: keyof Line, value: string) {
    const copy = [...lines];
    copy[i][field] = value;
    setLines(copy);
  }

  function addLine() {
    setLines([...lines, { productId: "", quantity: "1", unitPrice: "" }]);
  }

  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName: customerName || undefined,
        items: lines
          .filter((l) => l.productId && l.quantity && l.unitPrice)
          .map((l) => ({
            productId: Number(l.productId),
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
      }),
    });
    setSaving(false);
    setCustomerName("");
    setLines([{ productId: "", quantity: "1", unitPrice: "" }]);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="section-title">Record Sale</div>
      <div className="field">
        <label>Customer (optional)</label>
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      </div>

      {lines.map((line, i) => (
        <div key={i} className="line-item">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Product</label>
            <select
              required
              value={line.productId}
              onChange={(e) => updateLine(i, "productId", e.target.value)}
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Qty</label>
            <input
              required
              type="number"
              value={line.quantity}
              onChange={(e) => updateLine(i, "quantity", e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Sold At</label>
            <input
              required
              type="number"
              value={line.unitPrice}
              onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
            />
          </div>
          {lines.length > 1 && (
            <button
              type="button"
              onClick={() => removeLine(i)}
              className="btn btn-sm btn-danger"
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <button type="button" onClick={addLine} className="link-action">
        + add another item
      </button>

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button disabled={saving} className="btn btn-primary">
          {saving ? "Saving..." : "Record Sale"}
        </button>
      </div>
    </form>
  );
}
