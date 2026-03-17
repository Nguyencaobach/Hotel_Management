import pool from '../config/db.js';

/**
 * Hàm ghi nhật ký hoạt động
 * @param {Object} req - Request từ Express (để lấy thông tin user đang đăng nhập)
 * @param {String} action - 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
 * @param {String} entity_type - Tên chức năng (VD: 'PHÒNG', 'SẢN PHẨM', 'MÃ GIẢM GIÁ')
 * @param {String} entity_name - Tên đối tượng (VD: 'Phòng P101', 'Bia Tiger')
 * @param {String} details - Chi tiết (VD: 'Đã cập nhật giá bán')
 */
export const logActivity = async (req, action, entity_type, entity_name, details = '') => {
    try {
        // Lấy thông tin user đang đăng nhập (Giả sử bạn đã lưu trong req.user lúc đăng nhập)
            // Thay đổi phần lấy thông tin user thành như sau:
        const user_id = req.session?.user?.user_id || null;
        const username = req.session?.user?.username || 'Hệ thống';

        const query = `
            INSERT INTO activity_logs (user_id, username, action, entity_type, entity_name, details)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(query, [user_id, username, action, entity_type, entity_name, details]);
    } catch (error) {
        console.error('❌ Lỗi khi ghi Activity Log:', error);
        // Không throw error để không làm gián đoạn tiến trình chính của hệ thống
    }
};