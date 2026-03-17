// 1. Hứng lỗi 404 (Khi người dùng gõ sai URL)
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Không tìm thấy đường dẫn: ${req.originalUrl}`);
    res.status(404);
    next(error); // Chuyển tiếp xuống hàm xử lý lỗi chung
};

// 2. Hàm xử lý lỗi chung (Bắt tất cả lỗi từ throw hoặc next(error))
export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    
    // Render ra trang lỗi
    res.render('pages/error', {
        title: 'Đã xảy ra lỗi',
        message: err.message,
        // Chỉ in ra chi tiết mã lỗi (stack) khi đang dev
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};