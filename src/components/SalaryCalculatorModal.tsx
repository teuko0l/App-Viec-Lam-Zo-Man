import React, { useState } from 'react';
import { X, Calculator, DollarSign, HelpCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const SalaryCalculatorModal: React.FC<Props> = ({ onClose }) => {
  const [basicSalary, setBasicSalary] = useState<number>(5400000);
  const [otNormalHours, setOtNormalHours] = useState<number>(30); // Giờ tăng ca ngày thường
  const [otSundayHours, setOtSundayHours] = useState<number>(16); // Giờ tăng ca Chủ nhật
  const [attendanceBonus, setAttendanceBonus] = useState<number>(800000);
  const [allowances, setAllowances] = useState<number>(1200000);

  // Tính lương 1 giờ làm việc tiêu chuẩn (26 ngày, 8 tiếng = 208 giờ)
  const hourlyRate = basicSalary / 208;
  const normalOtPay = otNormalHours * hourlyRate * 1.5;
  const sundayOtPay = otSundayHours * hourlyRate * 2.0;
  const totalEstimatedSalary = basicSalary + normalOtPay + sundayOtPay + attendanceBonus + allowances;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Công Cụ Tính Thu Nhập Dự Kiến</h3>
              <p className="text-[11px] text-slate-500">Tính lương cơ bản, tăng ca OT & các khoản phụ cấp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Lương cơ bản (Hợp đồng):</label>
            <input
              type="number"
              step={100000}
              value={basicSalary}
              onChange={(e) => setBasicSalary(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tăng ca ngày thường (h):</label>
              <input
                type="number"
                value={otNormalHours}
                onChange={(e) => setOtNormalHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Hệ số 150%</span>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tăng ca Chủ nhật (h):</label>
              <input
                type="number"
                value={otSundayHours}
                onChange={(e) => setOtSundayHours(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Hệ số 200%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Thưởng chuyên cần:</label>
              <input
                type="number"
                step={50000}
                value={attendanceBonus}
                onChange={(e) => setAttendanceBonus(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tổng các phụ cấp khác:</label>
              <input
                type="number"
                step={50000}
                value={allowances}
                onChange={(e) => setAllowances(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
              />
            </div>
          </div>

          {/* Kết quả tính */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-4 text-white text-center shadow-md mt-2">
            <span className="text-[11px] font-semibold text-rose-100 uppercase tracking-wider block mb-0.5">
              Thu nhập thực nhận ước tính:
            </span>
            <div className="text-2xl font-black">
              {Math.round(totalEstimatedSalary).toLocaleString('vi-VN')} đ/tháng
            </div>
            <p className="text-[10px] text-rose-100 mt-1">
              (Chưa bao gồm giảm trừ đóng BHXH bắt buộc theo quy định)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
        >
          Xong
        </button>
      </div>
    </div>
  );
};
