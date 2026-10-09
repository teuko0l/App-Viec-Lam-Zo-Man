import React, { useState } from 'react';
import { Company, AppSettings } from '../types';
import {
  Search,
  MapPin,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  X,
  Clock,
  GraduationCap,
  Navigation,
  Gift,
  Sparkles,
} from 'lucide-react';
import { ZoManLogo } from './ZoManLogo';
import { getCompanyMapsUrl } from '../utils/maps';

const getCompanyBonusText = (company: Company): string => {
  if (!company.bonusProgram || !company.bonusProgram.enabled) return '';
  const text = company.bonusProgram.totalBonusText?.trim();
  if (text) return text;
  if (Array.isArray(company.bonusProgram.months) && company.bonusProgram.months.length > 0) {
    let sum = 0;
    company.bonusProgram.months.forEach((m) => {
      const parseVal = (str?: string) => {
        if (!str) return 0;
        const num = parseInt(str.replace(/[^\d]/g, ''), 10);
        if (isNaN(num)) return 0;
        if (num < 100) return num * 1000000;
        return num;
      };
      sum += parseVal(m.companyBonus) + parseVal(m.supplierBonus);
    });
    if (sum > 0) return `${sum.toLocaleString('vi-VN')} đ`;
  }
  return '';
};

interface Props {
  companies: Company[];
  onSelectCompany: (company: Company) => void;
  onOpenApplyModal: (company: Company) => void;
  onOpenSalaryCalculator?: () => void;
  onOpenWorkerHandbook?: () => void;
  onOpenExpressJobs?: () => void;
  onOpenAiConsultant?: () => void;
  appSettings?: AppSettings;
  largeText: boolean;
}

export const HomeScreen: React.FC<Props> = ({
  companies,
  onSelectCompany,
  onOpenApplyModal,
  onOpenSalaryCalculator,
  onOpenWorkerHandbook,
  onOpenExpressJobs,
  onOpenAiConsultant,
  appSettings,
  largeText,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [employmentTab, setEmploymentTab] = useState<'pho_thong' | 'thoi_vu' | 'hanh_chinh'>('pho_thong');

  const appTitle = appSettings?.appTitle || 'CUNG ỨNG NHÂN LỰC';
  const appSubtitle = appSettings?.appSubtitle || 'Khu vực Bắc Ninh – Bắc Giang';

  // Lọc chỉ lấy các công ty ĐANG TUYỂN DỤNG (không bị ẩn bởi quản trị viên)
  const activeCompanies = companies.filter((c) => !c.hidden);

  // 1. Đếm số lượng công ty theo 3 mục chính
  const countPhoThong = activeCompanies.filter((c) => (c.employmentType || 'pho_thong') === 'pho_thong').length;
  const countThoiVu = activeCompanies.filter((c) => c.employmentType === 'thoi_vu').length;
  const countHanhChinh = activeCompanies.filter((c) => c.employmentType === 'hanh_chinh').length;

  // 2. Lọc các công ty thuộc phân hệ đang chọn
  const tabCompanies = activeCompanies.filter((c) => (c.employmentType || 'pho_thong') === employmentTab);

  // 3. Lọc theo thanh tìm kiếm an toàn tuyệt đối
  const filteredCompanies = tabCompanies.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const matchName = (c.name || '').toLowerCase().includes(query);
    const matchShortName = (c.shortName || '').toLowerCase().includes(query);
    const matchIndustry = (c.industry || '').toLowerCase().includes(query);
    const matchLocation = (c.location || '').toLowerCase().includes(query);
    const matchIndustrialPark = (c.industrialPark || '').toLowerCase().includes(query);
    const matchPositions = Array.isArray(c.positions) && c.positions.some((p) => (p?.title || '').toLowerCase().includes(query));
    return matchName || matchShortName || matchIndustry || matchLocation || matchIndustrialPark || matchPositions;
  });

  return (
    <div className="flex flex-col min-h-full bg-slate-100 pb-20">
      {/* Top Banner Tiêu đề cho Người Lao Động (Khôi phục đúng ảnh 13.png) */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-4 pt-4 pb-4.5 shadow-md">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-1.5 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tuyển Trực Tiếp · Không Thu Phí</span>
            </div>
            <h1 className={`font-black text-white tracking-tight ${largeText ? 'text-2xl' : 'text-xl sm:text-2xl'}`}>
              {appTitle}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm mt-0.5 font-medium">{appSubtitle}</p>
          </div>

          {/* Logo ZôMan nổi bật */}
          <div className="shrink-0 flex items-center">
            <ZoManLogo size={52} showShadow={true} imageUrl={appSettings?.customLogo} />
          </div>
        </div>

        {/* Thanh tìm kiếm trực quan nằm trọn bên trong banner */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên công ty, nghề, địa điểm (KCN Quế Võ"
            className={`w-full bg-white text-slate-900 rounded-2xl pl-10 pr-9 py-2.5 shadow-sm border border-blue-200/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all placeholder:text-slate-400 ${
              largeText ? 'text-base' : 'text-xs sm:text-sm'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MENU 3 MỤC CHÍNH: VIỆC LÀM PHỔ THÔNG | THỜI VỤ | HÀNH CHÍNH */}
      {/* ======================================================== */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="p-2 sm:p-2.5 bg-slate-100">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-xl mx-auto">
            {/* Mục 1: Việc làm phổ thông */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setEmploymentTab('pho_thong');
              }}
              className={`py-2 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center relative active:scale-95 ${
                employmentTab === 'pho_thong'
                  ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-400 font-black'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold'
              }`}
            >
              <div className="flex items-center gap-1">
                <Briefcase className={`w-3.5 h-3.5 ${employmentTab === 'pho_thong' ? 'text-white' : 'text-blue-600'}`} />
                <span className="text-xs sm:text-sm">Việc phổ thông</span>
              </div>
              <span
                className={`text-[10px] mt-0.5 ${
                  employmentTab === 'pho_thong' ? 'text-blue-200 font-medium' : 'text-slate-400'
                }`}
              >
                ({countPhoThong} nhà máy)
              </span>
            </button>

            {/* Mục 2: Việc làm thời vụ */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setEmploymentTab('thoi_vu');
              }}
              className={`py-2 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center relative active:scale-95 ${
                employmentTab === 'thoi_vu'
                  ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400 font-black'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold'
              }`}
            >
              <div className="flex items-center gap-1">
                <Clock className={`w-3.5 h-3.5 ${employmentTab === 'thoi_vu' ? 'text-white' : 'text-orange-600'}`} />
                <span className="text-xs sm:text-sm">Việc thời vụ</span>
              </div>
              <span
                className={`text-[10px] mt-0.5 ${
                  employmentTab === 'thoi_vu' ? 'text-orange-200 font-medium' : 'text-slate-400'
                }`}
              >
                ({countThoiVu} vụ mùa)
              </span>
            </button>

            {/* Mục 3: Việc làm hành chính */}
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setEmploymentTab('hanh_chinh');
              }}
              className={`py-2 px-1 sm:px-2 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center relative active:scale-95 ${
                employmentTab === 'hanh_chinh'
                  ? 'bg-indigo-700 text-white shadow-md ring-2 ring-indigo-400 font-black'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-bold'
              }`}
            >
              <div className="flex items-center gap-1">
                <GraduationCap className={`w-3.5 h-3.5 ${employmentTab === 'hanh_chinh' ? 'text-white' : 'text-indigo-600'}`} />
                <span className="text-xs sm:text-sm">Việc hành chính</span>
              </div>
              <span
                className={`text-[10px] mt-0.5 ${
                  employmentTab === 'hanh_chinh' ? 'text-indigo-200 font-medium' : 'text-slate-400'
                }`}
              >
                ({countHanhChinh} vị trí)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả tìm kiếm nếu có */}
      {searchQuery && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between text-xs text-blue-800">
          <span>
            Kết quả tìm kiếm cho: <strong>"{searchQuery}"</strong> ({filteredCompanies.length} công ty)
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-blue-600 font-bold underline cursor-pointer"
          >
            Xóa tìm kiếm
          </button>
        </div>
      )}

      {/* DANH SÁCH CÔNG TY */}
      <div className="px-3 sm:px-4 py-3 space-y-3">
        {filteredCompanies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-xs border border-slate-200 p-6">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Chưa tìm thấy công ty phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Không có công ty nào phù hợp với từ khóa "{searchQuery}". Bạn có thể thử tìm kiếm từ khóa khác.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-800 transition-colors"
            >
              Hiển Thị Tất Cả Công Ty
            </button>
          </div>
        ) : (
          filteredCompanies.map((company) => (
            <div
              key={company.id}
              onClick={() => onSelectCompany(company)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-blue-400 transition-all cursor-pointer relative group"
            >
              {/* Header card công ty */}
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-xs shrink-0 overflow-hidden"
                    style={{
                      backgroundColor: company.imageUrl ? '#ffffff' : (company.logoBgColor || '#2563eb'),
                      color: company.logoTextColor || '#ffffff',
                    }}
                  >
                    {company.imageUrl ? (
                      <img src={company.imageUrl} alt={company.shortName} className="w-full h-full object-contain p-1" />
                    ) : (
                      company.logoText || 'CTY'
                    )}
                  </div>
                  <div>
                    <h3 className={`font-bold text-slate-900 group-hover:text-blue-700 transition-colors ${
                      largeText ? 'text-base' : 'text-sm'
                    }`}>
                      {company.shortName}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{company.name}</p>
                  </div>
                </div>

                {company.badge && (
                  <span className="shrink-0 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {company.badge}
                  </span>
                )}
              </div>

              {/* Thông tin ngành nghề & địa chỉ */}
              <div className="space-y-1.5 text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="font-medium text-slate-800">
                    {company.industrialPark} - {company.location}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-slate-600 line-clamp-1">{company.industry}</span>
                </div>
                {company.educationReq && (
                  <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-[11px]">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span>{company.educationReq}</span>
                  </div>
                )}
              </div>

              {/* PHẦN THƯỞNG NỔI BẬT: ĐỒNG BỘ TRỰC TIẾP TỪ QUẢN TRỊ VIÊN (GỌN GÀNG, DỄ NHÌN) */}
              {company.bonusProgram?.enabled && Boolean(getCompanyBonusText(company)) && (
                <div className="mb-2.5 px-3 py-1.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2 shadow-2xs group-hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 truncate">
                      Gói thưởng {company.bonusProgram.months?.length || 5} tháng:
                    </span>
                  </div>
                  <span className="text-xs font-black text-red-600 tracking-tight shrink-0">
                    +{getCompanyBonusText(company).replace(/^\+/, '')}
                  </span>
                </div>
              )}

              {/* Thu nhập & Nút hành động */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Thu nhập dự kiến:</span>
                  <span className="text-sm font-black text-red-600">{company.salaryRange}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <a
                    href={getCompanyMapsUrl(company)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs"
                    title="Chỉ đường Google Maps"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="hidden xs:inline">Chỉ đường</span>
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenApplyModal(company);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    Ứng Tuyển
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
