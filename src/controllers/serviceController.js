import * as ServiceModel from '../models/serviceModel.js';
import { logActivity } from '../utils/logger.js';

// [GET] /services/page - Render giao diện quản lý (SSR)
export const renderPage = (req, res) => {
    res.render('pages/home-M', {
        user: req.user,
        title: 'Quản lý Dịch vụ chung'
    });
};