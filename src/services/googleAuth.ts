import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { firebaseApp } from './firebase';

// Sử dụng instance Firebase App hiện có
export const auth = getAuth(firebaseApp);

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cờ kiểm tra tiến trình đăng nhập
let isSigningIn = false;
// Token được lưu trong bộ nhớ (In-memory caching - TUYỆT ĐỐI không lưu vào localStorage/sessionStorage)
let cachedAccessToken: string | null = null;

type AuthChangeListener = (user: User | null, token: string | null) => void;
const authListeners = new Set<AuthChangeListener>();

function notifyAuthListeners() {
  const current = auth.currentUser;
  authListeners.forEach((fn) => {
    try {
      fn(current, cachedAccessToken);
    } catch (e) {
      console.warn('Lỗi listener google auth:', e);
    }
  });
}

/**
 * Đăng ký lắng nghe thay đổi trạng thái Google User & Token trong bộ nhớ
 */
export const onGoogleAuthChange = (listener: AuthChangeListener): (() => void) => {
  authListeners.add(listener);
  // Gọi ngay tức thì với trạng thái hiện tại
  listener(auth.currentUser, cachedAccessToken);
  return () => {
    authListeners.delete(listener);
  };
};

// Khởi tạo Auth state listener khi tải ứng dụng
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        notifyAuthListeners();
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        notifyAuthListeners();
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      notifyAuthListeners();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Đăng nhập Google với quyền Google Sheets (phải được gọi từ hành vi click của người dùng)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không nhận được mã truy cập (access token) từ Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    notifyAuthListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Lỗi đăng nhập Google Sheets:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  notifyAuthListeners();
};
