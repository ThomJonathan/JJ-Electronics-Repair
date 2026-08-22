# Gadget Shop Tracker

Simple inventory + sales tracking system: products, purchase orders (what you've
ordered), receiving (updates stock without re-entering items), daily/weekly/
monthly/yearly sales & profit reports.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL.** Easiest free options: [Neon](https://neon.tech) or
   [Supabase](https://supabase.com) (both have a free tier and give you a
   connection string in ~1 minute). Or run Postgres locally.

3. **Set your database URL** — edit `.env` and paste your connection string:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/gadget_shop"
   ```

4. **Generate the Prisma client and create the tables:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

5. **Seed your product categories** (Smartphone, Battery, Screen Protector, etc.):
   ```bash
   npx tsx prisma/seed.ts
   ```
   (If `tsx` isn't installed: `npm install -D tsx` first.)

6. **Run it:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## How the workflow maps to your process

- **Products** — enter each item you sell *once* (name, category, reorder level).
- **Purchase Orders → New order** — when you place an order with a supplier,
  record the products and quantities here. This is your "what I have planned
  to have" list.
- **Purchase Orders → Receive** — when the delivery arrives, open that same
  order and just confirm how much of each item showed up. You never retype
  the product — the system updates stock and average cost automatically.
- **Sales → Record sale** — pick the product(s) sold and the price. Cost and
  profit are calculated automatically from the product's current average cost.
- **Dashboard (home page)** — today / week / month / year revenue and profit,
  low-stock alerts, and orders still awaiting delivery.

## Notes

- Currency is shown as MWK — change the `Card`/table components in
  `src/app/page.tsx`, `products/page.tsx`, and `sales/page.tsx` if you'd
  rather show something else.
- Cost tracking uses a weighted-average cost per product (see
  `database-design.md` for why), recalculated each time stock is received.
- This is a single-user app — no login is wired up. Add one later (e.g.
  NextAuth) if you ever bring on staff.
