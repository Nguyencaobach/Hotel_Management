import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Tự động tạo thư mục avatars nếu chưa có
const uploadDir = 'public/uploads/avatars/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Đổi tên file: avatar-1689...jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Chỉ được phép tải lên file hình ảnh!'), false);
};

const uploadAvatar = multer({ storage: storage, fileFilter: fileFilter });
export default uploadAvatar;