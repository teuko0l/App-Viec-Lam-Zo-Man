import { Company } from '../types';

/**
 * Trả về URL Google Maps để chỉ đường tới công ty:
 * 1. Ưu tiên 1: Link bản đồ chính xác do quản trị viên nhập tay trong trang Quản Trị (mapsUrl)
 * 2. Ưu tiên 2: Tự động tạo link tìm kiếm Google Maps theo tên công ty, KCN và tỉnh/thành phố nếu mapsUrl để trống
 */
export function getCompanyMapsUrl(company: Partial<Company> & { name: string; location: string }): string {
  if (company.mapsUrl && company.mapsUrl.trim()) {
    return company.mapsUrl.trim();
  }

  // Tự động tìm kiếm theo tên và địa chỉ công ty
  const searchParts = [
    company.name || company.shortName || '',
    company.industrialPark || '',
    company.location || '',
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const query = searchParts.join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
