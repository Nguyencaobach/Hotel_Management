import pool from '../config/db.js';

export const findUserByUsername = async (username) => {
    // Truy vấn bảng users mới
    const query = `
        SELECT user_id, username, password, role, full_name, avatar_url, email, created_at
        FROM users
        WHERE username = $1
    `;
    const result = await pool.query(query, [username]);
    const user = result.rows[0];
    // Chuyển role về dạng thường cho controller xử lý
    if (user && user.role) {
        user.role = user.role.toLowerCase(); // 'MANAGER' -> 'manager', 'STAFF' -> 'staff'
    }
    return user;
};