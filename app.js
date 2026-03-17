import express from 'express';
import { engine } from 'express-handlebars';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import session from 'express-session';
import { fileURLToPath } from 'url';

// 1. Import Routes và Middleware Lỗi
import authRoutes from './src/routes/auth.js';
import roomTypeRoutes from './src/routes/roomType.js';
import roomDetailRoutes from './src/routes/roomDetail.js';
import employeeRoutes from './src/routes/employee.js';
import customerRoutes from './src/routes/customer.js';
import categoryRoutes from './src/routes/category.js';
import productRoutes from './src/routes/product.js';
import serviceRoutes from './src/routes/service.js';
import discountRouter from './src/routes/discount.js';
import activityLogRouter from './src/routes/activityLog.js';
import dashboardRoutes from './src/routes/dashboard.js';
import accountSettingRoutes from './src/routes/accountSetting.js';
import bookingRoutes from './src/routes/booking.js';

////////////////////////////////////////////////////////////////////
import { getAllProducts } from './src/models/productModel.js';
import { getAllServices } from './src/models/serviceModel.js';
import { notFoundHandler, globalErrorHandler } from './src/middlewares/errorHandler.js';
import uploadLogo from './src/middlewares/uploadLogo.js';
import upload from './src/middlewares/upload.js';
import uploadAvatar from './src/middlewares/uploadAvatar.js';
import { uploadCccd } from './src/middlewares/uploadCccd.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(session({
    secret: 'nguyencaobach19112005vn',
    resave: false,
    saveUninitialized: false, // Chỉ lưu khi có dữ liệu
    cookie: {
        secure: false, // Để false nếu đang chạy localhost (HTTP)
        maxAge: 1000 * 60 * 60 * 24 // Session sống 1 ngày
    }
}));

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
    partialsDir: [
        path.join(__dirname, 'src/views/partials'),
        path.join(__dirname, 'src/views/pages') // Thêm dòng này để Handlebars đọc được file từ pages
    ]
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'src/views'));

// --- ĐỊNH TUYẾN (ROUTES) ---
app.get('/', (req, res) => res.redirect('/auth/login'));
app.use('/auth', authRoutes);
app.use('/room-types', roomTypeRoutes);     // View: GET /room-types/page
app.use('/api/room-types', roomTypeRoutes); // API:  GET|POST|PUT|DELETE /api/room-types

app.use('/room-details', roomDetailRoutes); // Dành cho gọi giao diện /page
app.use('/api/room-details', roomDetailRoutes);

app.use('/employees', employeeRoutes);
app.use('/api/employees', employeeRoutes);

app.use('/customers', customerRoutes);
app.use('/api/customers', customerRoutes);

app.use('/categories', categoryRoutes);
app.use('/api/categories', categoryRoutes);

app.use('/products', productRoutes);
app.use('/api/products', productRoutes);

app.use('/api/services', serviceRoutes); // API dữ liệu
app.use('/services', serviceRoutes);     // Giao diện (dành cho /services/page)

app.use('/api/discounts', discountRouter);
app.use('/discounts', discountRouter); // Dành cho /discounts/page

app.use('/api/activity-logs', activityLogRouter);
app.use('/activity-logs', activityLogRouter);

app.use('/api/dashboard', dashboardRoutes); // Dành cho việc gọi API lấy dữ liệu
app.use('/dashboard', dashboardRoutes);

app.use('/api/account-setting', accountSettingRoutes); // API lấy & cập nhật cài đặt
app.use('/account-setting', accountSettingRoutes);     // Giao diện /page

app.use('/api/bookings', bookingRoutes); // API: POST /rent, GET /active/:id, PUT /rent/:id


// --- API KHO HÀNG: Lấy danh sách sản phẩm còn tồn kho (dùng cho Modal Dịch vụ phát sinh) ---
app.get('/api/inventory/available', async (req, res, next) => {
    try {
        const allProducts = await getAllProducts();
        
        let available = allProducts;
        
        // 1. Lọc theo danh mục (Nếu Lễ tân có chọn danh mục trên giao diện)
        if (req.query.category_id) {
            available = available.filter(p => p.category_id === req.query.category_id);
        }
        
        // 2. Lọc tồn kho > 0 
        // (Bổ sung thêm total_quantity và quantity để bao quát mọi trường hợp trả về từ Database)
        available = available.filter(p => {
            const stock = Number(p.total_stock || p.total_quantity || p.stock || p.quantity || 0);
            return stock > 0;
        });
        
        res.json({ data: available });
    } catch (error) { next(error); }
});

// --- API DỊCH VỤ CHUNG: Giặt ủi, Đồ ăn,... (dùng cho Modal Dịch vụ phát sinh) ---
app.get('/api/general-services', async (req, res, next) => {
    try {
        const allServices = await getAllServices();
        // Chỉ trả về dịch vụ đang hoạt động (is_active = true)
        const active = allServices.filter(s => s.is_active !== false);
        res.json({ data: active });
    } catch (error) { next(error); }
});

app.post('/api/upload/rooms', upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Không có file nào được tải lên.' });
        }
        // Trả về danh sách URL của các ảnh vừa tải lên thành công
        const imageUrls = req.files.map(file => `/uploads/rooms/${file.filename}`);
        res.status(200).json({ urls: imageUrls });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi upload ảnh.' });
    }
});

app.post('/api/upload/logos', uploadLogo.single('logo'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Không có file nào được tải lên.' });
        // Trả về 1 URL duy nhất
        res.status(200).json({ url: `/uploads/logos/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi upload logo.' });
    }
});

app.post('/api/upload/avatars', uploadAvatar.single('avatar'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Không có ảnh nào được tải lên.' });
        res.status(200).json({ url: `/uploads/avatars/${req.file.filename}` });
    } catch (error) {
        res.status(500).json({ error: 'Lỗi server khi upload ảnh đại diện.' });
    }
});

app.post('/api/upload/cccd', uploadCccd.single('cccd'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không có file tải lên' });
    res.json({ url: `/uploads/cccd/${req.file.filename}` });
});

// --- MIDDLEWARE HỨNG LỖI (BẮT BUỘC PHẢI ĐẶT Ở CUỐI CÙNG) ---
app.use(notFoundHandler);    // Nếu không lọt vào route nào ở trên thì nhảy vào đây (404)
app.use(globalErrorHandler); // Nhận tất cả lỗi phát sinh và in ra giao diện (500)

export default app;