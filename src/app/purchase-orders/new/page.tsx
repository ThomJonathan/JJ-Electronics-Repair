import { prisma } from "@/lib/prisma";
import NewOrderForm from "./NewOrderForm";
import PageHeader from "@/components/PageHeader";

export default async function NewPurchaseOrderPage() {
    const products = await prisma.product.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
    const suppliers = await prisma.supplier.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    return (
        <div className="stack">
            <PageHeader title="New Purchase Order" subtitle="Record stock you're ordering now" />
            <p className="subtle" style={{ marginTop: -10 }}>
                When it arrives, you&apos;ll confirm quantities against this same order — no retyping
                products.
            </p>
            <NewOrderForm products={products} suppliers={suppliers} />
        </div>
    );
}