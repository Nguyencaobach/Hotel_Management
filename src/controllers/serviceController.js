import * as ServiceModel from '../models/serviceModel.js';
import { logActivity } from '../utils/logger.js';

// [GET] /services/page - Render giao diện quản lý (SSR)
export const renderPage = (req, res) => {
    res.render('pages/home-M', {
        user: req.user,
        title: 'Quản lý Dịch vụ chung'
    });
};

// [GET] /api/services - Lấy danh sách tất cả dịch vụ (JSON)
export const getAll = async (req, res, next) => {
    try {
        // Lấy category từ query parameters (VD: ?category=FB)
        const { category } = req.query; 
        const data = await ServiceModel.getAllServices(category);
        res.json({ data });
    } catch (error) {
        next(error);
    }
};