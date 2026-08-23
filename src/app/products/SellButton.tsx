"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SellButton({
  productId,
  maxQty,
  suggestedPrice,
}: {
  productId: number;
  maxQty: number;
  suggestedPrice: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(
    suggestedPrice !== undefined && suggestedPrice !== null ? String(suggestedPrice) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (maxQty <= 0) {
    return <span className="subtle">Out of stock</span>;
  }

  if (!open) {
    return (
      <button className="btn btn-xs btn-primary" onClick={() => setOpen(true)}>
        Sell
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const qty = Number(quantity);
    const price = Number(unitPrice);
    if (!qty || qty < 1) {
      setError("Enter a valid quantity");
      return;
    }
    if (qty > maxQty) {
      setError(`Only ${maxQty} in stock`);
      return;
    }
    if (!price || price <= 0) {
      setError("Enter a sale price");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId, quantity: qty, unitPrice: price }],
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not record sale");
      return;
    }
    setOpen(false);
    setQuantity("1");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="sell-inline">
      <input
        type="number"
        min={1}
        max={maxQty}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="sell-inline-input"
        aria-label="Quantity"
        placeholder="Qty"
      />
      <input
        type="number"
        min={0}
        step="0.01"
        value={unitPrice}
        onChange={(e) => setUnitPrice(e.target.value)}
        className="sell-inline-input"
        aria-label="Sale price"
        placeholder="Price"
      />
      <button disabled={saving} className="btn btn-xs btn-primary">
        {saving ? "..." : "Mark as Sold"}
      </button>
      <button
        type="button"
        className="btn btn-xs btn-ghost"
        onClick={() => {
          setOpen(false);
          setError("");
        }}
      >
        Cancel
      </button>
      {error && <div className="sell-inline-error">{error}</div>}
    </form>
  );
}
