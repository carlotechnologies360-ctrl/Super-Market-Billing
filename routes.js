import express from 'express';
import pool from './db.js';

const router = express.Router();

// --- SETTINGS ---
router.get('/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM store_settings LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/settings', async (req, res) => {
    const { name, address, contact, taxEnabled, taxRate, modules } = req.body;
    try {
        // Upsert logic
        const existing = await pool.query('SELECT id FROM store_settings LIMIT 1');
        if (existing.rows.length > 0) {
            await pool.query(
                'UPDATE store_settings SET name=$1, address=$2, contact=$3, tax_enabled=$4, tax_rate=$5, modules=$6 WHERE id=$7',
                [name, address, contact, taxEnabled, taxRate, modules, existing.rows[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO store_settings (name, address, contact, tax_enabled, tax_rate, modules) VALUES ($1, $2, $3, $4, $5, $6)',
                [name, address, contact, taxEnabled, taxRate, modules]
            );
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PRODUCTS ---
router.get('/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM products');

        // Fetch all variants efficiently
        const variantsRes = await pool.query('SELECT * FROM product_variants');
        const variantsMap = {};
        variantsRes.rows.forEach(v => {
            if (!variantsMap[v.product_id]) variantsMap[v.product_id] = [];
            variantsMap[v.product_id].push({
                name: v.name,
                price: parseFloat(v.price),
                actualPrice: parseFloat(v.actual_price),
                barcode: v.barcode,
                stock: v.stock
            });
        });

        const products = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
            actualPrice: parseFloat(row.actual_price),
            price: parseFloat(row.price),
            costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
            expiryDate: row.expiry_date,
            stock: row.stock,
            unit: row.unit,
            sizeName: row.size_name,
            imageUrl: row.image_url,
            barcode: row.barcode,
            variants: variantsMap[row.id] || []
        }));
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/products', async (req, res) => {
    let { id, name, category, actualPrice, price, stock, unit, sizeName, imageUrl, barcode, costPrice, expiryDate, variants } = req.body;

    // Auto-generate ID if missing
    if (!id) {
        id = randomUUID();
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Upsert Product
        await client.query(
            `INSERT INTO products (id, name, category, actual_price, price, stock, unit, size_name, image_url, barcode, cost_price, expiry_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
             name=$2, category=$3, actual_price=$4, price=$5, stock=$6, unit=$7, size_name=$8, image_url=$9, barcode=$10, cost_price=$11, expiry_date=$12`,
            [id, name, category, actualPrice, price, stock, unit, sizeName, imageUrl, barcode, costPrice, expiryDate]
        );

        // Handle Variants: Only update variants if the array is provided. 
        // If variants is undefined/null, do NOT wipe existing variants (safety check).
        if (variants && Array.isArray(variants)) {
            // Delete existing variants first (full replace strategy for the list)
            await client.query('DELETE FROM product_variants WHERE product_id = $1', [id]);

            for (const v of variants) {
                // Generate a simple ID for the variant
                const vId = id + '_' + Math.random().toString(36).substr(2, 9);
                await client.query(
                    `INSERT INTO product_variants (id, product_id, name, price, actual_price, barcode, stock)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [vId, id, v.name, v.price, v.actualPrice, v.barcode, v.stock]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, id }); // Return the ID so frontend can update if needed
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SALES ---
router.get('/sales', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sales ORDER BY date DESC');
        const sales = await Promise.all(result.rows.map(async (sale) => {
            const itemsRes = await pool.query('SELECT * FROM sale_items WHERE sale_id = $1', [sale.id]);
            return {
                id: sale.id,
                date: sale.date,
                customerName: sale.customer_name,
                customerMobile: sale.customer_mobile,
                totalAmount: parseFloat(sale.total_amount),
                items: itemsRes.rows.map(item => ({
                    ...item,
                    cartQuantity: item.quantity,
                })),
                paymentMethod: sale.payment_method
            };
        }));
        res.json(sales);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sales', async (req, res) => {
    let { id, date, customerName, customerMobile, totalAmount, paymentMethod, items } = req.body;
    if (!id) id = randomUUID();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'INSERT INTO sales (id, date, customer_name, customer_mobile, total_amount, payment_method) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, date, customerName, customerMobile, totalAmount, paymentMethod]
        );

        for (const item of items) {
            await client.query(
                'INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [id, item.id, item.cartQuantity, item.price]
            );
            // Update stock
            await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.cartQuantity, item.id]);
        }

        await client.query('COMMIT');
        res.json({ success: true, id });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// --- CUSTOMERS ---
router.get('/customers/:mobile', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers WHERE mobile = $1', [req.params.mobile]);
        if (result.rows.length === 0) return res.json(null);
        const c = result.rows[0];
        res.json({ mobile: c.mobile, name: c.name, lastVisit: c.last_visit });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/customers', async (req, res) => {
    const { mobile, name, lastVisit } = req.body;
    try {
        await pool.query(
            `INSERT INTO customers (mobile, name, last_visit) VALUES ($1, $2, $3)
       ON CONFLICT (mobile) DO UPDATE SET name=$2, last_visit=$3`,
            [mobile, name, lastVisit]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- STAFF ---
router.get('/staff', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM staff');
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            mobile: row.mobile,
            roleId: row.role_id,
            status: row.status
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/staff', async (req, res) => {
    let { id, name, mobile, roleId, joiningDate, salaryType, baseSalary, status, pin } = req.body;
    if (!id) id = randomUUID();
    try {
        await pool.query(
            `INSERT INTO staff (id, name, mobile, role_id, joining_date, salary_type, base_salary, status, pin)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
       name=$2, mobile=$3, role_id=$4, status=$8, pin=$9`,
            [id, name, mobile, roleId, joiningDate, salaryType, baseSalary, status, pin]
        );
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/staff/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM staff WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROLES ---
router.get('/roles', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roles');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/roles/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM roles WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SUPPLIERS ---
router.get('/suppliers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM suppliers');
        res.json(result.rows.map(row => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            address: row.address,
            productsSupplied: row.products_supplied
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/suppliers', async (req, res) => {
    let { id, name, phone, address, productsSupplied } = req.body;
    if (!id) id = randomUUID();
    try {
        await pool.query(
            `INSERT INTO suppliers (id, name, phone, address, products_supplied)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
             name=$2, phone=$3, address=$4, products_supplied=$5`,
            [id, name, phone, address, JSON.stringify(productsSupplied)]
        );
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/suppliers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PURCHASES ---
router.get('/purchases', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM purchases ORDER BY date DESC');
        res.json(result.rows.map(row => ({
            id: row.id,
            date: row.date,
            supplierId: row.supplier_id,
            productName: row.product_name,
            quantity: row.quantity,
            unitPrice: parseFloat(row.unit_price),
            totalAmount: parseFloat(row.total_amount)
        })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/purchases', async (req, res) => {
    let { id, date, supplierId, productName, quantity, unitPrice, totalAmount } = req.body;
    if (!id) id = randomUUID();
    try {
        await pool.query(
            `INSERT INTO purchases (id, date, supplier_id, product_name, quantity, unit_price, total_amount)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
             date=$2, supplier_id=$3, product_name=$4, quantity=$5, unit_price=$6, total_amount=$7`,
            [id, date, supplierId, productName, quantity, unitPrice, totalAmount]
        );
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/purchases/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM purchases WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
