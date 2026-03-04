import express from 'express';
import { engine } from 'express-handlebars';
import cors from 'cors';
import compression from 'compression'; 
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Import Routes và Middleware Lỗi
import authRoutes from './src/routes/auth.js';
import { notFoundHandler, globalErrorHandler } from './src/middlewares/errorHandler.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CẤU HÌNH CƠ BẢN ---
app.use(compression()); 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- CẤU HÌNH HANDLEBARS ---
app.engine('hbs', engine({ 
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'src/views/layouts'),
    partialsDir: path.join(__dirname, 'src/views/partials') 
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src/views'));

// --- ĐỊNH TUYẾN (ROUTES) ---
app.get('/', (req, res) => res.redirect('/auth/login'));
app.use('/auth', authRoutes);

// --- MIDDLEWARE HỨNG LỖI (BẮT BUỘC PHẢI ĐẶT Ở CUỐI CÙNG) ---
app.use(notFoundHandler);    // Nếu không lọt vào route nào ở trên thì nhảy vào đây (404)
app.use(globalErrorHandler); // Nhận tất cả lỗi phát sinh và in ra giao diện (500)

export default app;