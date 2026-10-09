import { ChatFaqItem } from '../types';

export const DEFAULT_FAQ_ITEMS: ChatFaqItem[] = [
  {
    id: 'faq-1',
    question: 'Chưa có CCCD gắn chip hoặc chỉ có giấy hẹn có đi làm được không?',
    keywords: ['cccd', 'can cuoc', 'chung minh', 'cmnd', 'giay hen', 'mat cccd', 'vneid', 'ho so'],
    answer: 'Hoàn toàn ĐƯỢC! Nhiều công ty điện tử lớn tại KCN Quế Võ, Yên Phong, Quang Châu, Vân Trung chấp nhận định danh VNeID mức 2, CCCD cũ hoặc giấy hẹn lấy CCCD mới để nhận việc ngay.',
    category: 'cccd',
  },
  {
    id: 'faq-2',
    question: 'Ký túc xá và phòng trọ có bao ăn ở miễn phí không?',
    keywords: ['ky tuc xa', 'ktx', 'an o', 'phong tro', 'bao an', 'cho o', 'dieu hoa', 'o lai'],
    answer: 'Hầu hết các công ty như Foxconn, Samsung, Luxshare đều có Ký túc xá máy lạnh, wifi, nước nóng lạnh miễn phí ngay gần nhà máy, và bao cơm ca 2-3 bữa tại căng-tin sạch sẽ. Một số công ty hỗ trợ tiền phụ cấp nhà ở 500.000đ - 1.200.000đ/tháng nếu ở ngoài.',
    category: 'dormitory',
  },
  {
    id: 'faq-3',
    question: 'Cách tính tiền làm thêm giờ (tăng ca OT) như thế nào?',
    keywords: ['tang ca', 'ot', 'luong', 'lam them', 'them gio', 'tien luong', 'gio lam'],
    answer: 'Theo quy định: Tăng ca ngày thường = 150% lương giờ; Tăng ca Chủ Nhật = 200% lương giờ; Tăng ca ngày Lễ, Tết = 300% lương giờ. Ca đêm được cộng thêm ít nhất 30% lương.',
    category: 'salary',
  },
  {
    id: 'faq-4',
    question: 'Có mất tiền phí dịch vụ hay tiền cọc giữ chỗ khi nộp hồ sơ không?',
    keywords: ['phi', 'tien coc', 'thu phi', 'mat tien', 'moi gioi', 'lua dao', 'giu cho', 'dong phuc'],
    answer: 'TUYỆT ĐỐI KHÔNG! Việc làm tại ZôMAN hoàn toàn 100% MIỄN PHÍ cho người lao động. Không thu tiền cọc, tiền đồng phục hay phí môi giới. Nhận việc trực tiếp tại cổng công ty.',
    category: 'general',
  },
  {
    id: 'faq-5',
    question: 'Độ tuổi nào được nhận vào làm tại các nhà máy?',
    keywords: ['tuoi', 'do tuoi', 'bao nhieu tuoi', 'lon tuoi', 'nam sinh'],
    answer: 'Độ tuổi tuyển dụng phổ biến từ đủ 18 tuổi đến 45 tuổi (cả Nam và Nữ). Một số xưởng đóng gói, may mặc hoặc thời vụ nhận lao động đến 48-50 tuổi có sức khỏe tốt.',
    category: 'general',
  },
  {
    id: 'faq-6',
    question: 'Không có bằng cấp hoặc chưa từng đi làm công ty có được nhận không?',
    keywords: ['bang cap', 'kinh nghiem', 'chua co kinh nghiem', 'khong co bang', 'hoc van'],
    answer: 'Được nhận 100%! Việc làm phổ thông và thời vụ không yêu cầu bằng cấp hay kinh nghiệm. Khi vào công ty, bạn sẽ được hướng dẫn đào tạo thao tác máy miễn phí từ 1-3 ngày có tính lương.',
    category: 'general',
  },
  {
    id: 'faq-7',
    question: 'Việc làm thời vụ có được lấy lương tuần không?',
    keywords: ['thoi vu', 'ung luong', 'luong tuan', 'lay luong', 'hang tuan'],
    answer: 'Có! Các kho TMĐT như Shopee Express VSIP Bắc Ninh và dự án vụ mùa hỗ trợ ứng lương hàng tuần hoặc thanh toán tiền mặt theo đợt linh hoạt cho anh/chị cần chi tiêu gấp.',
    category: 'salary',
  },
  {
    id: 'faq-8',
    question: 'Có xe đưa đón công nhân đi làm không?',
    keywords: ['xe dua don', 'xe bus', 'di lai', 'tuyen duong', 'ben xe'],
    answer: 'Các nhà máy lớn có hệ thống xe buýt đưa đón miễn phí theo tuyến qua nhiều huyện của Bắc Ninh (Quế Võ, Yên Phong, Thuận Thành, Tiên Du...) và Bắc Giang (Việt Yên, Hiệp Hòa, Tân Yên...). Ngoài ra còn có xe đón ứng viên từ các bến xe về nhận việc.',
    category: 'dormitory',
  },
];
