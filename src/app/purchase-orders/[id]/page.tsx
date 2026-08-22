import { prisma } from "@/lib/prisma";
import ReceiveForm from "./ReceiveForm";
import PageHeader from "@/components/PageHeader";

export default async function ReceiveOrderPage({
                                                   params,
                                               }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const order = await prisma.purchaseOrder.findUniqueOrThrow({
        where: { id: Number(id) },
        select: {
            id: true,
            referenceNo: true,
            items: {
                select: {
                    id: true,
                    quantityOrdered: true,
                    quantityReceived: true,
                    product: { select: { name: true } },
                },
            },
        },
    });

    return (
        <div className="stack">
            <PageHeader
                title={`Receive Order ${order.referenceNo ? `#${order.referenceNo}` : `#${order.id}`}`}
                subtitle="Confirm what actually arrived"
            />
            <p className="subtle" style={{ marginTop: -10 }}>
                Products and quantities ordered are already filled in below — you&apos;re only entering
                what showed up.
            </p>
            <ReceiveForm order={order} />
        </div>
    );
}