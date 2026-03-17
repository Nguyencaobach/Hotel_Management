import pool from '../config/db.js';

// ==================================================
// PHẦN 1: QUẢN LÝ SẢN PHẨM GỐC (MASTER)
// ==================================================

// Hàm tự động quét và khóa các lô hàng đã qua ngày hết hạn
export const autoLockExpiredBatches = async () => {
    await pool.query(`
        UPDATE product_batches 
        SET status = 'LOCKED' 
        WHERE exp_date < CURRENT_DATE AND status = 'ACTIVE'
    `);
};

// Lấy danh sách sản phẩm + Tự động tính TỔNG số lượng từ các lô hàng (Batches)
export const getAllProducts = async () => {
    await autoLockExpiredBatches(); // Chạy quét tự động trước khi lấy dữ liệu
    const query = `
        SELECT 
            p.product_id, p.sku, p.name, p.unit, p.retail_price,
            c.name as category_name, c.category_id,
            COALESCE(SUM(CASE WHEN b.status = 'ACTIVE' THEN b.quantity ELSE 0 END), 0) as total_quantity
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.category_id
        LEFT JOIN product_batches b ON p.product_id = b.product_id
        GROUP BY p.product_id, c.name, c.category_id
        ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

export const getProductById = async (product_id) => {
    const result = await pool.query(`SELECT * FROM products WHERE product_id = $1`, [product_id]);
    return result.rows[0];
};

export const getProductBySku = async (sku) => {
    const result = await pool.query(`SELECT * FROM products WHERE sku = $1`, [sku]);
    return result.rows[0];
};

export const createProduct = async ({ category_id, sku, name, unit, retail_price }) => {
    const result = await pool.query(
        `INSERT INTO products (category_id, sku, name, unit, retail_price)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [category_id || null, sku, name, unit, retail_price || 0]
    );
    return result.rows[0];
};

export const updateProduct = async (product_id, { category_id, sku, name, unit, retail_price }) => {
    const result = await pool.query(
        `UPDATE products
         SET category_id = $1, sku = $2, name = $3, unit = $4, retail_price = $5
         WHERE product_id = $6
         RETURNING *`,
        [category_id || null, sku, name, unit, retail_price || 0, product_id]
    );
    return result.rows[0];
};

export const deleteProduct = async (product_id) => {
    const result = await pool.query(`DELETE FROM products WHERE product_id = $1 RETURNING product_id`, [product_id]);
    return result.rows[0];
};


// ==================================================
// PHẦN 2: QUẢN LÝ LÔ HÀNG (DETAIL / BATCHES)
// ==================================================

// Lấy danh sách đợt nhập của 1 sản phẩm cụ thể (Sắp xếp theo Hạn sử dụng tăng dần - FEFO)
export const getBatchesByProductId = async (product_id) => {
    await autoLockExpiredBatches(); // Quét cập nhật trạng thái
    const result = await pool.query(
        `SELECT * FROM product_batches 
         WHERE product_id = $1 
         ORDER BY exp_date ASC NULLS LAST, created_at DESC`,
        [product_id]
    );
    return result.rows;
};

export const getBatchById = async (batch_id) => {
    const result = await pool.query(`SELECT * FROM product_batches WHERE batch_id = $1`, [batch_id]);
    return result.rows[0];
};

export const createBatch = async ({ product_id, batch_code, quantity, import_price, mfg_date, exp_date, import_date, supplier }) => {
    const result = await pool.query(
        `INSERT INTO product_batches (product_id, batch_code, quantity, import_price, mfg_date, exp_date, import_date, supplier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [product_id, batch_code || null, quantity || 0, import_price || 0, mfg_date || null, exp_date || null, import_date || null, supplier || null]
    );
    return result.rows[0];
};

export const updateBatch = async (batch_id, { batch_code, quantity, import_price, mfg_date, exp_date, import_date, supplier, status }) => {
    // Nếu bạn gia hạn date lớn hơn hiện tại, tự động chuyển về ACTIVE nếu không truyền status
    const result = await pool.query(
        `UPDATE product_batches
         SET batch_code = $1, quantity = $2, import_price = $3, mfg_date = $4, exp_date = $5, 
             import_date = $6, supplier = $7, status = COALESCE($8, status)
         WHERE batch_id = $9
         RETURNING *`,
        [batch_code || null, quantity, import_price, mfg_date || null, exp_date || null, import_date || null, supplier || null, status || null, batch_id]
    );
    return result.rows[0];
};

export const deleteBatch = async (batch_id) => {
    const result = await pool.query(`DELETE FROM product_batches WHERE batch_id = $1 RETURNING batch_id`, [batch_id]);
    return result.rows[0];
};

// ==================================================
// PHẦN 3: API CHO LỄ TÂN (BÁN HÀNG / THÊM VÀO PHÒNG)
// ==================================================

// Lấy danh sách danh mục sản phẩm
export const getAllCategories = async () => {
    const result = await pool.query(`SELECT * FROM product_categories ORDER BY name ASC`);
    return result.rows;
};

// Lấy sản phẩm đang có sẵn trong kho (Số lượng > 0 và Hạn sử dụng còn hạn)
export const getAvailableInventory = async (category_id) => {
    await autoLockExpiredBatches(); // Quét để chặn hàng hết date ngay lập tức
    let query = `
        SELECT 
            p.product_id, p.name, p.unit, p.retail_price,
            COALESCE(SUM(b.quantity), 0) as total_quantity
        FROM products p
        JOIN product_batches b ON p.product_id = b.product_id
        -- CHỈ LẤY LÔ HÀNG CÒN ACTIVE:
        WHERE b.quantity > 0 AND b.status = 'ACTIVE' AND (b.exp_date IS NULL OR b.exp_date >= CURRENT_DATE)
    `;
    const params = [];
    if (category_id) {
        query += ` AND p.category_id = $1`;
        params.push(category_id);
    }
    
    query += ` GROUP BY p.product_id, p.name, p.unit, p.retail_price HAVING SUM(b.quantity) > 0 ORDER BY p.name ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
};