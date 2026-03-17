import express from 'express';
import { 
    renderPage, 
    getAll, create, update, remove,
    getBatches, addBatch, editBatch, removeBatch, getCategories, getAvailableProducts 
} from '../controllers/productController.js';
import { cacheHTML } from '../middlewares/shared/cache.js';

const router = express.Router();

// [GET] Render giao diện quản lý
router.get('/page', cacheHTML(10), renderPage);

// --- API SẢN PHẨM GỐC ---
router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

// --- API LÔ HÀNG (CHI TIẾT NHẬP HÀNG) ---
// Lấy danh sách lô hàng của 1 sản phẩm
router.get('/:id/batches', getBatches);
// Thêm 1 đợt nhập hàng mới cho sản phẩm
router.post('/:id/batches', addBatch);
// Cập nhật thông tin 1 lô hàng
router.put('/batches/:batchId', editBatch);
// Xóa 1 lô hàng
router.delete('/batches/:batchId', removeBatch);

router.get('/categories', getCategories);
router.get('/available', getAvailableProducts);

export default router;