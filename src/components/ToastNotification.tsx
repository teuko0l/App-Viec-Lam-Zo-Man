import React, { useState, useEffect } from 'react';
import { CheckCircle2, Bell, X, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'live_simulation';
  title: string;
  message: string;
  subInfo?: string;
  timeAgo?: string;
}

interface Props {
  activeToast: ToastData | null;
  onDismiss: () => void;
  enableLiveSimulation?: boolean;
}

// Danh sách các thông báo giả lập hoạt động tuyển dụng thực tế tại Bắc Ninh - Bắc Giang
const SIMULATED_ACTIVITIES = [
  {
    worker: 'Anh Tuấn (Hiệp Hòa, BG)',
    company: 'Foxconn Quang Châu',
    role: 'Lắp ráp điện tử',
    time: 'Vừa xong',
  },
  {
    worker: 'Chị Lan (Yên Phong, BN)',
    company: 'Samsung Electronics Yên Phong',
    role: 'Đăng ký KTX 5 sao & Đi làm ngay',
    time: '1 phút trước',
  },
  {
    worker: 'Anh Hưng (Việt Yên, BG)',
    company: 'Shopee Express VSIP',
    role: 'Phân loại kho hàng thời vụ',
    time: '2 phút trước',
  },
  {
    worker: 'Chị Mai (Quế Võ, BN)',
    company: 'Luxshare Vân Trung',
    role: 'Thao tác chuyền AirPods',
    time: '3 phút trước',
  },
  {
    worker: 'Anh Đức (Lục Nam, BG)',
    company: 'Pegatron Bắc Giang',
    role: 'Hành chính kho & Kiểm kê',
    time: '4 phút trước',
  },
  {
    worker: 'Chị Thảo (Tiên Du, BN)',
    company: 'Goertek Quế Võ',
    role: 'Thời vụ mùa vụ nhận việc trong ngày',
    time: '5 phút trước',
  },
];

export const ToastNotification: React.FC<Props> = ({
  activeToast,
  onDismiss,
  enableLiveSimulation = true,
}) => {
  const [liveToast, setLiveToast] = useState<ToastData | null>(null);
  const [isLiveVisible, setIsLiveVisible] = useState(false);

  // Hiệu ứng định kỳ hiển thị thông báo tuyển dụng giả lập sống động
  useEffect(() => {
    if (!enableLiveSimulation) return;

    let index = 0;
    const interval = setInterval(() => {
      // Chỉ hiện thông báo giả lập nếu không có thông báo người dùng thao tác
      if (!activeToast) {
        const item = SIMULATED_ACTIVITIES[index % SIMULATED_ACTIVITIES.length];
        index++;

        setLiveToast({
          id: 'sim-' + Date.now(),
          type: 'live_simulation',
          title: `${item.worker}`,
          message: `Vừa ứng tuyển thành công: ${item.company}`,
          subInfo: item.role,
          timeAgo: item.time,
        });
        setIsLiveVisible(true);

        // Tự động ẩn sau 5.5 giây
        setTimeout(() => {
          setIsLiveVisible(false);
        }, 5500);
      }
    }, 18000); // 18 giây hiển thị 1 lần

    // Chạy lần đầu sau 6 giây
    const firstTimer = setTimeout(() => {
      if (!activeToast) {
        const item = SIMULATED_ACTIVITIES[0];
        setLiveToast({
          id: 'sim-init',
          type: 'live_simulation',
          title: item.worker,
          message: `Vừa ứng tuyển thành công: ${item.company}`,
          subInfo: item.role,
          timeAgo: item.time,
        });
        setIsLiveVisible(true);
        setTimeout(() => setIsLiveVisible(false), 5500);
      }
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(firstTimer);
    };
  }, [enableLiveSimulation, activeToast]);

  // Thông báo người dùng vừa nộp hồ sơ (Ưu tiên cao nhất)
  if (activeToast) {
    return (
      <div className="absolute top-3 inset-x-3 z-50 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 ring-2 ring-emerald-500/20 flex items-start gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-extrabold text-xs text-white">{activeToast.title}</span>
              <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                Thành công
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium leading-snug">{activeToast.message}</p>
            {activeToast.subInfo && (
              <p className="text-[11px] text-emerald-300 mt-1 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{activeToast.subInfo}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Thông báo giả lập người tìm việc khác vừa nộp hồ sơ (Tạo cảm giác sôi động)
  if (isLiveVisible && liveToast) {
    return (
      <div className="absolute top-3 inset-x-3 z-40 animate-in slide-in-from-top-3 fade-in duration-300 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md text-slate-900 p-2.5 sm:p-3 rounded-2xl shadow-xl border border-blue-200 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-blue-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h5 className="font-extrabold text-xs text-slate-900 truncate">{liveToast.title}</h5>
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">{liveToast.timeAgo}</span>
            </div>
            <p className="text-[11px] text-blue-700 font-semibold truncate leading-tight">
              {liveToast.message}
            </p>
            {liveToast.subInfo && (
              <p className="text-[10px] text-slate-500 truncate">{liveToast.subInfo}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsLiveVisible(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
