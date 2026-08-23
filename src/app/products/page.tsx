import { prisma } from "@/lib/prisma";
import NewProductForm from "./NewProductForm";
import NewCategoryForm from "./NewCategoryForm";
import ProductTable, { type ProductRow } from "./ProductTable";
import PageHeader from "@/components/PageHeader";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: "asc" },
  });
  const stock = await prisma.stockMovement.groupBy({ by: ["productId"], _sum: { quantity: true } });
  const stockMap = new Map(stock.map((s) => [s.productId, s._sum.quantity ?? 0]));
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const rows: ProductRow[] = products.map((p) => {
    const qty = stockMap.get(p.id) ?? 0;
    const avgCost = Number(p.avgCost);
    const sellingPrice = Number(p.sellingPrice);
    const profitPerItem = sellingPrice - avgCost;
    return {
      id: p.id,
      name: p.name,
      categoryName: p.category?.name ?? null,
      avgCost,
      sellingPrice,
      profitPerItem,
      totalProfit: profitPerItem * qty,
      qty,
      low: qty <= p.reorderLevel,
    };
  });

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

        <ProductTable products={rows} />
      </div>
  );
}