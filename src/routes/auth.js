import express from 'express';
import { getLoginPage, processLogin, logout } from '../controllers/authController.js';
import { cacheHTML } from '../middlewares/shared/cache.js';

const router = express.Router();

// Chỉ cache trang GET giao diện (5 phút)
router.get('/login', cacheHTML(5), getLoginPage);

// API POST không dùng cache
router.post('/login', processLogin);

// Đăng xuất
router.get('/logout', logout);

export default router;