import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Khởi tạo Pool kết nối tới Azure PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Bắt buộc khi kết nối lên Azure
    }
});

// Hàm kiểm tra kết nối ngay khi khởi động server
export const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('Kết nối Database PostgreSQL trên Azure thành công!');
        client.release(); // Trả lại kết nối cho Pool
    } catch (err) {
        console.error('Lỗi kết nối Database:', err.message);
    }
};

export default pool;