/**
 * Phiên bản của các config hardcode trong route (không nằm trong DB nên không có
 * cột version để đọc). Bump tay mỗi khi sửa dữ liệu tương ứng.
 *
 * QUAN TRỌNG: /provider-models trả giá trị này trong meta.version, còn
 * /config/versions trả nó dưới key provider_models. Hai chỗ phải luôn khớp nhau —
 * ConfigVersionPoller bên extension diff /config/versions rồi gọi
 * ModelRegistry._updateFromVersion(), hàm này lại so với meta.version đã cache.
 * Nếu hai giá trị lệch, mỗi chu kỳ poll sẽ kích hoạt một lần refetch thừa.
 */
const PROVIDER_MODELS_VERSION = 'v1.1'; // 2026-08-07: Omni Flash mở duration_tier advanced (10s)

module.exports = { PROVIDER_MODELS_VERSION };
