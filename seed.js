import dotenv from 'dotenv';
import pool from './src/config/db.js';

// Load biến môi trường từ file .env
dotenv.config();

const createMockData = async () => {
    try {
        console.log('Đang kết nối Database...');

        // 1. Tạo các Quyền (Roles)
        await pool.query(`
            INSERT INTO roles (name) 
            VALUES ('Admin'), ('Manager'), ('Staff')
            ON CONFLICT (name) DO NOTHING;
        `);
        console.log('✅ Đã tạo bảng quyền (Roles) thành công!');

        // 2. Tạo User (Mật khẩu text cơ bản: '123456')
        const userResult = await pool.query(`
            INSERT INTO users (username, email, password_hash) 
            VALUES ('admin', 'admin@homestay.com', '123456')
            ON CONFLICT (username) DO NOTHING
            RETURNING user_id;
        `);
        
        let userId;
        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].user_id;
            console.log('✅ Đã tạo tài khoản: admin / 123456');
        } else {
            // Trường hợp chạy lại file seed, tài khoản đã tồn tại
            const existingUser = await pool.query(`SELECT user_id FROM users WHERE username = 'admin'`);
            userId = existingUser.rows[0].user_id;
            console.log('⚠️ Tài khoản admin đã tồn tại từ trước.');
        }

        // 3. Gắn quyền 'Admin' cho tài khoản vừa tạo
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id) 
            VALUES ($1, (SELECT role_id FROM roles WHERE name = 'Admin'))
            ON CONFLICT DO NOTHING;
        `, [userId]);
        console.log('✅ Đã cấp quyền Admin cho tài khoản thành công!');

    } catch (error) {
        console.error('❌ Lỗi khi tạo dữ liệu mẫu:', error.message);
    } finally {
        // Đóng kết nối pool để script tự thoát
        await pool.end(); 
        console.log('Đã đóng kết nối Database.');
    }
};

createMockData();