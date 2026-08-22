import { prisma } from "@/lib/prisma";
import NewProductForm from "./NewProductForm";
import NewCategoryForm from "./NewCategoryForm";
import SellButton from "./SellButton";
import PageHeader from "@/components/PageHeader";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const stock = await prisma.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } });
  const stockMap = new Map(stock.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="stack">
      <PageHeader title="Inventory" subtitle="Everything currently in stock" />

      <div className="toolbar">
        <div className="subtle">{categories.length} categor{categories.length === 1 ? "y" : "ies"}</div>
        <div className="stack-h new-product-form-container" style={{ gap: 8 }}>
          <NewProductForm categories={categories} />
          <NewCategoryForm />
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Avg Cost</th>
                <th>In Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">No products yet. Add one above to start tracking stock.</div>
                  </td>
                </tr>
              )}
              {products.map((p) => {
                const qty = stockMap.get(p.id) ?? 0;
                const low = qty <= p.reorderLevel;
                return (
                  <tr key={p.id}>
                    <td data-label="Product">
                      <b>{p.name}</b>
                    </td>
                    <td data-label="Category" className="subtle">
                      {p.category?.name ?? "-"}
                    </td>
                    <td data-label="Avg Cost" className="mono">
                      MWK {Number(p.avgCost).toLocaleString()}
                    </td>
                    <td data-label="In Stock" className="mono">
                      {qty}
                    </td>
                    <td data-label="Status">
                      {low ? (
                        <span className="badge badge-low">Low Stock</span>
                      ) : (
                        <span className="badge badge-ok">In Stock</span>
                      )}
                    </td>
                    <td data-label="" className="cell-actions">
                      <SellButton productId={p.id} maxQty={qty} suggestedPrice={0} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
