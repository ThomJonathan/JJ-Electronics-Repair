"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: number; name: string };

const NEW_CATEGORY_VALUE = "__new__";

export default function NewProductForm({ categories }: { categories: Category[] }) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [categoryList, setCategoryList] = useState<Category[]>(categories);
    const [categoryId, setCategoryId] = useState("");
    const [reorderLevel, setReorderLevel] = useState("5");
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);
    const [categoryError, setCategoryError] = useState("");

    function handleCategorySelect(value: string) {
        if (value === NEW_CATEGORY_VALUE) {
            setAddingCategory(true);
            setCategoryError("");
            return;
        }
        setCategoryId(value);
    }

    async function handleAddCategory() {
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            setCategoryError("Enter a category name");
            return;
        }
        setSavingCategory(true);
        setCategoryError("");
        try {
            const res = await fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: trimmed }),
            });
            if (!res.ok) {
                setCategoryError("Could not add category");
                return;
            }
            const created: Category = await res.json();
            setCategoryList((prev) => {
                if (prev.some((c) => c.id === created.id)) return prev;
                return [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
            });
            setCategoryId(String(created.id));
            setNewCategoryName("");
            setAddingCategory(false);
        } finally {
            setSavingCategory(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, categoryId: categoryId || undefined, reorderLevel }),
        });
        setSaving(false);
        setName("");
        setOpen(false);
        router.refresh();
    }

    if (!open) {
        return (
            <div className="toolbar">
                <div className="subtle">
                    {categoryList.length} categor{categoryList.length === 1 ? "y" : "ies"}
                </div>
                <button className="btn btn-primary" onClick={() => setOpen(true)}>
                    + Add Product
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="card">
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
                    {!addingCategory ? (
                        <select value={categoryId} onChange={(e) => handleCategorySelect(e.target.value)}>
                            <option value="">-</option>
                            {categoryList.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                            <option value={NEW_CATEGORY_VALUE}>+ New category…</option>
                        </select>
                    ) : (
                        <div>
                            <div style={{ display: "flex", gap: 6 }}>
                                <input
                                    autoFocus
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g. Power Bank"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddCategory();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    disabled={savingCategory}
                                    onClick={handleAddCategory}
                                >
                                    {savingCategory ? "..." : "Add"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-ghost"
                                    onClick={() => {
                                        setAddingCategory(false);
                                        setNewCategoryName("");
                                        setCategoryError("");
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                            {categoryError && (
                                <div style={{ color: "var(--danger)", fontSize: 11, marginTop: 4 }}>
                                    {categoryError}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="field">
                    <label>Low Stock Alert Level</label>
                    <input
                        type="number"
                        value={reorderLevel}
                        onChange={(e) => setReorderLevel(e.target.value)}
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