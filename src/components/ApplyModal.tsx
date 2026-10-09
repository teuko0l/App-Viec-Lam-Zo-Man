import React, { useState } from 'react';
import { Company, JobPosition, ConsultationApplication } from '../types';
import { X, CheckCircle, ShieldCheck, Phone, User, Calendar, FileText } from 'lucide-react';

interface Props {
  company: Company;
  position?: JobPosition;
  onClose: () => void;
  onSubmit: (app: ConsultationApplication) => void;
}

export const ApplyModal: React.FC<Props> = ({
  company,
  position,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState<number>(2000);
  const [hasCccd, setHasCccd] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    const newApp: ConsultationApplication = {
      id: 'app-' + Date.now(),
      companyId: company.id,
      companyName: company.shortName,
      positionTitle: position?.title || 'Công nhân sản xuất',
      fullName: fullName.trim(),
      phone: phone.trim(),
      birthYear,
      hasCccd,
      appliedDate: new Date().toLocaleDateString('vi-VN'),
      notes: notes.trim(),
      status: 'pending',
    };

    onSubmit(newApp);
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Đăng Ký Tư Vấn Đi Làm Ngay</h3>
            <p className="text-xs text-blue-600 font-medium">{company.shortName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-6 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h4 className="font-extrabold text-base text-slate-900">Đăng Ký Thành Công!</h4>
            <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
              Chuyên viên tuyển dụng của {company.shortName} sẽ gọi điện tư vấn và hẹn lịch nhận việc cho anh/chị trong vòng 30 phút.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Hoàn Tất
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-3 space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cam kết bảo mật thông tin & 100% không thu phí ứng viên.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên của bạn:</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ (Zalo):</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Năm sinh:</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min={1960}
                    max={2008}
                    value={birthYear}
                    onChange={(e) => setBirthYear(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giấy tờ tùy thân:</label>
                <select
                  value={hasCccd ? 'yes' : 'no'}
                  onChange={(e) => setHasCccd(e.target.value === 'yes')}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="yes">Đã có CCCD</option>
                  <option value="no">Chỉ có Giấy hẹn / VNeID</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú (nhu cầu ở KTX, đi làm ngay...):</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Ví dụ: Cần ở KTX, muốn đi làm vào thứ 2 tới..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
            >
              Gửi Thông Tin Đăng Ký
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
