import express from 'express';
import * as ServiceController from '../controllers/serviceController.js';
import { cacheHTML } from '../middlewares/shared/cache.js';

const router = express.Router();

// Route cho giao diện (SSR) - Cache 10 phút giống các chức năng khác
router.get('/page', cacheHTML(10), ServiceController.renderPage);

// Các API RESTful cho Dịch vụ (JSON)
router.get('/', ServiceController.getAll);         // Lấy toàn bộ
router.post('/', ServiceController.create);        // Thêm mới
router.put('/:id', ServiceController.update);      // Cập nhật
router.delete('/:id', ServiceController.remove);   // Xóa

export default router;