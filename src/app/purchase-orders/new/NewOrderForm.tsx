"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Product = { id: number; name: string };
type Supplier = { id: number; name: string };
type Line = { productId: string; quantityOrdered: string; unitCost: string };

export default function NewOrderForm({
  products,
  suppliers,
}: {
  products: Product[];
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { productId: "", quantityOrdered: "", unitCost: "" },
  ]);
  const [saving, setSaving] = useState(false);

  function updateLine(i: number, field: keyof Line, value: string) {
    const copy = [...lines];
    copy[i][field] = value;
    setLines(copy);
  }

  function addLine() {
    setLines([...lines, { productId: "", quantityOrdered: "", unitCost: "" }]);
  }

  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: supplierId || undefined,
        referenceNo,
        items: lines
          .filter((l) => l.productId && l.quantityOrdered)
          .map((l) => ({
            productId: Number(l.productId),
            quantityOrdered: Number(l.quantityOrdered),
            unitCost: Number(l.unitCost || 0),
          })),
      }),
    });
    setSaving(false);
    router.push("/purchase-orders");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="field-row">
        <div className="field">
          <label>Supplier</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">-</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Reference No.</label>
          <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 6 }}>
        Items
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
            <label>Qty Ordered</label>
            <input
              required
              type="number"
              value={line.quantityOrdered}
              onChange={(e) => updateLine(i, "quantityOrdered", e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Unit Cost</label>
            <input
              type="number"
              value={line.unitCost}
              onChange={(e) => updateLine(i, "unitCost", e.target.value)}
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
          {saving ? "Saving..." : "Place Order"}
        </button>
      </div>
    </form>
  );
}
