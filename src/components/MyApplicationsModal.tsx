import React from 'react';
import { ConsultationApplication } from '../types';
import { X, Clock, CheckCircle2, PhoneCall, AlertCircle, Trash2 } from 'lucide-react';

interface Props {
  applications: ConsultationApplication[];
  onClose: () => void;
  onDeleteApplication: (id: string) => void;
  onCallHotline: () => void;
}

export const MyApplicationsModal: React.FC<Props> = ({
  applications,
  onClose,
  onDeleteApplication,
  onCallHotline,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Hồ Sơ Đã Đăng Ký Của Bạn</h3>
            <p className="text-[11px] text-slate-500">Danh sách các công ty bạn đã gửi yêu cầu tuyển dụng</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {applications.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Bạn chưa gửi đăng ký ứng tuyển nào</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hãy chọn công ty mong muốn trên màn hình chính và bấm "Ứng tuyển"
              </p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl relative">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-bold text-xs text-slate-900">{app.companyName}</h4>
                  <button
                    type="button"
                    onClick={() => onDeleteApplication(app.id)}
                    className="text-slate-400 hover:text-red-500 p-0.5"
                    title="Xóa hồ sơ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-blue-600 font-medium mb-1.5">{app.positionTitle}</div>
                <div className="text-[11px] text-slate-600 space-y-0.5 mb-2">
                  <div>Họ tên: {app.fullName} ({app.phone})</div>
                  <div>Ngày đăng ký: {app.appliedDate}</div>
                  {app.notes && <div className="text-slate-500 italic">Ghi chú: {app.notes}</div>}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Đã chuyển bộ phận nhân sự
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCallHotline}
            className="flex-1 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-200 hover:bg-red-100"
          >
            Hotline Hỗ Trợ Nhanh
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700"
          >
            Đóng Lại
          </button>
        </div>
      </div>
    </div>
  );
};
