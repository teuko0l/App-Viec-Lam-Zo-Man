import React from 'react';
import { BookOpen, ShieldCheck, DollarSign, HeartHandshake, PhoneCall, ChevronRight } from 'lucide-react';

interface Props {
  onCallHotline: () => void;
}

export const WorkerHandbookScreen: React.FC<Props> = ({ onCallHotline }) => {
  return (
    <div className="flex flex-col min-h-full bg-slate-100 pb-20 p-4 space-y-3">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-5 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-6 h-6 text-blue-200" />
          <h2 className="font-black text-lg">CẨM NANG NGƯỜI LAO ĐỘNG</h2>
        </div>
        <p className="text-xs text-blue-100">
          Hướng dẫn đầy đủ về quyền lợi, cách tính lương tăng ca và thủ tục nhận việc tại Bắc Ninh & Bắc Giang.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>1. Quy Định Tính Tiền Tăng Ca (OT)</span>
        </div>
        <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <p>
            • <strong>Tăng ca ngày thường:</strong> 150% lương giờ cơ bản.
          </p>
          <p>
            • <strong>Tăng ca Chủ Nhật:</strong> 200% lương giờ cơ bản.
          </p>
          <p>
            • <strong>Tăng ca ngày Lễ, Tết:</strong> 300% lương giờ cơ bản + nguyên ngày lương lễ.
          </p>
          <p>
            • <strong>Làm việc ca đêm:</strong> Được cộng thêm ít nhất 30% tiền lương ca ngày.
          </p>
          <p className="text-slate-500 italic text-[11px] bg-slate-50 p-2 rounded-lg">
            Khu vực Bắc Ninh - Bắc Giang (KCN Quế Võ, Yên Phong, VSIP, Quang Châu...): Mức lương cơ bản tại các nhà máy hiện từ 5.200.000đ - 5.800.000đ/tháng.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>2. Quyền Lợi Bảo Hiểm Xã Hội (BHXH)</span>
        </div>
        <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <p>• Được đóng BHXH, BHYT, BHTN theo đúng quy định nhà nước ngay khi ký hợp đồng chính thức.</p>
          <p>• Hưởng chế độ ốm đau, thai sản, tai nạn lao động và rút BHXH một lần sau khi nghỉ việc.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
          <HeartHandshake className="w-4 h-4 text-red-600" />
          <span>3. Cảnh Báo Phòng Tránh Lừa Đảo</span>
        </div>
        <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
          <p className="text-red-600 font-bold">
            TUYỆT ĐỐI KHÔNG đóng bất kỳ khoản tiền nào như: tiền cọc đồng phục, tiền giữ chỗ, phí môi giới!
          </p>
          <p>Tuyển dụng tại ZôMAN hoàn toàn miễn phí 100%. Nhận việc trực tiếp tại cổng công ty.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onCallHotline}
        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
      >
        <PhoneCall className="w-4 h-4" />
        <span>Cần Giải Đáp Thắc Mắc? Gọi Hotline Ngay</span>
      </button>
    </div>
  );
};
