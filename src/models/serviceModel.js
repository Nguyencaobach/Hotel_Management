import pool from '../config/db.js';

/**
 * Lấy danh sách tất cả dịch vụ (Giặt ủi & Đồ ăn)
 * Sắp xếp theo loại và tên A-Z
 */
export const getAllServices = async (category = null) => {
    // Chỉ lấy dịch vụ đang hoạt động (is_active = true)
    let query = `SELECT * FROM services WHERE is_active = true`;
    const params = [];
    
    if (category) {
        query += ` AND category = $1`;
        params.push(category);
    }
    
    query += ` ORDER BY category ASC, name ASC`;
    const result = await pool.query(query, params);
    return result.rows;
};

/**
 * Lấy thông tin chi tiết một dịch vụ theo ID
 */
export const getServiceById = async (service_id) => {
    const query = `SELECT * FROM services WHERE service_id = $1`;
    const result = await pool.query(query, [service_id]);
    return result.rows[0];
};

/**
 * Thêm mới một dịch vụ (Giặt ủi hoặc Đồ ăn)
 */
export const createService = async (data) => {
    const { category, name, unit, price, description } = data;
    const query = `
        INSERT INTO services (category, name, unit, price, description)
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
    `;
    const result = await pool.query(query, [
        category, 
        name.trim(), 
        unit.trim(), 
        price, 
        description?.trim() || null
    ]);
    return result.rows[0];
};

/**
 * Cập nhật thông tin dịch vụ
 */
export const updateService = async (id, data) => {
    const { category, name, unit, price, description, is_active } = data;
    const query = `
        UPDATE services 
        SET category = $1, name = $2, unit = $3, price = $4, description = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
        WHERE service_id = $7 
        RETURNING *
    `;
    const result = await pool.query(query, [
        category, 
        name.trim(), 
        unit.trim(), 
        price, 
        description?.trim() || null, 
        is_active,
        id
    ]);
    return result.rows[0];
};

/**
 * Xóa một dịch vụ
 */
export const deleteService = async (id) => {
    const query = `DELETE FROM services WHERE service_id = $1`;
    await pool.query(query, [id]);
};