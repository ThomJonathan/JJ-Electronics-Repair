"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string };

export default function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [reorderLevel, setReorderLevel] = useState("5");
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        categoryId: categoryId || undefined,
        reorderLevel,
        initialQuantity,
        buyingPrice,
        sellingPrice,
      }),
    });
    setSaving(false);
    setName("");
    setInitialQuantity("0");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Add Product
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card new-product-form-card">
      <div className="section-title">Add Product</div>
      <div className="field">
        <label>Product Name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Samsung A14 Screen Protector"
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">-</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Low Stock Alert Level</label>
          <input
            type="number"
            value={reorderLevel}
            onChange={(e) => setReorderLevel(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Initial Quantity</label>
          <input
            type="number"
            value={initialQuantity}
            onChange={(e) => setInitialQuantity(e.target.value)}
          />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Buying Price (MWK)</label>
          <input
            type="number"
            step="0.01"
            value={buyingPrice}
            onChange={(e) => setBuyingPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="field">
          <label>Selling Price (MWK)</label>
          <input
            type="number"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="form-actions">
        <button disabled={saving} className="btn btn-primary">
          {saving ? "Saving..." : "Add Product"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
