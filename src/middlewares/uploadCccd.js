import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/cccd/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cccd-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const uploadCccd = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Tối đa 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Chỉ cho phép tải lên file ảnh!'), false);
    }
});