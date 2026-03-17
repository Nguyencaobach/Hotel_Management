import {
    getAllProducts, getProductById, getProductBySku, createProduct, updateProduct, deleteProduct,
    getBatchesByProductId, getBatchById, createBatch, updateBatch, deleteBatch,
    // THÊM 2 HÀM NÀY VÀO ĐỂ TRÁNH LỖI 500:
    getAllCategories, getAvailableInventory 
} from '../models/productModel.js';
import { logActivity } from '../utils/logger.js';

// ==========================================
// RENDER GIAO DIỆN CHÍNH
// ==========================================

// [GET] /products/page — Render trang quản lý sản phẩm & kho hàng
export const renderPage = (req, res) => {
    res.render('pages/home-M', {
        user: req.user,
        title: 'Quản lý Sản phẩm & Kho'
    });
};

// ==========================================
// PHẦN 1: API QUẢN LÝ SẢN PHẨM GỐC
// ==========================================

// [GET] /api/products — Lấy danh sách tất cả sản phẩm gốc (đã tự động cộng dồn tổng tồn kho từ các lô)
export const getAll = async (req, res, next) => {
    try {
        const data = await getAllProducts();
        res.json({ data });
    } catch (error) {
        next(error);
    }
};

// [POST] /api/products — Tạo mới một sản phẩm gốc
export const create = async (req, res, next) => {
    try {
        const { category_id, sku, name, unit, retail_price } = req.body;

        if (!name || !unit) {
            return res.status(400).json({ error: 'Tên sản phẩm và đơn vị tính không được để trống.' });
        }

        // Tự động sinh mã SKU nếu người dùng không nhập (Giống mã vạch siêu thị 13 số)
        let finalSku = sku;
        if (!finalSku || finalSku.trim() === '') {
            finalSku = '893' + Math.floor(1000000000 + Math.random() * 9000000000).toString(); // Sinh ngẫu nhiên dãy 893xxxxxxxxx
        } else if (await getProductBySku(finalSku.trim())) {
            // Kiểm tra trùng lặp nếu người dùng tự nhập mã
            return res.status(400).json({ error: 'Mã SKU này đã tồn tại trong hệ thống.' });
        }

        const newProduct = await createProduct({
            category_id,
            sku: finalSku.trim(),
            name: name.trim(),
            unit: unit.trim(),
            retail_price
        });

        await logActivity(req, 'CREATE', 'SẢN PHẨM', newProduct.name, `Đã thêm mới sản phẩm "${newProduct.name}" (SKU: ${newProduct.sku})`);
        res.status(201).json({ data: newProduct });
    } catch (error) {
        next(error);
    }
};

// [PUT] /api/products/:id — Cập nhật thông tin sản phẩm gốc
export const update = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { category_id, sku, name, unit, retail_price } = req.body;

        const existing = await getProductById(id);
        if (!existing) return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });

        // Nếu có sửa mã SKU, kiểm tra xem có bị trùng với sản phẩm khác không
        if (sku && sku.trim() !== existing.sku && await getProductBySku(sku.trim())) {
            return res.status(400).json({ error: 'Mã SKU này đã tồn tại.' });
        }

        const updated = await updateProduct(id, {
            category_id,
            sku: sku ? sku.trim() : existing.sku,
            name: name.trim(),
            unit: unit.trim(),
            retail_price
        });

        await logActivity(req, 'UPDATE', 'SẢN PHẨM', updated.name, `Đã cập nhật sản phẩm "${updated.name}"`);
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
};

// [DELETE] /api/products/:id — Xóa một sản phẩm gốc (Sẽ tự động xóa các lô hàng thuộc SP này)
export const remove = async (req, res, next) => {
    try {
        const { id } = req.params;

        const existing = await getProductById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
        }

        await deleteProduct(id);
        await logActivity(req, 'DELETE', 'SẢN PHẨM', existing.name, `Đã xóa sản phẩm "${existing.name}" (và toàn bộ lô hàng)`);
        res.json({ message: 'Xóa sản phẩm thành công.' });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// PHẦN 2: API QUẢN LÝ CHI TIẾT LÔ HÀNG (NHẬP HÀNG)
// ==========================================

// [GET] /api/products/:id/batches — Lấy danh sách các đợt nhập hàng (lô) của 1 sản phẩm cụ thể
export const getBatches = async (req, res, next) => {
    try {
        const { id } = req.params; // Lấy id của sản phẩm từ URL
        const data = await getBatchesByProductId(id);
        res.json({ data });
    } catch (error) {
        next(error);
    }
};

// [POST] /api/products/:id/batches — Thêm 1 đợt nhập hàng mới (Lô mới) cho sản phẩm (Nhập kho)
export const addBatch = async (req, res, next) => {
    try {
        const { id } = req.params; // Lấy id của sản phẩm
        const { batch_code, quantity, import_price, mfg_date, exp_date, import_date, supplier } = req.body;

        // Bắt lỗi nếu số lượng nhập vào bị âm hoặc để trống
        if (quantity === undefined || quantity < 0) {
            return res.status(400).json({ error: 'Số lượng nhập không hợp lệ.' });
        }

        const newBatch = await createBatch({
            product_id: id,
            batch_code,
            quantity,
            import_price,
            mfg_date,
            exp_date,
            import_date,
            supplier
        });

        await logActivity(req, 'CREATE', 'LÔ HÀNG', newBatch.batch_code || `Lô #${newBatch.batch_id}`, `Nhập ${quantity} sản phẩm vào kho, nhà cung cấp: ${supplier || 'Không rõ'}`);
        res.status(201).json({ data: newBatch });
    } catch (error) {
        next(error);
    }
};

// [PUT] /api/products/batches/:batchId — Cập nhật thông tin của 1 đợt nhập hàng
export const editBatch = async (req, res, next) => {
    try {
        const { batchId } = req.params;
        const { batch_code, quantity, import_price, mfg_date, exp_date, import_date, supplier,status } = req.body;

        // Kiểm tra xem lô hàng có tồn tại không
        if (!await getBatchById(batchId)) {
            return res.status(404).json({ error: 'Không tìm thấy lô hàng.' });
        }

        const updated = await updateBatch(batchId, {
            batch_code,
            quantity,
            import_price,
            mfg_date,
            exp_date,
            import_date,
            supplier,
            status,
        });

        await logActivity(req, 'UPDATE', 'LÔ HÀNG', updated.batch_code || `Lô #${batchId}`, `Đã cập nhật lô hàng`);
        res.json({ data: updated });
    } catch (error) {
        next(error);
    }
};

// [DELETE] /api/products/batches/:batchId — Xóa 1 đợt nhập hàng (Xóa Lô)
export const removeBatch = async (req, res, next) => {
    try {
        const { batchId } = req.params;

        const existingBatch = await getBatchById(batchId);
        if (!existingBatch) {
            return res.status(404).json({ error: 'Không tìm thấy lô hàng.' });
        }

        await deleteBatch(batchId);
        await logActivity(req, 'DELETE', 'LÔ HÀNG', existingBatch.batch_code || `Lô #${batchId}`, `Đã xóa lô hàng`);
        res.json({ message: 'Xóa lô hàng thành công.' });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// PHẦN 3: API CHO LỄ TÂN (BÁN HÀNG / THÊM VÀO PHÒNG)
// ==========================================

export const getCategories = async (req, res, next) => {
    try {
        // Đã bỏ chữ ProductModel. đi
        const data = await getAllCategories();
        res.json({ data });
    } catch (error) { 
        next(error); 
    }
};

export const getAvailableProducts = async (req, res, next) => {
    try {
        const { category_id } = req.query;
        // Đã bỏ chữ ProductModel. đi
        const data = await getAvailableInventory(category_id);
        res.json({ data });
    } catch (error) { 
        next(error); 
    }
};

