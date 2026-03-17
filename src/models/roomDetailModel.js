import pool from '../config/db.js';

// Lấy tất cả chi tiết phòng (Join với room_types để lấy tên loại phòng)
export const getAllRoomDetails = async () => {
    const result = await pool.query(
        `SELECT rd.*, rt.name AS room_type_name 
         FROM room_details rd
         JOIN room_types rt ON rd.room_type_id = rt.id
         ORDER BY rd.room_number ASC`
    );
    return result.rows;
};

// Lấy chi tiết phòng theo id
export const getRoomDetailById = async (id) => {
    const result = await pool.query(
        `SELECT * FROM room_details WHERE id = $1`,
        [id]
    );
    return result.rows[0];
};

// Kiểm tra số phòng đã tồn tại trong cùng loại phòng chưa
export const getRoomDetailByRoomNumber = async (room_number, room_type_id, excludeId = null) => {
    let query = `SELECT * FROM room_details WHERE room_number = $1 AND room_type_id = $2`;
    const params = [room_number, room_type_id];
    // Khi sửa phòng: bỏ qua chính nó khỏi kiểm tra
    if (excludeId) {
        query += ` AND id != $3`;
        params.push(excludeId);
    }
    const result = await pool.query(query, params);
    return result.rows[0];
};

// Tạo mới chi tiết phòng
export const createRoomDetail = async ({ room_type_id, room_number, status, floor, notes, capacity, bed_type, room_size, view_type, amenities, room_img_url }) => {
    const result = await pool.query(
        `INSERT INTO room_details (room_type_id, room_number, status, floor, notes, capacity, bed_type, room_size, view_type, amenities, room_img_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
            room_type_id, room_number, status || 'AVAILABLE', floor || null, notes || null,
            capacity || 2, bed_type || null, room_size || null, view_type || null,
            JSON.stringify(amenities || []), room_img_url || null
        ]
    );
    return result.rows[0];
};

// Cập nhật chi tiết phòng
export const updateRoomDetail = async (id, { room_type_id, room_number, status, floor, notes, capacity, bed_type, room_size, view_type, amenities, room_img_url }) => {
    const result = await pool.query(
        `UPDATE room_details
         SET room_type_id = $1, room_number = $2, status = $3, floor = $4, notes = $5,
             capacity = $6, bed_type = $7, room_size = $8, view_type = $9, amenities = $10, room_img_url = $11
         WHERE id = $12
         RETURNING *`,
        [
            room_type_id, room_number, status || 'AVAILABLE', floor || null, notes || null,
            capacity, bed_type, room_size, view_type, JSON.stringify(amenities || []), room_img_url || null, id
        ]
    );
    return result.rows[0];
};

// Xóa chi tiết phòng
export const deleteRoomDetail = async (id) => {
    const result = await pool.query(
        `DELETE FROM room_details WHERE id = $1 RETURNING id`,
        [id]
    );
    return result.rows[0];
};