import Link from 'next/link';
import { Footer } from '@/components/genealogy/header';
import { HeritageIcon } from '@/components/genealogy/heritage-icon';
import { HistoryIndex } from '@/components/genealogy/history-index';

const generations = [
  [
    'Đời thứ nhất',
    'Khởi đầu được ghi nhận',
    'Ông Tổ Nguyễn Bá Linh, húy Sóc, hiệu Thần Hy Phủ Quân và Bà Tổ, hiệu Tư Hòa, là hai vị được đặt ở đầu phả hệ.',
  ],
  [
    'Đời thứ hai',
    'Bốn người con của thủy tổ',
    'Bà Nguyễn Thị Khang (Mền), Bà Nguyễn Thị Bang (Hàn Song), Ông Nguyễn Bá Ân và Ông Nguyễn Bá Tăng mở ra các mạch gia đình được ghi trong tư liệu.',
  ],
  [
    'Đời thứ ba',
    'Các gia đình tiếp nối',
    'Tư liệu ghi nhận các con của Bà Khang; các con trong gia đình Ông Ân; các con của Ông Tăng; cùng những người phối ngẫu được nêu tên hoặc chưa rõ tên.',
  ],
  [
    'Đời thứ tư',
    'Hai chi được ghi chép rõ hơn',
    'Từ nhánh Ông Ân, hồ sơ triển khai rõ thành Chi 1 qua Ông Nguyễn Bá Trong và Chi 2 qua Ông Nguyễn Bá Chẩm; đồng thời còn các hậu duệ của nhánh Bà Khang và Ông Tăng.',
  ],
  [
    'Đời thứ năm',
    'Những gia đình kế tiếp',
    'Chi 1 ghi các con của Ông Nguyễn Bá Thớ; Chi 2 ghi các gia đình của Nguyễn Thị Kịa, Nguyễn Bá Phê, Nguyễn Bá Xước và Nguyễn Bá Khẩn.',
  ],
  [
    'Đời thứ sáu',
    'Thế hệ có nhiều dữ liệu ngày sinh',
    'Các nhánh con của Nguyễn Bá Tư, Nguyễn Bá Tưởng, Nguyễn Bá Tường và các gia đình bên Chi 2 tiếp tục được lưu bằng quan hệ cha mẹ, hôn phối và năm sinh khi tài liệu có ghi.',
  ],
  [
    'Đời thứ bảy',
    'Mạch phả hệ được nối đến hiện tại',
    'Những hồ sơ trẻ nhất trong tư liệu cho thấy cây gia phả hiện đã được ghi nối đến đời thứ bảy; thông tin mới vẫn có thể tiếp tục được bổ sung và đối chiếu.',
  ],
] as const;

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
          <p>Những điều được lưu trong gia phả, được kể lại bằng chính tên người và mối quan hệ của từng thế hệ.</p>
        </div>
      </section>
      <div className="container history-body">
        <HistoryIndex />
        <article className="history-article">
          <section id="origin">
            <div className="eyebrow">01 · CỘI NGUỒN THEO GIA PHẢ</div>
            <h2>Từ Huế đến làng Hòa Đông</h2>
            <p>
              Gia phả chép Ông Tổ Nguyễn Bá Linh, húy Sóc, hiệu Thần Hy Phủ Quân, là người Huế. Theo lời ghi trong
              tư liệu, cụ được bổ ra Bắc làm quan tại Thanh Hóa, rồi vào làng Hòa Đông, xã Quảng Trường, Quảng Xương,
              Thanh Hóa để sinh cơ lập nghiệp. Đây là mốc khởi đầu về nơi chốn được ghi rõ nhất trong hồ sơ hiện có.
            </p>
            <p>
              Bà Tổ, hiệu Tư Hòa, là người phối ngẫu của cụ. Tư liệu hiện chưa ghi được họ tên và quê quán của Bà Tổ,
              nên trang gia phả giữ nguyên cách gọi này thay vì tự bổ sung. Hai cụ sinh bốn người con: Bà Nguyễn Thị Khang
              (Mền), Bà Nguyễn Thị Bang (Hàn Song), Ông Nguyễn Bá Ân và Ông Nguyễn Bá Tăng.
            </p>
            <p>
              Lịch sử dưới đây chỉ thuật lại những điều đã xuất hiện trong bản gia phả và dữ liệu đã được đối chiếu. Những
              phần chưa có tên người, năm sinh, năm mất hoặc quan hệ đầy đủ đều được để ở trạng thái chưa rõ, để việc ghi
              tiếp sau này vẫn tôn trọng tư liệu gốc.
            </p>
            <Link className="text-link" href="/members/P001">
              Hồ sơ vị thủy tổ <HeritageIcon name="next" size={16} />
            </Link>
          </section>

          <section id="branches">
            <div className="eyebrow">02 · BỐN MẠCH GIA ĐÌNH</div>
            <h2>Từ bốn người con, các nhánh được mở ra</h2>
            <p>
              Phần gia phả về đời thứ hai vừa là điểm gặp của các nhánh, vừa cho thấy cách tư liệu được gìn giữ: có gia
              đình ghi đủ tên con cháu, có người phối ngẫu chỉ còn cách gọi, và cũng có những ngày húy kỵ đã được lưu lại
              dù niên đại chưa đầy đủ. Mỗi chi tiết được giữ nguyên ý nghĩa của nó, không suy rộng khi tư liệu không nói rõ.
            </p>
            <div className="history-timeline">
              <div className="timeline-entry">
                <span className="timeline-pin" />
                <span className="timeline-label">BÀ NGUYỄN THỊ KHANG (MỀN)</span>
                <h3>Nhánh con và gia đình bên nhà chồng</h3>
                <p>
                  Gia phả ghi Bà Khang có năm người con: Nguyễn Văn Xum, Nguyễn Văn Liêm, Nguyễn Văn Châm, Nguyễn Văn
                  Tốn và Nguyễn Văn Giản. Người chồng chưa rõ tên của bà sau đó có người vợ thứ hai, và ba người con trong
                  gia đình này là Nguyễn Văn Sanh, Nguyễn Thị Giàng và Nguyễn Thị Út. Từ các con này, tư liệu tiếp tục ghi
                  các thế hệ kế tiếp như Nghiễm, Nhàn, Nhạ; Hàn, Khiết, Đạm, Lặng, Ả; cùng nhiều người con cháu khác.
                </p>
              </div>
              <div className="timeline-entry">
                <span className="timeline-pin" />
                <span className="timeline-label">BÀ NGUYỄN THỊ BANG (HÀN SONG)</span>
                <h3>Một nhánh được lưu tên nhưng còn ít dữ liệu</h3>
                <p>
                  Tên Bà Bang (Hàn Song) được ghi ở đời thứ hai, cùng với ngày húy kỵ chưa có ngày cụ thể. Tư liệu hiện
                  chưa ghi tiếp danh sách con cháu của bà; vì vậy hồ sơ chỉ hiển thị những gì đã xác định và chờ bổ sung từ
                  gia đình, thay vì tự tạo mối quan hệ không có căn cứ.
                </p>
              </div>
              <div className="timeline-entry">
                <span className="timeline-pin" />
                <span className="timeline-label">ÔNG NGUYỄN BÁ ÂN</span>
                <h3>Gốc của Chi 1 và Chi 2 trong tư liệu</h3>
                <p>
                  Ông Ân có vợ cả chưa rõ tên, sinh Ông Nguyễn Bá Trong rồi mất; vợ kế chưa rõ tên, quê Quảng Chính cũ,
                  Quảng Xương, Thanh Hóa, sinh Nguyễn Bá Ngọc, Nguyễn Bá Chẩm, Nguyễn Bá Tọa và Nguyễn Thị Hưởng. Từ
                  Ông Trong và Ông Chẩm, hồ sơ sau này được ghi rõ thành Chi 1 và Chi 2.
                </p>
              </div>
              <div className="timeline-entry">
                <span className="timeline-pin" />
                <span className="timeline-label">ÔNG NGUYỄN BÁ TĂNG</span>
                <h3>Quan hệ gia đình được ghi theo từng cuộc hôn phối</h3>
                <p>
                  Vợ cả của Ông Tăng, chưa rõ tên, sinh Bà Nguyễn Thị Thự rồi mất. Vợ thứ hai sinh Bà Nguyễn Thị Thú với
                  Ông Tăng; sau khi ông mất, bà kết hôn với Ông Kỹ và sinh Bà Nguyễn Thị Buông. Cách ghi này được giữ nguyên
                  để phân biệt rõ các quan hệ huyết thống và hôn phối trong cùng một gia đình.
                </p>
              </div>
            </div>
          </section>

          <section id="lines">
            <div className="eyebrow">03 · HAI CHI ĐƯỢC GHI CHÉP RÕ</div>
            <h2>Những gia đình nối tiếp trong bản phả</h2>
            <p>
              Trong phần Chi 1, gia phả ghi Ông Nguyễn Bá Trong là Trưởng họ, Chi trưởng. Hồ sơ của ông được tài liệu đặt
              dưới một tiêu đề đời khác với cách ghi quan hệ cha con trong phần nội dung; trên website, thứ bậc được sắp theo
              quan hệ để cây gia phả nhất quán, còn ghi chú nguồn vẫn được giữ để tiếp tục đối chiếu. Ông có con Nguyễn Bá
              Hiến với Bà Nguyễn Thị Na; với Bà Lê Thị Ngà có Nguyễn Thị Nhung, Nguyễn Bá Thớ và Nguyễn Thị Len.
            </p>
            <p>
              Từ gia đình Ông Nguyễn Bá Thớ và Bà Hà Thị Đờng, tư liệu ghi năm người con là Nguyễn Thị Lới, Nguyễn Thị
              Điều, Nguyễn Bá Tư, Nguyễn Bá Tưởng và Nguyễn Bá Tường. Trong đó, Ông Nguyễn Bá Tư được ghi là Trưởng họ,
              Trưởng Chi 1. Các nhánh tiếp theo lưu quan hệ với gia đình Tạ Tiến Thung, Lê Thế Huân, Nguyễn Thị Cúc, Ngô
              Thị Nữ và Nguyễn Thị Ngoan, rồi nối đến đời thứ sáu và thứ bảy.
            </p>
            <p>
              Ở Chi 2, gia phả ghi Ông Nguyễn Bá Chẩm, sinh năm 1899, và Bà Nguyễn Thị La, sinh năm 1897. Bốn người con
              được ghi là Nguyễn Thị Kịa, Nguyễn Bá Phê, Nguyễn Bá Xước và Nguyễn Bá Khẩn. Ông Nguyễn Bá Phê được ghi là
              Chi trưởng Chi 2. Các gia đình của bốn người con này tiếp tục được lưu với con cháu ở đời thứ năm và thứ sáu,
              gồm các nhánh họ Ngô, Trịnh và Nguyễn.
            </p>
          </section>

          <section id="generations">
            <div className="eyebrow">04 · MẠCH GHI CHÉP BẢY ĐỜI</div>
            <h2>Từ vị thủy tổ đến thế hệ mới nhất</h2>
            <p>
              Dữ liệu hiện có đã nối được các quan hệ từ đời thứ nhất đến đời thứ bảy. Các đời không phải lúc nào cũng có
              đầy đủ niên đại; vì vậy cách gọi đời được dùng để nhận diện vị trí trong phả hệ, còn ngày tháng chỉ được hiển
              thị khi tư liệu ghi rõ.
            </p>
            <div className="history-timeline">
              {generations.map(([generation, title, description]) => (
                <div className="timeline-entry" key={generation}>
                  <span className="timeline-pin" />
                  <span className="timeline-label">{generation}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="records">
            <div className="eyebrow">05 · TƯ LIỆU VÀ VIỆC GHI TIẾP</div>
            <h2>Một bản phả vẫn đang được chăm sóc</h2>
            <p>
              Nội dung trang này dựa trên bản gia phả họ Nguyễn Bá đã được số hóa và các thông tin bổ sung đã nhập vào hệ
              thống. Khi tài liệu chưa ghi tên, giới tính, ngày sinh, ngày mất hoặc không thống nhất giữa các đoạn, website
              ưu tiên giữ nguyên trạng thái cần xác minh. Việc này giúp lần cập nhật sau có thể đối chiếu được với nguồn ban
              đầu, thay vì phải sửa lại một thông tin đã bị suy diễn.
            </p>
            <p>
              Cây gia phả và hồ sơ thành viên là phần tiếp nối của trang sử này: ở đó, mỗi tên gọi được đặt trong quan hệ với
              cha mẹ, vợ chồng, con cháu và ngày húy kỵ khi có ghi nhận. Những tư liệu mới, ảnh gia đình, câu chuyện về người
              thân hoặc xác nhận ngày tháng sẽ giúp bản phả đầy đặn hơn theo cách cẩn trọng và có nguồn.
            </p>
            <div className="record-links">
              <Link href="/family-tree">
                <HeritageIcon name="tree" size={20} />
                <span>
                  Cây gia phả<small>Xem các quan hệ đã được nối giữa các thế hệ</small>
                </span>
                <HeritageIcon name="next" size={20} />
              </Link>
              <Link href="/family-tree?tab=members">
                <HeritageIcon name="history" size={20} />
                <span>
                  Danh sách thành viên
                  <small>Đối chiếu hồ sơ, ngày tháng và ghi chú của từng người</small>
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
