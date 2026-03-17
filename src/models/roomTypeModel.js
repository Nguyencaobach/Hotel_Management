import pool from '../config/db.js';

// Lấy tất cả loại phòng
export const getAllRoomTypes = async () => {
    const result = await pool.query(
        `SELECT * FROM room_types ORDER BY name ASC`
    );
    return result.rows;
};

// Lấy một loại phòng theo id
export const getRoomTypeById = async (id) => {
    const result = await pool.query(
        `SELECT * FROM room_types WHERE id = $1`,
        [id]
    );
    return result.rows[0];
};

// Tạo mới loại phòng
export const createRoomType = async ({ name, description, hourly_price, daily_price }) => {
    const result = await pool.query(
        `INSERT INTO room_types (name, description, hourly_price, daily_price)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, description || null, hourly_price ?? 0, daily_price ?? 0]
    );
    return result.rows[0];
};

// Cập nhật loại phòng
export const updateRoomType = async (id, { name, description, hourly_price, daily_price }) => {
    const result = await pool.query(
        `UPDATE room_types
         SET name = $1,
             description = $2,
             hourly_price = $3,
             daily_price = $4
         WHERE id = $5
         RETURNING *`,
        [name, description || null, hourly_price ?? 0, daily_price ?? 0, id]
    );
    return result.rows[0];
};

// Xóa loại phòng
export const deleteRoomType = async (id) => {
    const result = await pool.query(
        `DELETE FROM room_types WHERE id = $1 RETURNING id`,
        [id]
    );
    return result.rows[0];
};
