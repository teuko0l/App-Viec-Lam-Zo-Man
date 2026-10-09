import React, { useState } from 'react';
import { Company, ConsultationApplication } from '../types';
import { Zap, CheckCircle2, MapPin, Phone, User, Calendar, ShieldCheck, Bus } from 'lucide-react';

interface Props {
  companies: Company[];
  onSubmitApplication: (app: ConsultationApplication) => void;
  onCallHotline: () => void;
}

export const ExpressJobScreen: React.FC<Props> = ({
  companies,
  onSubmitApplication,
  onCallHotline,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState<number>(2001);
  const [preferredRegion, setPreferredRegion] = useState('Bắc Ninh');
  const [needDorm, setNeedDorm] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    const newApp: ConsultationApplication = {
      id: 'express-' + Date.now(),
      companyId: 'express-dispatch',
      companyName: `[HỎA TỐC] ${preferredRegion}`,
      positionTitle: 'Đi Làm Ngay 24H (Ưu Tiên Phỏng Vấn Sớm)',
      fullName,
      phone,
      birthYear,
      hasCccd: true,
      appliedDate: new Date().toLocaleDateString('vi-VN'),
      notes: `Đăng ký Hỏa Tốc. Khu vực mong muốn: ${preferredRegion}. Nhu cầu KTX: ${needDorm ? 'Cần KTX' : 'Tự túc'}`,
      status: 'pending',
    };

    onSubmitApplication(newApp);
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-100 pb-20 p-4">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-3xl p-5 shadow-md mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-6 h-6 text-yellow-200 fill-yellow-200" />
          <h2 className="font-black text-lg">ĐI LÀM NGAY TRONG 24H</h2>
        </div>
        <p className="text-xs text-orange-100">
          Chỉ cần CCCD - Không yêu cầu bằng cấp hay kinh nghiệm. Xe đưa đón tận nơi tại các bến xe Bắc Ninh, Bắc Giang.
        </p>
      </div>

      {submitted ? (
        <div className="bg-white rounded-3xl p-6 text-center shadow-sm border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-extrabold text-base text-slate-900">Đã Tiếp Nhận Hồ Sơ Hỏa Tốc!</h3>
          <p className="text-xs text-slate-600 mt-1">
            Đội ngũ điều phối viên sẽ gọi lại cho bạn trong vòng 15 phút để sắp xếp xe đón và phòng ở ký túc xá.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
          >
            Đăng Ký Thêm
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-3">
          <h3 className="font-bold text-sm text-slate-800 pb-2 border-b border-slate-100">
            Thông Tin Ứng Tuyển Nhanh
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên của bạn:</label>
            <input
              type="text"
              required
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ:</label>
            <input
              type="tel"
              required
              placeholder="0912 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Năm sinh:</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Khu vực mong muốn:</label>
              <select
                value={preferredRegion}
                onChange={(e) => setPreferredRegion(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              >
                <option value="Bắc Ninh">Bắc Ninh (Yên Phong, Quế Võ)</option>
                <option value="Bắc Giang">Bắc Giang (Quang Châu, Vân Trung)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="dormCheck"
              checked={needDorm}
              onChange={(e) => setNeedDorm(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="dormCheck" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Cần ở ký túc xá máy lạnh miễn phí
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-extrabold rounded-xl text-xs shadow-md mt-2 cursor-pointer active:scale-95 transition-all"
          >
            Gửi Hồ Sơ Đi Làm Ngay
          </button>
        </form>
      )}
    </div>
  );
};
