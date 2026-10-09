export interface Allowance {
  title: string;
  amount: string;
  note?: string;
}

export interface Benefit {
  icon: string;
  title: string;
  description: string;
}

export interface JobPosition {
  title: string;
  vacancies: number;
  salary: string;
  requirements: string[];
  description: string[];
}

export interface Review {
  id: string;
  workerName: string;
  role: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export interface MonthBonus {
  month: number;
  companyBonus: string;
  supplierBonus: string;
  note?: string;
}

export interface BonusProgram {
  enabled: boolean;
  title: string;
  totalBonusText?: string;
  months: MonthBonus[];
  conditionNote?: string;
}

export interface Company {
  id: string;
  name: string;
  shortName: string;
  industry: string;
  industryKey?: 'dien_tu' | 'may_mac' | 'thuc_pham' | 'co_khi' | 'kho_van' | 'van_phong';
  employmentType?: 'pho_thong' | 'thoi_vu' | 'hanh_chinh';
  educationReq?: string;
  contractType?: string;
  logoText: string;
  logoBgColor: string;
  logoTextColor: string;
  imageUrl?: string;
  badge?: string;
  featured?: boolean;
  hidden?: boolean;
  location: string;
  industrialPark: string;
  salaryRange: string;
  minSalary: number;
  maxSalary: number;
  basicSalary: string;
  basicSalaryNum: number;
  attendanceBonus: string;
  attendanceBonusNum: number;
  allowances: Allowance[];
  benefits: Benefit[];
  positions: JobPosition[];
  jobDescription?: string;
  recruitmentPeriod?: string;
  dormitoryInfo?: string;
  mealInfo?: string;
  workShiftInfo?: string;
  transportationInfo?: string;
  mapsUrl?: string;
  bonusProgram?: BonusProgram;
  reviews?: Review[];
}

export interface ConsultationApplication {
  id: string;
  companyId: string;
  companyName: string;
  positionTitle?: string;
  fullName: string;
  phone: string;
  birthYear: number;
  hasCccd: boolean;
  appliedDate: string;
  notes?: string;
  status: 'pending' | 'contacted' | 'interview_scheduled' | 'rejected';
  syncedToGoogleSheet?: boolean;
}

export interface AppSettings {
  appTitle: string;
  appSubtitle: string;
  hotline: string;
  guaranteeTitle: string;
  guaranteeDesc: string;
  botWelcomeMessage: string;
  botSystemPrompt: string;
  customLogo?: string;
  showTopHeader?: boolean;
  googleSheetUrl?: string;
  googleSheetId?: string;
  googleSheetAutoSync?: boolean;
  googleSheetWebhookUrl?: string;
}

export interface ChatFaqItem {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  category: 'salary' | 'dormitory' | 'cccd' | 'overtime' | 'general';
}
