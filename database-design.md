# Gadget Shop — Database Design (v1)

Engine assumed: **PostgreSQL** (works great with Next.js via Prisma/Drizzle; swap to MySQL/SQLite easily if needed).

## The core idea

Three separate concerns, kept as three separate tables so nothing gets duplicated:

1. **`products`** — the *master list* of things you sell. Entered once, ever.
2. **`purchase_orders` / `purchase_order_items`** — what you've ordered from suppliers, and how much of it has arrived so far.
3. **`sales` / `sale_items`** — what you've sold.

Stock on hand is **derived**, not typed in by hand — it's calculated from "received" minus "sold" (plus adjustments). This is the key to not repeating work: you never manually update a "quantity in stock" number, the system does it from the events (purchase, sale, adjustment).

---

## 1. Product catalog

```sql
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL  -- 'Smartphone', 'Battery', 'Screen Protector', 'LCD', 'Charger', 'Cable', 'Board', 'Monitor', 'Laptop', 'Keyboard', 'Casing', 'Keypad Phone'
);

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(30) UNIQUE,          -- your own code, e.g. SP-IP13-001
    name            VARCHAR(150) NOT NULL,       -- 'iPhone 13 Screen Protector'
    category_id     INTEGER REFERENCES categories(id),
    brand           VARCHAR(50),                 -- optional: Samsung, Tecno, generic...
    description     TEXT,
    reorder_level   INTEGER DEFAULT 5,           -- flag "low stock" when below this
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

A product is created **once**. Everything else (orders, receiving, sales) just references `product_id` — this is what stops you from re-entering things.

---

## 2. Purchasing (what you've ordered)

```sql
CREATE TABLE suppliers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    phone       VARCHAR(30),
    notes       TEXT
);

CREATE TABLE purchase_orders (
    id              SERIAL PRIMARY KEY,
    supplier_id     INTEGER REFERENCES suppliers(id),
    reference_no    VARCHAR(30),                 -- your own PO number, optional
    order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date   DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
                    -- 'pending' | 'partially_received' | 'received' | 'cancelled'
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id                  SERIAL PRIMARY KEY,
    purchase_order_id   INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id          INTEGER REFERENCES products(id),
    quantity_ordered    INTEGER NOT NULL,
    quantity_received   INTEGER NOT NULL DEFAULT 0,   -- fills in as goods arrive
    unit_cost           NUMERIC(12,2) NOT NULL         -- cost price per unit
);
```

**This is your "planned / on order" list.** A row here with `quantity_received < quantity_ordered` is what shows up in your "what I have planned to have" view.

---

## 3. Receiving goods (the "don't repeat work" part)

You do **not** create a new entry when goods arrive. You open the *existing* purchase order and record receipt against its line items:

```sql
CREATE TABLE goods_received_notes (
    id                  SERIAL PRIMARY KEY,
    purchase_order_id   INTEGER REFERENCES purchase_orders(id),
    received_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by         VARCHAR(50)
);

CREATE TABLE goods_received_items (
    id          SERIAL PRIMARY KEY,
    grn_id      INTEGER REFERENCES goods_received_notes(id) ON DELETE CASCADE,
    po_item_id  INTEGER REFERENCES purchase_order_items(id),
    quantity    INTEGER NOT NULL     -- how many actually arrived (may be less than ordered)
);
```

**Workflow when a delivery arrives:**

1. You open the pending PO (search by supplier or reference number — you already typed the products in when you *placed* the order).
2. For each line item, you enter the quantity that actually arrived (defaults to the ordered quantity, you just confirm or adjust).
3. The system:
   - Inserts a `goods_received_items` row
   - Increments `purchase_order_items.quantity_received`
   - Adds a `stock_movements` row (below) of type `purchase` — this is what increases your stock
   - Updates the PO's `status` to `received` (if fully received) or `partially_received`

You never re-type product names, categories, or costs — you're just confirming quantities against what's already on file.

---

## 4. Stock (derived, via a movement ledger)

```sql
CREATE TABLE stock_movements (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER REFERENCES products(id),
    movement_type   VARCHAR(20) NOT NULL,   -- 'purchase' | 'sale' | 'adjustment'
    quantity        INTEGER NOT NULL,       -- positive for purchase/adjustment-in, negative for sale/adjustment-out
    reference_type  VARCHAR(20),            -- 'purchase_order_item' | 'sale_item' | 'manual'
    reference_id    INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

Current stock for a product is simply:

```sql
SELECT product_id, SUM(quantity) AS quantity_on_hand
FROM stock_movements
GROUP BY product_id;
```

A ledger like this (rather than a single "quantity" column you edit directly) means you always have a full audit trail — you can answer "where did this stock come from / go" months later, and it's self-correcting: nothing gets out of sync because every change to stock happens through purchase or sale events, not manual edits.

*(For performance at scale you'd later add a cached `inventory` table that's updated by triggers — not needed at your volume yet.)*

---

## 5. Sales

```sql
CREATE TABLE sales (
    id              SERIAL PRIMARY KEY,
    sale_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name   VARCHAR(100),           -- optional
    total_amount    NUMERIC(12,2) NOT NULL,
    total_cost      NUMERIC(12,2) NOT NULL,
    total_profit    NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - total_cost) STORED,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sale_items (
    id              SERIAL PRIMARY KEY,
    sale_id         INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products(id),
    quantity        INTEGER NOT NULL,
    unit_price      NUMERIC(12,2) NOT NULL,      -- what you sold it for
    unit_cost       NUMERIC(12,2) NOT NULL,      -- pulled from the batch it came from (see note)
    subtotal        NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    profit          NUMERIC(12,2) GENERATED ALWAYS AS (quantity * (unit_price - unit_cost)) STORED
);
```

> **Note on cost price:** if you buy the same product at different costs over time (e.g. batteries at MWK 3,000 one order, MWK 3,200 the next), the simplest approach for v1 is to use a **weighted-average cost** per product, recalculated each time stock is received:
> `new_avg_cost = ((old_qty * old_avg_cost) + (received_qty * new_unit_cost)) / (old_qty + received_qty)`
> Store this on `products.avg_cost` and use it as `unit_cost` at sale time. You can move to FIFO batch tracking later if you need more precision — not necessary to start.

Selling an item:
1. Insert `sales` + `sale_items` (using current `avg_cost` as `unit_cost`)
2. Insert a `stock_movements` row (type `sale`, negative quantity) — this is what reduces stock

---

## 6. Reports — just queries against what you already have

**Today's sales:**
```sql
SELECT SUM(total_amount) AS revenue, SUM(total_profit) AS profit
FROM sales WHERE sale_date = CURRENT_DATE;
```

**Weekly / monthly / yearly** — same query, just change the `WHERE`:
```sql
WHERE sale_date >= date_trunc('week', CURRENT_DATE)
WHERE sale_date >= date_trunc('month', CURRENT_DATE)
WHERE sale_date >= date_trunc('year', CURRENT_DATE)
```

**Current stock levels (with low-stock flag):**
```sql
SELECT p.name, COALESCE(SUM(sm.quantity), 0) AS qty_on_hand, p.reorder_level
FROM products p
LEFT JOIN stock_movements sm ON sm.product_id = p.id
GROUP BY p.id
HAVING COALESCE(SUM(sm.quantity), 0) <= p.reorder_level;
```

**Items still on order (not fully received):**
```sql
SELECT po.id, p.name, poi.quantity_ordered, poi.quantity_received,
       (poi.quantity_ordered - poi.quantity_received) AS still_pending
FROM purchase_order_items poi
JOIN purchase_orders po ON po.id = poi.purchase_order_id
JOIN products p ON p.id = poi.product_id
WHERE po.status IN ('pending', 'partially_received');
```

**Best sellers this month:**
```sql
SELECT p.name, SUM(si.quantity) AS units_sold, SUM(si.profit) AS profit
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN products p ON p.id = si.product_id
WHERE s.sale_date >= date_trunc('month', CURRENT_DATE)
GROUP BY p.id
ORDER BY units_sold DESC;
```

---

## Entity relationship summary

```
categories ──< products >── stock_movements
                 │
                 ├──< purchase_order_items >── purchase_orders >── suppliers
                 │            │
                 │            └──< goods_received_items >── goods_received_notes
                 │
                 └──< sale_items >── sales
```

---

## Suggested next steps

1. Confirm this schema covers what you need (anything to add — e.g. multiple shop locations, staff/user accounts, discounts?)
2. Pick the stack — I'd suggest **Next.js + PostgreSQL (Prisma ORM)** since that matches your Nsatitsi setup, but plain Node/Express or something lighter works too if you'd rather keep it minimal.
3. Build the product catalog + purchase order screens first (data entry foundation)
4. Then the "receive order" screen (the workflow above)
5. Then the point-of-sale screen for daily sales
6. Reports come almost free once the data is flowing in, since they're just queries

Let me know which stack you want and I'll scaffold the actual project next.
