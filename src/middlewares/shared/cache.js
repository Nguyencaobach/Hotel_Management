import mcache from 'memory-cache';

export const cacheHTML = (durationInMinutes) => {
    return (req, res, next) => {
        // Chỉ cache các request GET (không cache POST, PUT, DELETE)
        if (req.method !== 'GET') {
            return next();
        }

        // Tạo khóa (key) dựa trên đường dẫn URL
        const key = '__express__' + req.originalUrl || req.url;
        const cachedBody = mcache.get(key);

        if (cachedBody) {
            // Đã có cache -> Trả về luôn, bỏ qua Controller phía sau
            console.log(`⚡ [CACHE HIT] Đang lấy dữ liệu nhanh cho URL: ${req.url}`);
            res.send(cachedBody);
            return;
        } else {
            // Chưa có cache -> Ghi đè hàm gửi để lưu data lại
            console.log(`⏳ [CACHE MISS] Đang xử lý và tạo trang mới cho URL: ${req.url}`);
            res.sendResponse = res.send;
            res.send = (body) => {
                mcache.put(key, body, durationInMinutes * 60 * 1000);
                res.sendResponse(body);
            };
            next();
        }
    };
};