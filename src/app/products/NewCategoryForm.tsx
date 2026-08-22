"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add category");
      }

      setName("");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Add Category
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="section-title">Add Category</div>
      <div className="field">
        <label>Category Name</label>
        <input
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Accessories, Components, etc."
        />
        {error && <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>{error}</div>}
      </div>
      <div className="form-actions">
        <button disabled={saving} className="btn btn-primary">
          {saving ? "Saving..." : "Add Category"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => {
          setOpen(false);
          setError("");
          setName("");
        }}>
          Cancel
        </button>
      </div>
    </form>
  );
}
