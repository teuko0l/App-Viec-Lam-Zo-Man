import React from 'react';
import { Lock, Bookmark, Home, BookOpen } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  chatComponent?: React.ReactNode;
  onOpenChat?: () => void;
  isMobileDeviceView?: boolean;
  onToggleDeviceView?: () => void;
  largeText?: boolean;
  onToggleLargeText?: () => void;
  activeTab: 'jobs' | 'applied' | 'handbook' | 'admin' | 'express' | 'calculator';
  onChangeTab: (tab: 'jobs' | 'applied' | 'handbook' | 'admin') => void;
  appliedCount: number;
  isAdminLoggedIn?: boolean;
  hideBottomNav?: boolean;
  customLogo?: string;
}

export const MobileDeviceFrame: React.FC<Props> = ({
  children,
  chatComponent,
  isMobileDeviceView = true,
  activeTab,
  onChangeTab,
  appliedCount,
  hideBottomNav = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-200/90 flex flex-col items-center justify-center">
      {/* Main Content Area */}
      <main className="w-full flex-1 flex justify-center py-0 sm:py-3 px-0 sm:px-4">
        <div
          className={`w-full bg-slate-100 flex flex-col transition-all duration-300 relative ${
            isMobileDeviceView
              ? 'max-w-md sm:rounded-[40px] sm:shadow-2xl sm:border-[8px] sm:border-slate-800 overflow-hidden h-[100dvh] sm:h-[calc(100vh-2rem)] sm:max-h-[860px]'
              : 'max-w-4xl rounded-2xl shadow-lg border border-slate-300 overflow-hidden h-[100dvh] sm:h-[calc(100vh-2rem)] max-h-[900px]'
          }`}
        >
          {/* App Body */}
          <div className="flex-1 overflow-y-auto relative">{children}</div>

          {/* Bong bóng chat AI nằm gọn bên trong khung điện thoại */}
          {chatComponent}

          {/* Bottom Navigation */}
          {!hideBottomNav && (
            <nav className="bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around sticky bottom-0 z-40">
              <button
                type="button"
                onClick={() => onChangeTab('jobs')}
                className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'jobs' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">Việc Làm</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('handbook')}
                className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'handbook' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">Cẩm Nang</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('applied')}
                className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors cursor-pointer relative ${
                  activeTab === 'applied' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">Hồ Sơ</span>
                {appliedCount > 0 && (
                  <span className="absolute top-0 right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                    {appliedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onChangeTab('admin')}
                className={`flex flex-col items-center py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'admin' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span className="text-[10px] mt-0.5">Quản Trị</span>
              </button>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
};
