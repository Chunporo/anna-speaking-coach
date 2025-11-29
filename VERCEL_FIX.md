# 🔧 Hướng dẫn khắc phục lỗi Vercel "No Next.js version detected"

## Vấn đề

Vercel đang tìm Next.js ở thư mục root thay vì trong thư mục `frontend/`, dẫn đến lỗi:
```
No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". 
Also check your Root Directory setting matches the directory of your package.json file.
```

## Giải pháp (BẮT BUỘC)

Bạn **PHẢI** cấu hình Root Directory trong Vercel Dashboard:

### Các bước:

1. **Truy cập Vercel Dashboard**
   - Vào https://vercel.com/dashboard
   - Đăng nhập vào tài khoản của bạn

2. **Chọn Project**
   - Click vào project bị lỗi

3. **Vào Settings**
   - Click tab **Settings** ở trên cùng
   - Chọn **General** trong menu bên trái

4. **Cấu hình Root Directory**
   - Scroll xuống tìm mục **"Root Directory"**
   - Click nút **"Edit"** bên cạnh
   - Chọn hoặc nhập: `frontend`
   - Click **"Save"**

5. **Redeploy**
   - Vào tab **Deployments**
   - Click **"Redeploy"** trên deployment mới nhất
   - Hoặc push một commit mới để trigger build tự động

## Tại sao cần làm điều này?

- Next.js app của bạn nằm trong thư mục `frontend/`
- File `package.json` có chứa Next.js nằm ở `frontend/package.json`
- Vercel mặc định build từ root directory
- Khi build từ root, Vercel không tìm thấy Next.js vì nó ở trong `frontend/`
- Setting Root Directory = `frontend` sẽ báo cho Vercel biết cần build từ thư mục đó

## Sau khi set Root Directory

Sau khi cấu hình đúng:
- ✅ Vercel sẽ tự động detect Next.js từ `frontend/package.json`
- ✅ Build sẽ chạy từ thư mục `frontend/`
- ✅ Các path alias `@/lib/*` sẽ resolve đúng
- ✅ Build sẽ thành công

## Lưu ý

- **Không thể** cấu hình Root Directory từ code (phải làm trong Vercel Dashboard)
- File `vercel.json` đã được cấu hình đúng nhưng Vercel vẫn cần Root Directory setting
- Sau khi set Root Directory, bạn có thể xóa hoặc giữ `vercel.json` - cả hai đều hoạt động

## Kiểm tra

Sau khi set Root Directory và redeploy, bạn sẽ thấy trong build logs:
```
Detected Next.js version: 14.0.4
Running "npm run build"
```

Thay vì lỗi "No Next.js version detected".

