import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  GitFork,
  MapPin,
  ScrollText,
} from 'lucide-react';
import { Footer } from '@/components/genealogy/header';
export default function Page() {
  return (
    <main id="main">
      <section className="history-hero">
        <img src="/heritage-hero.png" alt="" />
        <div className="container">
          <div className="eyebrow">GIA PHẢ · KÝ ỨC · CỘI NGUỒN</div>
          <h1>
            Lịch sử họ <span>Nguyễn Bá</span>
          </h1>
          <p>Những thế hệ nối tiếp. Những giá trị còn mãi.</p>
          <span className="history-location">
            <MapPin size={17} /> Nam Định <span>·</span> Tư liệu minh họa
          </span>
        </div>
      </section>
      <div className="container history-body">
        <aside className="history-index">
          <span>NỘI DUNG</span>
          <a href="#origin">
            01 <span>Cội nguồn</span>
          </a>
          <a href="#generations">
            02 <span>Các thế hệ</span>
          </a>
          <a href="#values">
            03 <span>Nếp nhà truyền lại</span>
          </a>
          <a href="#records">
            04 <span>Tư liệu gia phả</span>
          </a>
        </aside>
        <article className="history-article">
          <div className="notice">
            <ScrollText size={20} />
            <p>
              Đây là câu chuyện minh họa cho website. Tên người, niên đại và quê
              quán cần được thay bằng tư liệu đã xác minh của dòng họ.
            </p>
          </div>
          <section id="origin">
            <div className="eyebrow">01 · CỘI NGUỒN</div>
            <h2>Một mái nhà, nhiều thế hệ</h2>
            <p>
              Trong bản gia phả minh họa này, dòng họ được ghi lại từ cụ Nguyễn
              Bá Khởi và phu nhân Trần Thị Tâm. Ba người con của hai cụ là
              Nguyễn Bá An, Nguyễn Bá Bình và Nguyễn Bá Chính, tiếp nối thành ba
              chi trong dòng họ.
            </p>
            <p>
              Mỗi nhánh gia đình có hành trình riêng. Gia phả lưu lại những mối
              liên hệ ấy để con cháu biết mình thuộc đời nào, gọi đúng tên người
              thân và nhớ về những người đã đi trước.
            </p>
            <Link className="text-link" href="/members/p1">
              Hồ sơ vị khởi tổ <ArrowRight size={16} />
            </Link>
          </section>
          <section id="generations">
            <div className="eyebrow">02 · CÁC THẾ HỆ</div>
            <h2>Dòng chảy qua năm đời</h2>
            <div className="history-timeline">
              {[
                [
                  'Đời thứ nhất',
                  '1872',
                  'Khởi đầu gia phả',
                  'Cụ Nguyễn Bá Khởi và phu nhân Trần Thị Tâm.',
                ],
                [
                  'Đời thứ hai',
                  '1898 – 1915',
                  'Hình thành ba chi',
                  'Chi trưởng, chi hai và chi ba tiếp nối từ gia đình khởi tổ.',
                ],
                [
                  'Đời thứ ba',
                  '1927 – 1948',
                  'Tiếp nối nếp nhà',
                  'Các gia đình ngày một đông hơn, gắn bó bằng quan hệ huyết thống và hôn nhân.',
                ],
                [
                  'Đời thứ tư',
                  '1955 – 1973',
                  'Gìn giữ ký ức',
                  'Thêm những người con, những mái ấm và những câu chuyện riêng.',
                ],
                [
                  'Đời thứ năm',
                  '1985 – 2001',
                  'Kết nối hôm nay',
                  'Thế hệ trẻ cùng lưu giữ gia phả và ghi nhớ cội nguồn.',
                ],
              ].map(([generation, date, title, description]) => (
                <div className="timeline-entry" key={generation}>
                  <span className="timeline-pin" />
                  <small>
                    {generation} <span>· {date}</span>
                  </small>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </section>
          <section id="values">
            <div className="eyebrow">03 · NẾP NHÀ TRUYỀN LẠI</div>
            <h2>Điều còn lại qua thời gian</h2>
            <blockquote>“Cây có cội, nước có nguồn.”</blockquote>
            <p>
              Gia phả không chỉ là danh sách tên người. Đó còn là sự quan tâm
              giữa các thế hệ, lòng biết ơn tổ tiên và trách nhiệm giữ lại những
              ký ức chung.
            </p>
            <p>
              Từng thông tin được bổ sung, từng câu chuyện được kể lại đều giúp
              thế hệ sau hiểu rõ hơn về gia đình mình.
            </p>
          </section>
          <section id="records">
            <div className="eyebrow">04 · TƯ LIỆU GIA PHẢ</div>
            <h2>Những trang còn đang viết</h2>
            <p>
              Chưa có bản chụp gia phả gốc hoặc tư liệu lịch sử được cung cấp.
              Mục này sẽ là nơi lưu lại nguồn tư liệu của dòng họ sau khi được
              đối chiếu và xác nhận.
            </p>
            <div className="record-links">
              <Link href="/family-tree">
                <GitFork />
                <span>
                  Cây gia phả<small>Khám phá quan hệ giữa các thế hệ</small>
                </span>
                <ArrowRight />
              </Link>
              <Link href="/members">
                <BookOpen />
                <span>
                  Danh sách thành viên
                  <small>Hồ sơ của từng người trong dòng họ</small>
                </span>
                <ArrowRight />
              </Link>
            </div>
          </section>
        </article>
      </div>
      <Footer />
    </main>
  );
}
