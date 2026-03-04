import { findUserByUsername } from '../models/userModel.js';

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
            // Sau này gắn session thì: req.session.user = user;
            if (user.role === 'manager') {
                res.render('pages/home-M', {
                    user,
                    title: 'Trang chủ Quản lý',
                    pageStyles: '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"><link rel="stylesheet" href="/css/home-M.css">',
                    pageScripts: '<script src="/js/home-M.js"></script>'
                });
            } else if (user.role === 'staff') {
                res.render('pages/home-S', { user });
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