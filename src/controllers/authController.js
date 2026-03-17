import { findUserByUsername } from '../models/userModel.js';
import { logActivity } from '../utils/logger.js';

// [GET] Render trang đăng nhập
export const getLoginPage = (req, res) => {
    res.render('pages/login', {
        title: 'Đăng nhập',
        pageStyles: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">',
        pageScripts: '<script src="/js/passwordHine.js"></script>'
    });
};

// [POST] Xử lý đăng nhập
export const processLogin = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // 1. Tìm user trong DB
        const user = await findUserByUsername(username);

        // 2. So sánh mật khẩu (so sánh chuỗi trực tiếp theo yêu cầu)
        if (user && user.password === password) {
            
            // ==================================================
            // LƯU SESSION (Rất quan trọng để hệ thống nhớ ai đang đăng nhập)
            req.session.user = user; 
            // ==================================================

            // Ghi log đăng nhập thành công
            await logActivity(req, 'LOGIN', 'HỆ THỐNG', user.username, `${user.username} đã đăng nhập thành công`);

            if (user.role === 'manager') {
                res.render('pages/home-M', {
                    user,
                    title: 'Trang chủ Quản lý',
               });
            } else if (user.role === 'staff') {
                res.render('pages/home-S', {
                    user,
                    title: 'Trang chủ Nhân viên',
                    pageStyles: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"><link rel="stylesheet" href="/css/home-S.css">',
                    pageScripts: '<script src="/js/home-S.js"></script>'
                });
            } else {
                res.send(`<h1>Đăng nhập thành công! Xin chào ${user.username}, Quyền: ${user.role || 'Chưa có'}</h1>`);
            }
        } else {
            res.render('pages/login', {
                title: 'Đăng nhập',
                error: 'Tên đăng nhập hoặc mật khẩu không đúng!'
            });
        }
    } catch (error) {
        // Đẩy lỗi sang cho Middleware Error Handler xử lý
        next(error);
    }
};

// [GET] Đăng xuất
export const logout = async (req, res) => {
    // 1. Lấy thông tin user từ Session ra để ghi log trước khi xóa
    const username = req.session?.user?.username || 'Không rõ';
    await logActivity(req, 'LOGOUT', 'HỆ THỐNG', username, `${username} đã đăng xuất`);

    // 2. Hủy Session (Xóa trí nhớ của hệ thống về user này)
    req.session.destroy((err) => {
        if (err) {
            console.error("Lỗi khi xóa session:", err);
        }
        res.redirect('/auth/login');
    });
};