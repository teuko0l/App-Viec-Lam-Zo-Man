import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  deleteDoc,
  collection,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Company, AppSettings, ConsultationApplication, ChatFaqItem } from '../types';

// Khởi tạo Firebase App & Firestore Database đa nền tảng
export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(
  firebaseApp,
  (firebaseConfig as any).firestoreDatabaseId || '(default)'
);

// Kiểm tra kết nối máy chủ Firestore khi khởi động (theo chuẩn quy định)
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline fallback active:', error.message);
    }
    return false;
  }
}
// Chạy kiểm tra kết nối ngay khi khởi động
testFirestoreConnection().catch(() => {});

// ============================================================================
// 1. CÔNG TY TUYỂN DỤNG (COMPANIES) - ĐỒNG BỘ THỜI GIAN THỰC MỌI THIẾT BỊ
// ============================================================================

export function subscribeCompanies(
  onData: (companies: Company[]) => void,
  initialFallback: Company[]
): Unsubscribe {
  const colRef = collection(db, 'companies');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Lần đầu tiên cơ sở dữ liệu trống, nạp toàn bộ danh sách công ty mẫu lên Cloud Firestore
        seedInitialCompanies(initialFallback).catch(console.error);
        onData(initialFallback);
      } else {
        const list: Company[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Company);
        });
        // Sắp xếp giữ thứ tự ổn định
        onData(list);
      }
    },
    (error) => {
      console.error('Lỗi lắng nghe đồng bộ công ty từ Firestore:', error);
      onData(initialFallback);
    }
  );
}

export async function seedInitialCompanies(companies: Company[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const c of companies) {
      const ref = doc(db, 'companies', c.id);
      batch.set(ref, c);
    }
    await batch.commit();
  } catch (err) {
    console.error('Lỗi khi nạp dữ liệu công ty ban đầu lên Firestore:', err);
  }
}

export async function saveCompanyToCloud(company: Company): Promise<void> {
  const ref = doc(db, 'companies', company.id);
  const data = JSON.parse(
    JSON.stringify({
      ...company,
      updatedAt: new Date().toISOString(),
    })
  );
  await setDoc(ref, data);
}

export async function deleteCompanyFromCloud(companyId: string): Promise<void> {
  const ref = doc(db, 'companies', companyId);
  await deleteDoc(ref);
}

// ============================================================================
// 2. CÀI ĐẶT HỆ THỐNG & LOGO ZÔMAN TOÀN CỤC (APP SETTINGS)
// ============================================================================

export function subscribeSettings(
  onData: (settings: AppSettings) => void,
  initialFallback: AppSettings
): Unsubscribe {
  const ref = doc(db, 'settings', 'app');
  return onSnapshot(
    ref,
    (docSnap) => {
      if (!docSnap.exists()) {
        saveSettingsToCloud(initialFallback).catch(console.error);
        onData(initialFallback);
      } else {
        const data = docSnap.data() as AppSettings;
        onData({
          ...initialFallback,
          ...data,
          // Giữ phụ đề địa bàn theo chuẩn nếu chưa có
          appSubtitle: data.appSubtitle || initialFallback.appSubtitle,
        });
      }
    },
    (error) => {
      console.error('Lỗi lắng nghe đồng bộ Cài đặt từ Firestore:', error);
      onData(initialFallback);
    }
  );
}

export async function saveSettingsToCloud(settings: AppSettings): Promise<void> {
  const ref = doc(db, 'settings', 'app');
  await setDoc(
    ref,
    {
      ...settings,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// ============================================================================
// 3. DANH SÁCH ỨNG VIÊN ĐĂNG KÝ (APPLICATIONS)
// ============================================================================

export function subscribeApplications(
  onData: (apps: ConsultationApplication[]) => void
): Unsubscribe {
  const colRef = collection(db, 'applications');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ConsultationApplication[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ConsultationApplication);
      });
      // Sắp xếp hồ sơ mới nhất lên đầu
      list.sort((a, b) => (b.id > a.id ? 1 : -1));
      onData(list);
    },
    (error) => {
      console.error('Lỗi lắng nghe hồ sơ ứng viên từ Firestore:', error);
    }
  );
}

export async function saveApplicationToCloud(
  app: ConsultationApplication
): Promise<void> {
  const ref = doc(db, 'applications', app.id);
  await setDoc(ref, {
    ...app,
    createdAt: new Date().toISOString(),
  });
}

export async function updateApplicationStatusInCloud(
  id: string,
  status: ConsultationApplication['status']
): Promise<void> {
  const ref = doc(db, 'applications', id);
  await setDoc(ref, { status, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function markApplicationSyncedInCloud(
  id: string,
  synced: boolean
): Promise<void> {
  const ref = doc(db, 'applications', id);
  await setDoc(ref, { syncedToGoogleSheet: synced, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function deleteApplicationFromCloud(id: string): Promise<void> {
  const ref = doc(db, 'applications', id);
  await deleteDoc(ref);
}

// ============================================================================
// 4. BỘ CÂU HỎI AI CONSULTANT (FAQ KNOWLEDGE BASE)
// ============================================================================

export function subscribeFaqList(
  onData: (faqs: ChatFaqItem[]) => void,
  initialFallback: ChatFaqItem[]
): Unsubscribe {
  const colRef = collection(db, 'faq');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        seedInitialFaq(initialFallback).catch(console.error);
        onData(initialFallback);
      } else {
        const list: ChatFaqItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ChatFaqItem);
        });
        onData(list);
      }
    },
    (error) => {
      console.error('Lỗi lắng nghe FAQ từ Firestore:', error);
      onData(initialFallback);
    }
  );
}

export async function seedInitialFaq(faqs: ChatFaqItem[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const f of faqs) {
      const ref = doc(db, 'faq', f.id);
      batch.set(ref, f);
    }
    await batch.commit();
  } catch (err) {
    console.error('Lỗi khi nạp bộ câu hỏi AI lên Firestore:', err);
  }
}

export async function saveFaqItemToCloud(item: ChatFaqItem): Promise<void> {
  const ref = doc(db, 'faq', item.id);
  await setDoc(ref, item);
}

export async function saveAllFaqsToCloud(faqs: ChatFaqItem[]): Promise<void> {
  const batch = writeBatch(db);
  for (const f of faqs) {
    const ref = doc(db, 'faq', f.id);
    batch.set(ref, f);
  }
  await batch.commit();
}

export async function deleteFaqItemFromCloud(id: string): Promise<void> {
  const ref = doc(db, 'faq', id);
  await deleteDoc(ref);
}

// ============================================================================
// 5. TÀI KHOẢN & MẬT KHẨU QUẢN TRỊ VIÊN (ADMIN CREDENTIALS)
// ============================================================================

export interface CloudAdminCredentials {
  username: string;
  password: string;
  recoveryKey: string;
}

export function subscribeAdminCredentials(
  onData: (creds: CloudAdminCredentials) => void,
  defaultFallback: CloudAdminCredentials
): Unsubscribe {
  const ref = doc(db, 'system', 'credentials');
  return onSnapshot(
    ref,
    (docSnap) => {
      if (!docSnap.exists()) {
        saveAdminCredentialsToCloud(defaultFallback).catch(console.error);
        onData(defaultFallback);
      } else {
        const data = docSnap.data() as CloudAdminCredentials;
        onData(data);
      }
    },
    (error) => {
      console.error('Lỗi lắng nghe thông tin đăng nhập quản trị từ Firestore:', error);
      onData(defaultFallback);
    }
  );
}

export async function saveAdminCredentialsToCloud(
  creds: CloudAdminCredentials
): Promise<void> {
  const ref = doc(db, 'system', 'credentials');
  await setDoc(ref, {
    ...creds,
    updatedAt: new Date().toISOString(),
  });
}
