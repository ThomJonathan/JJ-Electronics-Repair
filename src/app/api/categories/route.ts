// import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";
//
// export async function GET() {
//   const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
//   return NextResponse.json(categories);
// }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

// POST /api/categories - create a new category
// body: { name }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name } = body as { name?: string };

  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Reuse an existing category with the same name (case-insensitive) instead
  // of erroring, since the unique constraint on `name` is case-sensitive.
  const existing = await prisma.category.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const category = await prisma.category.create({ data: { name: trimmed } });
  return NextResponse.json(category, { status: 201 });
}