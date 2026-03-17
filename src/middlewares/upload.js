import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Đảm bảo thư mục tồn tại, nếu chưa có thì tự động tạo
const uploadDir = 'public/uploads/rooms/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình nơi lưu và tên file ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Lưu vào thư mục này
    },
    filename: function (req, file, cb) {
        // Đổi tên file để không bị trùng (Thêm timestamp vào trước tên gốc)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Chỉ cho phép upload file ảnh
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ được phép tải lên file hình ảnh!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });
export default upload;