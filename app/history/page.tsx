import Link from 'next/link';
import { Footer } from '@/components/genealogy/header';
import { HeritageIcon } from '@/components/genealogy/heritage-icon';
import { HistoryIndex } from '@/components/genealogy/history-index';
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
        </div>
      </section>
      <div className="container history-body">
        <HistoryIndex />
        <article className="history-article">
          <section id="origin">
            <div className="eyebrow">01 · CỘI NGUỒN</div>
            <h2>Một mái nhà, nhiều thế hệ</h2>
            <p>
              Dòng họ được ghi lại từ Ông Tổ Nguyễn Bá Linh, húy Sóc, hiệu Thần
              Hy Phủ Quân và Bà Tổ, hiệu Tư Hòa. Hai cụ là khởi nguồn của dòng
              họ, sinh hạ bốn người con gồm hai con trai và hai con gái.
            </p>
            <p>
              Mỗi nhánh gia đình có hành trình riêng. Gia phả lưu lại những mối
              liên hệ ấy để con cháu biết mình thuộc đời nào, gọi đúng tên người
              thân và nhớ về những người đã đi trước.
            </p>
            <Link className="text-link" href="/members/p1">
              Hồ sơ vị khởi tổ <HeritageIcon name="next" size={16} />
            </Link>
          </section>
          <section id="generations">
            <div className="eyebrow">02 · CÁC THẾ HỆ</div>
            <h2>Dòng chảy qua năm đời</h2>
            <div className="history-timeline">
              {[
                [
                  'Đời thứ nhất',
                  'Chưa rõ niên đại',
                  'Khởi đầu gia phả',
                  'Ông Tổ Nguyễn Bá Linh và Bà Tổ là khởi nguồn của dòng họ.',
                ],
                [
                  'Đời thứ hai',
                  'Chưa rõ niên đại',
                  'Bốn người con',
                  'Bà Nguyễn Thị Khang, Bà Nguyễn Thị Bang, Ông Nguyễn Bá Ân và Ông Nguyễn Bá Tăng tiếp nối từ gia đình khởi tổ.',
                ],
                [
                  'Đời thứ ba',
                  'Chưa rõ niên đại',
                  'Tiếp nối nếp nhà',
                  'Nhánh Bà Nguyễn Thị Khang ghi nhận tám người con từ Bà Cả và Bà Kế.',
                ],
                [
                  'Đời thứ tư',
                  'Chưa rõ niên đại',
                  'Gìn giữ ký ức',
                  'Hậu duệ các nhánh Nguyễn Văn Xum, Liêm, Châm, Tốn, Giản và Sanh được lưu thành từng hồ sơ.',
                ],
                [
                  'Đời thứ năm',
                  'Chưa rõ niên đại',
                  'Kết nối hôm nay',
                  'Các tên Xứng, Hy, Pháo, Đùng, Hướng, Lan và Thống tiếp nối mạch ghi chép đến đời thứ năm.',
                ],
              ].map(([generation, date, title, description]) => (
                <div className="timeline-entry" key={generation}>
                  <span className="timeline-pin" />
                  <span className="timeline-label">
                    {generation} <span>· {date}</span>
                  </span>
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
                <HeritageIcon name="tree" size={20} />
                <span>
                  Cây gia phả<small>Khám phá quan hệ giữa các thế hệ</small>
                </span>
                <HeritageIcon name="next" size={20} />
              </Link>
              <Link href="/members">
                <HeritageIcon name="history" size={20} />
                <span>
                  Danh sách thành viên
                  <small>Hồ sơ của từng người trong dòng họ</small>
                </span>
                <HeritageIcon name="next" size={20} />
              </Link>
            </div>
          </section>
        </article>
      </div>
      <Footer />
    </main>
  );
}
