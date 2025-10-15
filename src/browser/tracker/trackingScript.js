/**
 * Main tracking script - refactored into modular structure
 * Script tracking chính - đã được refactor thành cấu trúc modular
 * 
 * This file now serves as the main entry point that imports and initializes
 * all the modular helper functions from the helper/ directory.
 * 
 * File này giờ đây đóng vai trò là entry point chính, import và khởi tạo
 * tất cả các hàm helper modular từ thư mục helper/
 */

// Import all helper modules
import { initializeWhenReady } from './helper/core/initialization.js';
// Initialize the tracking script when DOM is ready
// Khởi tạo tracking script khi DOM đã sẵn sàng
initializeWhenReady();