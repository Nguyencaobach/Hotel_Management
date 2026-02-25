import express from 'express';
import { engine } from 'express-handlebars';
import cors from 'cors';
import compression from 'compression'; 
import path from 'path';
import { fileURLToPath } from 'url';

// Import Middleware Cache
import { cacheHTML } from './src/middlewares/shared/cache.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MIDDLEWARES TỐI ƯU HÓA ---
app.use(compression()); // Nén GZIP giúp web nhẹ đi 70%
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CẤU HÌNH GIAO DIỆN (HANDLEBARS) ---
app.engine('hbs', engine({ 
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'src/views/layouts'),
    partialsDir: path.join(__dirname, 'src/views/partials') 
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.static(path.join(__dirname, 'public')));

// --- TEST TÍNH NĂNG CACHE ---
// Gắn middleware cacheHTML(5 phút) trước khi chạy logic xử lý
app.get('/', cacheHTML(5), (req, res) => {
    
    // Hàm setTimeout này mô phỏng việc hệ thống của bạn đang phải chạy một
    // câu query phức tạp vào PostgreSQL để đếm tổng số phòng homestay và tính doanh thu.
    // Việc này giả sử mất 2 giây để hoàn thành.
    setTimeout(() => {
        res.send(`
            <h1>Hệ thống Quản lý Homestay</h1>
            <p>Trang này được tải lúc: <b>${new Date().toLocaleTimeString()}</b></p>
            <p><i>Hãy F5 trang web vài lần, bạn sẽ thấy thời gian không đổi và load cực nhanh nhờ Cache! Nhìn vào Terminal để thấy sự khác biệt.</i></p>
        `);
    }, 2000); // Bắt server đợi 2 giây mới trả kết quả
});

export default app;