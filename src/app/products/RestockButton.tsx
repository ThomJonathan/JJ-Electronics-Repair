"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RestockButton({
                                          productId,
                                          currentCost,
                                          currentSellingPrice,
                                      }: {
    productId: number;
    currentCost: number;
    currentSellingPrice: number;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [quantity, setQuantity] = useState("");
    const [unitCost, setUnitCost] = useState(currentCost ? String(currentCost) : "");
    const [sellingPrice, setSellingPrice] = useState(
        currentSellingPrice ? String(currentSellingPrice) : ""
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    if (!open) {
        return (
            <button className="btn btn-xs btn-amber" onClick={() => setOpen(true)}>
                Restock
            </button>
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        const qty = Number(quantity);
        const cost = Number(unitCost);
        if (!qty || qty < 1) {
            setError("Enter a valid quantity");
            return;
        }
        if (unitCost === "" || cost < 0) {
            setError("Enter the bought price");
            return;
        }
        setSaving(true);
        const res = await fetch(`/api/products/${productId}/restock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                quantity: qty,
                unitCost: cost,
                sellingPrice: sellingPrice !== "" ? Number(sellingPrice) : undefined,
            }),
        });
        setSaving(false);
        if (!res.ok) {
            setError("Could not update inventory");
            return;
        }
        setOpen(false);
        setQuantity("");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="sell-inline">
            <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="sell-inline-input"
                aria-label="Quantity bought"
                placeholder="Qty"
            />
            <input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="sell-inline-input"
                aria-label="Bought price"
                placeholder="Bought"
            />
            <input
                type="number"
                min={0}
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="sell-inline-input"
                aria-label="Sell price"
                placeholder="Sell at"
            />
            <button disabled={saving} className="btn btn-xs btn-amber">
                {saving ? "..." : "Update Inventory"}
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