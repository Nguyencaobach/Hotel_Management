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