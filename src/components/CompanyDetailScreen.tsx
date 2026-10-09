import React from 'react';
import { Company, JobPosition } from '../types';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  DollarSign,
  ShieldCheck,
  Building2,
  Users,
  Clock,
  Phone,
  CheckCircle2,
  Sparkles,
  Utensils,
  Bus,
  FileText,
  AlertTriangle,
  ClipboardList,
  Navigation,
  Gift,
  Trophy,
  Coins,
} from 'lucide-react';
import { getCompanyMapsUrl } from '../utils/maps';

interface Props {
  company: Company;
  onBack: () => void;
  onApply: (company: Company, position?: JobPosition) => void;
  onCallHotline: () => void;
}

export const CompanyDetailScreen: React.FC<Props> = ({
  company,
  onBack,
  onApply,
  onCallHotline,
}) => {
  return (
    <div className="flex flex-col min-h-full bg-slate-100">
      {/* Top Bar */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <button
          type="button"
          onClick={onBack}
          className="p-1 -ml-1 text-white hover:bg-blue-800 rounded-lg flex items-center gap-1 text-xs font-bold cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại</span>
        </button>
        <span className="font-bold text-sm truncate max-w-[200px]">{company.shortName}</span>
        <button
          type="button"
          onClick={onCallHotline}
          className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-white"
          title="Gọi Hotline"
        >
          <Phone className="w-4 h-4" />
        </button>
      </div>

      {/* Cảnh báo nếu công ty đang tạm ẩn tuyển dụng */}
      {company.hidden && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Doanh nghiệp này hiện đang tạm ngưng đợt tuyển dụng. Quý anh/chị vui lòng tham khảo các công ty khác.</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white p-5 border-b border-slate-200">
        <div className="flex items-center gap-3.5 mb-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm shrink-0 overflow-hidden"
            style={{
              backgroundColor: company.imageUrl ? '#ffffff' : (company.logoBgColor || '#2563eb'),
              color: company.logoTextColor || '#ffffff',
            }}
          >
            {company.imageUrl ? (
              <img src={company.imageUrl} alt={company.shortName} className="w-full h-full object-contain p-1.5" />
            ) : (
              company.logoText
            )}
          </div>
          <div>
            <h1 className="font-black text-lg text-slate-900 leading-snug">{company.name}</h1>
            <p className="text-xs text-blue-600 font-semibold">{company.shortName}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-2">
          {company.badge && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full font-bold text-xs shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{company.badge}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            {company.industrialPark} - {company.location}
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
            {company.industry}
          </span>
        </div>
      </div>

      {/* Thu nhập & Quyền lợi chính */}
      <div className="p-4 space-y-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4">
          <span className="text-xs font-bold text-red-700 uppercase tracking-wider block mb-1">
            Mức thu nhập hàng tháng
          </span>
          <div className="text-2xl font-black text-red-600">{company.salaryRange}</div>
          <p className="text-xs text-slate-600 mt-1">
            Lương cơ bản: <strong className="text-slate-800">{company.basicSalary}</strong> · Chuyên cần:{' '}
            <strong className="text-slate-800">{company.attendanceBonus}</strong>
          </p>
        </div>

        {/* BẢNG CHƯƠNG TRÌNH THƯỞNG NỔI BẬT (THIẾT KẾ RÕ RÀNG, DỄ NHÌN, ĐẦY ĐỦ THÔNG TIN) */}
        {company.bonusProgram && company.bonusProgram.enabled && (() => {
          const monthsList = company.bonusProgram.months || [];
          const monthCount = monthsList.length || 5;

          const parseBonusNum = (val?: string) => {
            if (!val) return 0;
            const num = parseInt(val.replace(/[^\d]/g, ''), 10);
            if (isNaN(num)) return 0;
            if (num < 100) return num * 1000000;
            return num;
          };

          let sumCompany = 0;
          let sumSupplier = 0;
          monthsList.forEach((m) => {
            sumCompany += parseBonusNum(m.companyBonus);
            sumSupplier += parseBonusNum(m.supplierBonus);
          });
          const grandTotal = sumCompany + sumSupplier;
          const displayTotalText = company.bonusProgram.totalBonusText || `${grandTotal.toLocaleString('vi-VN')} đ`;

          return (
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-300/80 shadow-xs space-y-4">
              {/* Header chương trình thưởng */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-[11px] font-bold border border-amber-200">
                    <Gift className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>CHƯƠNG TRÌNH THƯỞNG ĐẶC BIỆT</span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {company.bonusProgram.title || `Thưởng Đi Làm & Giữ Chân (${monthCount} Tháng)`}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Cơ chế: Nhận toàn bộ {displayTotalText} chia đều theo từng tháng khi làm việc đủ chuyên cần
                  </p>
                </div>

                {/* Huy hiệu tổng thưởng nổi bật nhưng trang nhã */}
                <div className="self-start sm:self-auto bg-gradient-to-br from-amber-500 to-orange-600 text-white px-3.5 py-2 rounded-xl shadow-xs text-right sm:text-center shrink-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-100 block">
                    Tổng gói thưởng ({monthCount} tháng)
                  </span>
                  <span className="text-base sm:text-lg font-black tracking-tight block">
                    {displayTotalText}
                  </span>
                </div>
              </div>

              {/* BẢNG CHI TIẾT TỪNG THÁNG - THIẾT KẾ CHUẨN MỌI MÀN HÌNH, KHÔNG BAO GIỜ BỊ MẤT CHỮ */}
              <div className="overflow-x-auto -mx-1 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-left divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-slate-700 font-bold">
                        <tr>
                          <th scope="col" className="py-2.5 px-2.5 text-left font-bold text-slate-700 whitespace-nowrap">
                            Kỳ làm việc
                          </th>
                          <th scope="col" className="py-2.5 px-2 text-right font-bold text-slate-700 whitespace-nowrap">
                            Công ty thưởng
                          </th>
                          <th scope="col" className="py-2.5 px-2 text-right font-bold text-amber-800 whitespace-nowrap">
                            ZôMAN thưởng
                          </th>
                          <th scope="col" className="py-2.5 px-2.5 text-right font-black text-red-600 whitespace-nowrap">
                            Tổng nhận
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {monthsList.map((m) => {
                          const cNum = parseBonusNum(m.companyBonus);
                          const sNum = parseBonusNum(m.supplierBonus);
                          const mTotal = cNum + sNum;
                          return (
                            <tr key={m.month} className="hover:bg-amber-50/20 transition-colors">
                              <td className="py-2.5 px-2.5 text-left">
                                <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-900 rounded font-bold text-[11px] whitespace-nowrap">
                                  Tháng {m.month}
                                </span>
                                {m.note && (
                                  <div className="text-[10px] text-slate-500 font-normal mt-0.5 leading-tight line-clamp-1">
                                    {m.note}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                                {m.companyBonus}
                              </td>
                              <td className="py-2.5 px-2 text-right font-semibold text-amber-700 whitespace-nowrap">
                                {m.supplierBonus}
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-black text-red-600 text-xs sm:text-[13px] whitespace-nowrap">
                                {mTotal > 0 ? `+${mTotal.toLocaleString('vi-VN')} đ` : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-amber-50/80 border-t-2 border-amber-300 font-bold text-slate-900">
                        <tr>
                          <td className="py-2.5 px-2.5 font-extrabold uppercase text-[11px] text-amber-950 whitespace-nowrap">
                            Tổng ({monthCount}T)
                          </td>
                          <td className="py-2.5 px-2 text-right text-blue-800 font-bold whitespace-nowrap">
                            {sumCompany.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-2 text-right text-amber-800 font-bold whitespace-nowrap">
                            {sumSupplier.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-black text-red-600 text-xs sm:text-sm whitespace-nowrap">
                            {grandTotal.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* TỔNG KẾT PHÂN BỔ 3 CỘT RÕ RÀNG */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Công ty thưởng:</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800">
                    {sumCompany.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-700 font-medium block">ZôMAN thưởng:</span>
                  <span className="text-xs sm:text-sm font-black text-amber-700">
                    {sumSupplier.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-red-600 font-bold block">Tổng trọn gói:</span>
                  <span className="text-xs sm:text-sm font-black text-red-600">
                    {displayTotalText}
                  </span>
                </div>
              </div>

              {/* CƠ CHẾ NHẬN THƯỞNG */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-slate-700 space-y-1">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-slate-900 font-bold">Cơ chế nhận thưởng: </strong>
                    <span>
                      {company.bonusProgram.conditionNote || `Tổng thưởng trong ${monthCount} tháng người lao động sẽ nhận được toàn bộ số tiền thưởng đó (${displayTotalText}). Tiền thưởng được tính gộp chi trả theo từng tháng cùng kỳ lương khi người lao động đi làm đủ chuyên cần.`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Mô tả công việc chi tiết */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span>Mô Tả Công Việc Chi Tiết</span>
            </span>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
              Đi làm ngay
            </span>
          </h3>

          {company.jobDescription ? (
            <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              {company.jobDescription}
            </div>
          ) : (
            <div className="text-xs text-slate-700 space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Thao tác sản xuất, lắp ráp và gia công linh kiện theo sự phân công và hướng dẫn của tổ trưởng.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Kiểm tra ngoại quan sản phẩm, dán tem nhãn, đóng gói sản phẩm hoàn thiện vào thùng xuất khẩu.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Làm việc trong môi trường nhà xưởng sạch sẽ, máy lạnh điều hòa thoáng mát, không yêu cầu kinh nghiệm (được hướng dẫn tận tình từ ngày đầu).</span>
              </div>
            </div>
          )}
        </div>

        {/* Phụ cấp chi tiết */}
        {Array.isArray(company.allowances) && company.allowances.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Các Khoản Phụ Cấp & Trợ Cấp</span>
            </h3>
            <div className="divide-y divide-slate-100">
              {company.allowances.map((al, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">{al?.title || 'Phụ cấp'}</span>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {al?.amount || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chế độ đãi ngộ */}
        {Array.isArray(company.benefits) && company.benefits.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Chế Độ Đãi Ngộ & Quyền Lợi</span>
            </h3>
            <div className="space-y-2">
              {company.benefits.map((bf, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-800">{bf?.title || 'Quyền lợi'}</div>
                    <div className="text-slate-500">{bf?.description || ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chính sách làm việc & sinh hoạt thực tế */}
        {(company.dormitoryInfo || company.mealInfo || company.workShiftInfo || company.transportationInfo || company.contractType || company.educationReq) && (
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
            <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Chính Sách & Điều Kiện Làm Việc</span>
            </h3>

            {company.workShiftInfo && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-xs">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Ca làm việc & Tăng ca:</span>
                  <span className="text-slate-600">{company.workShiftInfo}</span>
                </div>
              </div>
            )}

            {company.dormitoryInfo && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-xs">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Ký túc xá (Ăn ở):</span>
                  <span className="text-slate-600">{company.dormitoryInfo}</span>
                </div>
              </div>
            )}

            {company.mealInfo && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-xs">
                <Utensils className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Chế độ Cơm ca:</span>
                  <span className="text-slate-600">{company.mealInfo}</span>
                </div>
              </div>
            )}

            {company.transportationInfo && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2 text-xs">
                <Bus className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">Xe đưa đón công nhân:</span>
                  <span className="text-slate-600">{company.transportationInfo}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              {company.contractType && (
                <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-slate-500 block">Hợp đồng:</span>
                  <strong className="text-slate-800">{company.contractType}</strong>
                </div>
              )}
              {company.educationReq && (
                <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100">
                  <span className="text-slate-500 block">Bằng cấp:</span>
                  <strong className="text-slate-800">{company.educationReq}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vị trí tuyển dụng */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-2.5 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Vị Trí Đang Tuyển Dụng</span>
          </h3>
          <div className="space-y-3">
            {(Array.isArray(company.positions) && company.positions.length > 0 ? company.positions : [
              { title: 'Công nhân sản xuất', vacancies: 50, salary: company.salaryRange, requirements: [], description: [] }
            ]).map((pos, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-xs text-slate-900">{pos.title}</h4>
                  <span className="text-[11px] font-bold text-red-600">{pos.salary}</span>
                </div>
                <div className="text-[11px] text-slate-500 mb-2">Chỉ tiêu: {pos.vacancies || 10} người</div>
                <button
                  type="button"
                  disabled={Boolean(company.hidden)}
                  onClick={() => onApply(company, pos)}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold shadow-xs ${
                    company.hidden
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {company.hidden ? 'Tạm Ngưng Tuyển Dụng' : 'Nộp Hồ Sơ Vị Trí Này'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Vị trí nhà máy & Chỉ đường Google Maps */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-500" />
              <span>Vị Trí & Bản Đồ Đi Lại</span>
            </h3>
            <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
              Google Maps
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
            <div className="font-bold text-slate-900">{company.name}</div>
            <div className="text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>{company.industrialPark} · {company.location}</span>
            </div>
            {company.mapsUrl ? (
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Vị trí chính xác do nhà máy cung cấp</span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 pt-0.5">
                Tự động định vị theo tên công ty và khu công nghiệp
              </div>
            )}
          </div>

          <a
            href={getCompanyMapsUrl(company)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer group"
          >
            <Navigation className="w-4 h-4 text-white group-hover:rotate-45 transition-transform" />
            <span>Chỉ đường Google Maps</span>
          </a>
        </div>
      </div>

      {/* Bottom Sticky Action Bar - Luôn nằm gọn gàng 100% bên trong khung điện thoại */}
      <div className="sticky bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-2.5 sm:p-3 flex items-center gap-2 w-full shadow-lg z-40 mt-auto">
        <button
          type="button"
          onClick={onCallHotline}
          className="flex-1 py-2.5 px-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <span className="truncate">Hotline Tuyển Dụng</span>
        </button>
        <button
          type="button"
          disabled={Boolean(company.hidden)}
          onClick={() => onApply(company)}
          className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all ${
            company.hidden
              ? 'bg-slate-300 text-slate-600 cursor-not-allowed shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white cursor-pointer'
          }`}
        >
          <span className="truncate">{company.hidden ? 'Tạm Ngưng Tuyển' : 'Đăng Ký Đi Làm Ngay'}</span>
        </button>
      </div>
    </div>
  );
};
