"use client";

import { useMemo, useState } from "react";
import SellButton from "./SellButton";
import RestockButton from "./RestockButton";

export type ProductRow = {
    id: number;
    name: string;
    categoryName: string | null;
    avgCost: number;
    sellingPrice: number;
    profitPerItem: number;
    totalProfit: number;
    qty: number;
    low: boolean;
};

export default function ProductsTable({ products }: { products: ProductRow[] }) {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products;
        return products.filter(
            (p) =>
                p.name.toLowerCase().includes(q) ||
                (p.categoryName ?? "").toLowerCase().includes(q)
        );
    }, [products, search]);

    return (
        <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: 16, paddingBottom: 0 }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search inventory by product or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="table-wrap">
                <table>
                    <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price Bought</th>
                        <th>Selling Price</th>
                        <th>Est. Profit</th>
                        <th>In Stock</th>
                        <th>Status</th>
                        <th></th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={8}>
                                <div className="empty">
                                    {products.length === 0
                                        ? "No products yet. Add one above to start tracking stock."
                                        : "No products match your search."}
                                </div>
                            </td>
                        </tr>
                    )}
                    {filtered.map((p) => (
                        <tr key={p.id}>
                            <td data-label="Product">
                                <b>{p.name}</b>
                            </td>
                            <td data-label="Category" className="subtle">
                                {p.categoryName ?? "-"}
                            </td>
                            <td data-label="Price Bought" className="mono">
                                MWK {p.avgCost.toLocaleString()}
                            </td>
                            <td data-label="Selling Price" className="mono">
                                MWK {p.sellingPrice.toLocaleString()}
                            </td>
                            <td
                                data-label="Est. Profit"
                                className={`mono ${p.totalProfit >= 0 ? "text-success" : "text-danger"}`}
                            >
                                MWK {p.totalProfit.toLocaleString()}
                            </td>
                            <td data-label="In Stock" className="mono">
                                {p.qty}
                            </td>
                            <td data-label="Status">
                                {p.low ? (
                                    <span className="badge badge-low">Low Stock</span>
                                ) : (
                                    <span className="badge badge-ok">In Stock</span>
                                )}
                            </td>
                            <td data-label="" className="cell-actions">
                                <div className="row-actions">
                                    <SellButton
                                        productId={p.id}
                                        maxQty={p.qty}
                                        suggestedPrice={p.sellingPrice}
                                    />
                                    <RestockButton
                                        productId={p.id}
                                        currentCost={p.avgCost}
                                        currentSellingPrice={p.sellingPrice}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}