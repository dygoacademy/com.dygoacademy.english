import type { LegalContent } from './types';

/**
 * Terms of Service and Privacy Policy, vi-VN (canvas page "Legal", LG1–LG4,
 * 2026-10-09). `[[…]]` marks a fact Dylan still has to fill in; it renders
 * highlighted until replaced. Keep the section ids and order the same in
 * all three languages (legal.test.ts checks).
 */
export const legalViVn: LegalContent = {
  ui: {
    eyebrow: "Pháp lý",
    onThisPage: "Trên trang này",
    navLabel: "Trang pháp lý",
    homeLabel: "Trang chủ Dygo",
    regions: {
      vn: "Việt Nam",
      au: "Úc",
      sg: "Singapore"
    },
    termsLabel: "Điều khoản",
    privacyLabel: "Quyền riêng tư",
    copyright: "© 2026 [[TÊN PHÁP LÝ CÔNG TY]]"
  },
  terms: {
    title: "Điều khoản sử dụng",
    description: "Điều khoản sử dụng Dygo, ứng dụng học từ vựng tiếng Anh, tại Việt Nam, Úc và Singapore.",
    updated: "Cập nhật lần cuối [[DD/MM/2026]] · Áp dụng cho website và ứng dụng Dygo",
    shortTitle: "Tóm tắt nhanh",
    short: [
      "Dygo miễn phí khi bắt đầu. Nếu có thu phí, bạn luôn thấy giá trước khi thanh toán.",
      "Dưới 16 tuổi? Cha mẹ hoặc người giám hộ sẽ tạo và quản lý tài khoản cho bạn.",
      "Từ vựng của bạn là của bạn. Bạn có thể tải về hoặc xoá bất cứ lúc nào.",
      "Luyện nói: bản ghi âm được chấm xong là xoá ngay.",
      "Hãy tử tế trong nhóm và chỉ chia sẻ nội dung bạn có quyền chia sẻ.",
      "Luật bảo vệ người tiêu dùng và dữ liệu cá nhân ở nước bạn vẫn bảo vệ bạn."
    ],
    regionQuestion: "Bạn đang sống ở đâu?",
    regionNote: {
      vn: "Bạn được bảo vệ bởi Luật Bảo vệ quyền lợi người tiêu dùng 2023. Bản tiếng Việt của điều khoản này là bản có giá trị áp dụng.",
      au: "Bạn được bảo vệ bởi Luật Người tiêu dùng Úc (Australian Consumer Law). Các bảo đảm của luật này không thể bị loại trừ.",
      sg: "Bạn được bảo vệ bởi Đạo luật Bảo vệ người tiêu dùng (Thương mại công bằng) 2003 của Singapore."
    },
    seeLocal: "Xem quyền lợi tại nước bạn",
    sections: [
      {
        id: "t1",
        title: "Chúng tôi là ai",
        blocks: [
          {
            kind: "p",
            text: "Dygo (“Dygo”, “chúng tôi”) do [[TÊN PHÁP LÝ CÔNG TY]] vận hành, doanh nghiệp đăng ký tại Việt Nam với mã số [[MÃ SỐ DOANH NGHIỆP]], địa chỉ [[ĐỊA CHỈ ĐĂNG KÝ]]. Liên hệ: [[hello@dygo.example]]."
          },
          {
            kind: "p",
            text: "Điều khoản này là thoả thuận giữa bạn và chúng tôi. Khi tạo tài khoản hoặc sử dụng Dygo, bạn đồng ý với các điều khoản này. Chính sách quyền riêng tư giải thích cách chúng tôi xử lý dữ liệu cá nhân của bạn và là một phần của điều khoản này."
          }
        ]
      },
      {
        id: "t2",
        title: "Ai được sử dụng Dygo",
        blocks: [
          {
            kind: "ul",
            items: [
              "Bạn có thể tự tạo tài khoản nếu từ đủ 16 tuổi trở lên.",
              "Nếu dưới 16 tuổi, cha mẹ hoặc người giám hộ hợp pháp phải tạo tài khoản, đồng ý điều khoản thay bạn và quản lý từ tài khoản của họ. Khu vườn của trẻ luôn gắn với tài khoản của cha mẹ.",
              "Trường học, gia sư và trung tâm ngoại ngữ mời học viên dưới 16 tuổi phải có sự đồng ý của cha mẹ hoặc người giám hộ của từng em trước."
            ]
          }
        ]
      },
      {
        id: "t3",
        title: "Tài khoản của bạn",
        blocks: [
          {
            kind: "p",
            text: "Hãy cung cấp thông tin chính xác và giữ mật khẩu riêng tư. Tài khoản chỉ dành cho riêng bạn, vui lòng không chia sẻ. Báo ngay cho chúng tôi qua [[support@dygo.example]] nếu bạn nghi ngờ có người khác dùng tài khoản của mình."
          }
        ]
      },
      {
        id: "t4",
        title: "Dịch vụ miễn phí và gói trả phí",
        blocks: [
          {
            kind: "p",
            text: "Dygo miễn phí cho người học. Sau này chúng tôi có thể có gói trả phí, ví dụ suất học cho trường và gia sư. Trước khi bạn thanh toán, chúng tôi sẽ hiển thị rõ giá, quyền lợi, chu kỳ thu phí và cách huỷ."
          },
          {
            kind: "p",
            text: "Thanh toán do đối tác [[Stripe]] xử lý. Chúng tôi không bao giờ thấy hay lưu số thẻ đầy đủ của bạn. Bạn có thể huỷ gói bất cứ lúc nào, gói sẽ dừng khi hết kỳ đã thanh toán. Việc hoàn tiền tuân theo luật nước bạn (xem “Quyền lợi tại nước bạn”)."
          }
        ]
      },
      {
        id: "t5",
        title: "Từ vựng và nội dung của bạn",
        blocks: [
          {
            kind: "p",
            text: "Từ vựng, câu ví dụ, luống từ và ghi chú bạn tự thêm vẫn thuộc về bạn. Bạn cho phép chúng tôi lưu trữ, xử lý và hiển thị chúng chỉ để vận hành Dygo cho bạn và cho nhóm của bạn nếu bạn chia sẻ."
          },
          {
            kind: "p",
            text: "Chỉ thêm nội dung bạn có quyền chia sẻ. Không thêm nội dung vi phạm pháp luật, thù ghét, khiêu dâm, bạo lực hoặc thông tin cá nhân của người khác."
          }
        ]
      },
      {
        id: "t6",
        title: "Nhóm và khu vườn chung",
        blocks: [
          {
            kind: "p",
            text: "Trong nhóm, các thành viên thấy tên hiển thị và các luống từ bạn chia sẻ. Tiến độ và điểm của riêng bạn chỉ mình bạn thấy; nhóm chỉ thấy số liệu chung của cả nhóm. Quản trị viên quản lý thành viên, biên tập viên thêm luống và từ, người xem tưới cây. Quản trị viên nhóm chịu trách nhiệm về người được mời và nội dung chia sẻ trong nhóm."
          }
        ]
      },
      {
        id: "t7",
        title: "Luyện nói",
        blocks: [
          {
            kind: "p",
            text: "Dygo chỉ dùng micro khi bạn nhấn để ghi âm. Bản ghi được so với giọng người bản xứ rồi xoá ngay. Chúng tôi không lưu bản ghi và không dùng để huấn luyện AI. Điểm luyện nói chỉ để tham khảo khi học, không phải đánh giá chính thức."
          }
        ]
      },
      {
        id: "t8",
        title: "Nghĩa từ được tạo với AI",
        blocks: [
          {
            kind: "p",
            text: "Một số nghĩa, câu ví dụ và bản dịch được soạn với sự hỗ trợ của AI và được kiểm tra theo quy tắc của chúng tôi, nhưng vẫn có thể sai. Hãy báo cho chúng tôi khi thấy sai, và đừng dựa vào Dygo cho thuật ngữ thi cử, pháp lý hay y tế."
          }
        ]
      },
      {
        id: "t9",
        title: "Sử dụng đúng mực",
        blocks: [
          {
            kind: "p",
            text: "Vui lòng không:"
          },
          {
            kind: "ul",
            items: [
              "quấy rối, bắt nạt hoặc lừa dối người khác, nhất là trẻ em;",
              "sao chép hàng loạt nội dung, dữ liệu của Dygo, cào dữ liệu hoặc dùng bot;",
              "dịch ngược, làm quá tải hoặc xâm nhập Dygo hay tài khoản khác;",
              "dùng Dygo để quảng cáo, gửi thư rác hoặc cho mục đích trái pháp luật."
            ]
          }
        ]
      },
      {
        id: "t10",
        title: "Nội dung và thương hiệu của chúng tôi",
        blocks: [
          {
            kind: "p",
            text: "Ứng dụng, thiết kế, danh sách từ, âm thanh, hình minh hoạ, logo Mầm Non (Sprout) và chú ong Dygo thuộc về chúng tôi hoặc bên cấp phép. Chúng tôi cấp cho bạn quyền sử dụng cá nhân, không chuyển nhượng, để tự học trong thời gian bạn dùng Dygo."
          }
        ]
      },
      {
        id: "t11",
        title: "Thay đổi Dygo và điều khoản",
        blocks: [
          {
            kind: "p",
            text: "Chúng tôi liên tục cải thiện Dygo nên tính năng có thể thay đổi. Nếu có thay đổi quan trọng với điều khoản, chúng tôi sẽ báo trong ứng dụng hoặc qua email ít nhất 30 ngày trước khi áp dụng. Nếu không đồng ý, bạn có thể xoá tài khoản trước thời điểm đó."
          }
        ]
      },
      {
        id: "t12",
        title: "Chấm dứt tài khoản",
        blocks: [
          {
            kind: "p",
            text: "Bạn có thể xoá tài khoản bất cứ lúc nào tại Tôi › Tài khoản › Xoá tài khoản. Chúng tôi xoá dữ liệu cá nhân của bạn trong vòng [[30]] ngày, trừ dữ liệu luật yêu cầu lưu, như chứng từ thanh toán."
          },
          {
            kind: "p",
            text: "Chúng tôi có thể tạm khoá hoặc đóng tài khoản vi phạm nghiêm trọng hoặc nhiều lần, hoặc gây nguy hiểm cho người dùng khác, nhất là trẻ em. Khi có thể, chúng tôi sẽ nêu lý do và cho bạn cơ hội phản hồi."
          }
        ]
      },
      {
        id: "t13",
        title: "Trách nhiệm của chúng tôi",
        blocks: [
          {
            kind: "p",
            text: "Chúng tôi nỗ lực để Dygo hoạt động ổn định và chính xác, nhưng không thể cam kết luôn sẵn sàng hay không có lỗi. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp, và tổng trách nhiệm giới hạn ở số tiền bạn đã trả trong 12 tháng trước khi khiếu nại, hoặc [[50 USD]] nếu bạn chưa trả phí."
          },
          {
            kind: "p",
            text: "Không điều khoản nào giới hạn quyền của bạn theo luật bảo vệ người tiêu dùng mà pháp luật không cho phép giới hạn, hay trách nhiệm của chúng tôi đối với tử vong, thương tích do lỗi của chúng tôi hoặc gian lận."
          }
        ]
      },
      {
        id: "t14",
        title: "Luật áp dụng và giải quyết tranh chấp",
        blocks: [
          {
            kind: "p",
            text: "Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Nếu bạn sống ở Úc hoặc Singapore, bạn vẫn được bảo vệ bởi các quy định bắt buộc nơi bạn sống và có thể khởi kiện tại toà án hoặc cơ quan tài phán địa phương."
          },
          {
            kind: "p",
            text: "Nếu có vấn đề, hãy liên hệ chúng tôi trước qua [[support@dygo.example]]. Chúng tôi cố gắng trả lời trong 7 ngày và giải quyết trong 30 ngày."
          }
        ]
      }
    ],
    local: {
      id: "t15",
      title: "Quyền lợi tại nước bạn",
      blocks: {
        vn: [
          {
            kind: "p",
            text: "<b>Việt Nam.</b> Là người tiêu dùng, bạn có các quyền theo Luật Bảo vệ quyền lợi người tiêu dùng 2023, gồm quyền được cung cấp thông tin rõ ràng trước khi thanh toán và được áp dụng điều khoản công bằng. Điều khoản nào trái với luật này sẽ không áp dụng với bạn."
          },
          {
            kind: "p",
            text: "Điều khoản này có bản tiếng Việt và tiếng Anh. Nếu có khác biệt, bản tiếng Việt được áp dụng cho người dùng tại Việt Nam."
          },
          {
            kind: "p",
            text: "Nếu khiếu nại chưa được giải quyết, bạn có thể liên hệ cơ quan bảo vệ quyền lợi người tiêu dùng thuộc Bộ Công Thương, tổ chức xã hội bảo vệ người tiêu dùng, hoặc khởi kiện tại toà án Việt Nam."
          }
        ],
        au: [
          {
            kind: "p",
            text: "<b>Úc.</b> Dịch vụ của chúng tôi đi kèm các bảo đảm không thể loại trừ theo Luật Người tiêu dùng Úc. Nếu dịch vụ trả phí có lỗi nghiêm trọng, bạn có quyền huỷ và được hoàn tiền phần chưa dùng, hoặc được bồi thường phần giảm giá trị, cùng bồi thường cho tổn thất khác có thể lường trước hợp lý."
          },
          {
            kind: "p",
            text: "Các giới hạn ở mục “Trách nhiệm của chúng tôi” chỉ áp dụng trong phạm vi Luật Người tiêu dùng Úc cho phép. Nếu chưa được giải quyết, bạn có thể liên hệ cơ quan thương mại công bằng của bang hoặc ACCC."
          }
        ],
        sg: [
          {
            kind: "p",
            text: "<b>Singapore.</b> Bạn được bảo vệ khỏi các hành vi không công bằng theo Đạo luật Bảo vệ người tiêu dùng (Thương mại công bằng) 2003. Nếu chưa được giải quyết, bạn có thể liên hệ Hiệp hội Người tiêu dùng Singapore (CASE) hoặc nộp đơn tại Toà Khiếu nại nhỏ (Small Claims Tribunals)."
          },
          {
            kind: "p",
            text: "Dữ liệu cá nhân của bạn được xử lý theo Đạo luật Bảo vệ dữ liệu cá nhân 2012 (PDPA). Xem chi tiết trong Chính sách quyền riêng tư."
          }
        ]
      }
    },
    contact: {
      id: "t16",
      title: "Liên hệ",
      blocks: [
        {
          kind: "p",
          text: "[[TÊN PHÁP LÝ CÔNG TY]] · [[ĐỊA CHỈ ĐĂNG KÝ]]"
        },
        {
          kind: "p",
          text: "Hỗ trợ: [[support@dygo.example]] · Dữ liệu cá nhân: [[dpo@dygo.example]]"
        }
      ]
    }
  },
  privacy: {
    title: "Chính sách quyền riêng tư",
    description: "Cách Dygo thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn theo Luật BVDLCN Việt Nam, Privacy Act của Úc và PDPA của Singapore.",
    updated: "Cập nhật lần cuối [[DD/MM/2026]] · Theo Luật BVDLCN Việt Nam, Privacy Act của Úc và PDPA của Singapore",
    shortTitle: "Tóm tắt nhanh",
    short: [
      "Chúng tôi chỉ thu thập những gì Dygo cần để dạy bạn từ vựng: tài khoản, từ vựng và tiến độ học.",
      "Chúng tôi không bao giờ bán dữ liệu và không hiển thị quảng cáo.",
      "Giọng nói được chấm xong là xoá. Chúng tôi không lưu bản ghi âm.",
      "Trẻ dưới 16 tuổi tham gia qua cha mẹ, và hồ sơ của trẻ không bao giờ công khai.",
      "Bạn có thể xem, sửa, tải về hoặc xoá dữ liệu bất cứ lúc nào.",
      "Có thắc mắc? Hãy viết cho người phụ trách bảo vệ dữ liệu: [[dpo@dygo.example]]."
    ],
    regionQuestion: "Bạn đang sống ở đâu?",
    regionNote: {
      vn: "Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP áp dụng cho bạn.",
      au: "Đạo luật Quyền riêng tư 1988 (Privacy Act) và các Nguyên tắc Quyền riêng tư Úc áp dụng cho bạn.",
      sg: "Đạo luật Bảo vệ dữ liệu cá nhân 2012 (PDPA) áp dụng cho bạn."
    },
    seeLocal: "Xem quyền lợi tại nước bạn",
    sections: [
      {
        id: "p1",
        title: "Ai chịu trách nhiệm về dữ liệu của bạn",
        blocks: [
          {
            kind: "p",
            text: "[[TÊN PHÁP LÝ CÔNG TY]] ([[MÃ SỐ DOANH NGHIỆP]], [[ĐỊA CHỈ ĐĂNG KÝ]]) quyết định mục đích và cách xử lý dữ liệu cá nhân của bạn, với vai trò bên kiểm soát dữ liệu (Việt Nam), APP entity (Úc) và tổ chức (Singapore)."
          },
          {
            kind: "p",
            text: "Người phụ trách bảo vệ dữ liệu: [[HỌ TÊN DPO]], email [[dpo@dygo.example]]."
          }
        ]
      },
      {
        id: "p2",
        title: "Dữ liệu chúng tôi thu thập và lý do",
        blocks: [
          {
            kind: "table",
            head: [
              "Dữ liệu",
              "Lý do",
              "Căn cứ",
              "Thời gian lưu"
            ],
            rows: [
              [
                "Tài khoản: email, tên hiển thị, mật khẩu (đã mã hoá), ngôn ngữ ứng dụng và ngôn ngữ dịch",
                "Tạo tài khoản, đăng nhập và hiển thị Dygo bằng ngôn ngữ của bạn",
                "Hợp đồng; sự đồng ý",
                "Đến khi bạn xoá tài khoản"
              ],
              [
                "Dữ liệu học: từ vựng, luống từ, lượt ôn, điểm quiz và điểm luyện nói",
                "Để khu vườn lớn lên và nhắc từ trước khi bạn quên",
                "Hợp đồng",
                "Đến khi bạn xoá"
              ],
              [
                "Dữ liệu nhóm: nhóm bạn tham gia, vai trò, luống từ chung",
                "Vận hành khu vườn chung",
                "Hợp đồng",
                "Khi bạn còn là thành viên"
              ],
              [
                "Bản ghi giọng nói",
                "So giọng bạn với người bản xứ",
                "Sự đồng ý (bạn nhấn micro)",
                "Xoá ngay sau khi chấm"
              ],
              [
                "Hồ sơ trẻ: biệt danh, nhóm tuổi",
                "Để cha mẹ quản lý khu vườn của con",
                "Sự đồng ý của cha mẹ",
                "Đến khi cha mẹ xoá"
              ],
              [
                "Dữ liệu thiết bị: mã thông báo, trình duyệt, báo lỗi",
                "Gửi nhắc nhở bạn đã bật và sửa lỗi",
                "Sự đồng ý; mục đích chính đáng",
                "[[12 tháng]]"
              ],
              [
                "Chứng từ thanh toán (chỉ gói trả phí)",
                "Thu phí và tuân thủ luật thuế",
                "Hợp đồng; nghĩa vụ pháp lý",
                "Theo thời hạn luật thuế"
              ]
            ]
          },
          {
            kind: "p",
            text: "Chúng tôi không thu thập vị trí chính xác, danh bạ, ảnh hay dữ liệu sinh trắc học, và không dùng dữ liệu của bạn để quảng cáo."
          }
        ]
      },
      {
        id: "p3",
        title: "Trẻ em",
        blocks: [
          {
            kind: "ul",
            items: [
              "Trẻ dưới 16 tuổi chỉ dùng Dygo qua cha mẹ hoặc người giám hộ, người đồng ý thay cho trẻ.",
              "Tại Việt Nam, với trẻ từ đủ 7 tuổi, chúng tôi cũng hỏi ý kiến của trẻ bằng lời đơn giản trước khi xử lý dữ liệu cần sự đồng ý.",
              "Chúng tôi chỉ thu thập biệt danh và nhóm tuổi của trẻ, không bao giờ thu email hay số điện thoại.",
              "Hồ sơ của trẻ không bao giờ công khai hay tìm kiếm được, và trẻ không nhận tin tiếp thị."
            ]
          }
        ]
      },
      {
        id: "p4",
        title: "Giọng nói của bạn",
        blocks: [
          {
            kind: "p",
            text: "Khi bạn nhấn micro, bản ghi được gửi đến bộ chấm phát âm của chính chúng tôi, so với giọng người bản xứ và xoá ngay khi có kết quả. Bản ghi không được lưu, chia sẻ hay dùng để huấn luyện AI. Nếu bạn không nhấn micro, chúng tôi không nghe thấy bạn."
          }
        ]
      },
      {
        id: "p5",
        title: "Chúng tôi chia sẻ dữ liệu với ai",
        blocks: [
          {
            kind: "ul",
            items: [
              "<b>Máy chủ và cơ sở dữ liệu:</b> [[NHÀ CUNG CẤP HOSTING]], tại [[KHU VỰC]].",
              "<b>Nghĩa từ:</b> Google (Gemini) chỉ nhận từ hoặc câu bạn tra, không nhận tên hay email.",
              "<b>Âm thanh:</b> Cloudflare lưu và phát âm thanh giọng bản xứ.",
              "<b>Email:</b> [[NHÀ CUNG CẤP EMAIL]] gửi email đăng nhập và nhắc học.",
              "<b>Thanh toán (chỉ gói trả phí):</b> [[Stripe]].",
              "<b>Nhóm của bạn:</b> thành viên thấy tên hiển thị, luống từ chung và số liệu chung của cả nhóm, không bao giờ thấy tiến độ hay điểm của riêng bạn.",
              "<b>Cơ quan nhà nước:</b> chỉ khi pháp luật yêu cầu."
            ]
          },
          {
            kind: "p",
            text: "Mỗi nhà cung cấp chỉ được dùng dữ liệu để giúp chúng tôi vận hành Dygo, theo thoả thuận bằng văn bản."
          }
        ]
      },
      {
        id: "p6",
        title: "Chuyển dữ liệu ra nước ngoài",
        blocks: [
          {
            kind: "p",
            text: "Dữ liệu của bạn được lưu tại [[KHU VỰC]], và một số nhà cung cấp trên hoạt động ở nước khác. Trước khi chuyển dữ liệu ra nước ngoài, chúng tôi ký thoả thuận yêu cầu mức bảo vệ tương đương và hoàn thành các đánh giá theo luật từng nước. Xem “Quyền lợi tại nước bạn”."
          }
        ]
      },
      {
        id: "p7",
        title: "Bảo vệ dữ liệu của bạn",
        blocks: [
          {
            kind: "p",
            text: "Chúng tôi mã hoá dữ liệu khi truyền, lưu mật khẩu đã mã hoá, giới hạn quyền truy cập của nhân sự và ghi nhật ký truy cập. Nếu xảy ra sự cố có thể gây hại cho bạn, chúng tôi sẽ thông báo cho bạn và cơ quan quản lý trong thời hạn luật nước bạn quy định."
          }
        ]
      },
      {
        id: "p8",
        title: "Quyền của bạn",
        blocks: [
          {
            kind: "p",
            text: "Bạn có quyền yêu cầu:"
          },
          {
            kind: "ul",
            items: [
              "xem dữ liệu cá nhân chúng tôi lưu và cách chúng tôi sử dụng;",
              "sửa dữ liệu nếu sai;",
              "nhận bản sao từ vựng và tiến độ để mang sang nơi khác;",
              "xoá dữ liệu hoặc toàn bộ tài khoản;",
              "rút lại sự đồng ý, ví dụ tắt nhắc nhở hoặc ngừng luyện nói;",
              "phản đối hoặc hạn chế việc xử lý, và khiếu nại đến cơ quan quản lý."
            ]
          },
          {
            kind: "p",
            text: "Phần lớn có trong Tôi › Tài khoản. Với yêu cầu khác, hãy viết đến [[dpo@dygo.example]]. Chúng tôi trả lời trong 30 ngày, hoặc sớm hơn nếu luật nước bạn quy định ngắn hơn, và không thu phí."
          }
        ]
      },
      {
        id: "p9",
        title: "Quyết định tự động",
        blocks: [
          {
            kind: "p",
            text: "Dygo tự động quyết định khi nào một từ quay lại để ôn và giọng bạn giống người bản xứ đến đâu. Các quyết định này chỉ định hướng việc luyện tập, không có hệ quả pháp lý và không ảnh hưởng đến quyền dùng Dygo của bạn."
          }
        ]
      },
      {
        id: "p10",
        title: "Cookie và lưu trữ trên thiết bị",
        blocks: [
          {
            kind: "p",
            text: "Chúng tôi chỉ dùng những gì Dygo cần để hoạt động: cookie đăng nhập, lựa chọn ngôn ngữ và âm thanh lưu trên máy để học khi không có mạng. Không dùng cookie quảng cáo hay theo dõi giữa các trang. [[Xác nhận: thêm dòng này nếu có dùng công cụ phân tích.]]"
          }
        ]
      }
    ],
    local: {
      id: "p11",
      title: "Quyền lợi tại nước bạn",
      blocks: {
        vn: [
          {
            kind: "p",
            text: "<b>Việt Nam: Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.</b> Chúng tôi xin sự đồng ý riêng cho từng mục đích, không bao giờ mặc định. Ngoài các quyền trên, bạn có quyền được biết trước khi dữ liệu được xử lý và quyền yêu cầu bồi thường khi dữ liệu bị xử lý trái luật."
          },
          {
            kind: "p",
            text: "Chúng tôi lập hồ sơ đánh giá tác động xử lý dữ liệu cá nhân và hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài, gửi Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao (A05), Bộ Công an theo quy định. Chúng tôi thông báo cho A05 trong vòng 72 giờ khi có vi phạm thuộc diện phải báo."
          },
          {
            kind: "p",
            text: "Bạn có thể khiếu nại đến A05 hoặc khởi kiện tại toà án Việt Nam. Bản tiếng Việt của chính sách này áp dụng cho người dùng tại Việt Nam."
          }
        ],
        au: [
          {
            kind: "p",
            text: "<b>Úc: Privacy Act 1988 và các Nguyên tắc Quyền riêng tư Úc (APP).</b> Bạn có thể dùng Dygo bằng biệt danh thay vì tên thật. Trước khi chuyển dữ liệu ra nước ngoài, chúng tôi thực hiện các bước hợp lý để bên nhận xử lý đúng theo APP."
          },
          {
            kind: "p",
            text: "Theo cơ chế Thông báo vi phạm dữ liệu (NDB), chúng tôi báo cho bạn và Văn phòng Ủy viên Thông tin Úc (OAIC) sớm nhất có thể nếu sự cố có khả năng gây hại nghiêm trọng."
          },
          {
            kind: "p",
            text: "Nếu chưa hài lòng với phản hồi của chúng tôi, bạn có thể khiếu nại đến OAIC tại oaic.gov.au."
          }
        ],
        sg: [
          {
            kind: "p",
            text: "<b>Singapore: Đạo luật Bảo vệ dữ liệu cá nhân 2012 (PDPA).</b> Chúng tôi chỉ thu thập, sử dụng và tiết lộ dữ liệu khi có sự đồng ý của bạn hoặc khi PDPA cho phép, và chỉ cho các mục đích nêu ở đây. Với người học dưới 13 tuổi, chúng tôi luôn xin sự đồng ý của cha mẹ hoặc người giám hộ."
          },
          {
            kind: "p",
            text: "Chúng tôi chỉ chuyển dữ liệu ra ngoài Singapore cho bên nhận có nghĩa vụ bảo vệ ở mức tương đương. Chúng tôi báo cho Ủy ban Bảo vệ dữ liệu cá nhân (PDPC) về sự cố thuộc diện phải báo trong vòng 3 ngày kể từ khi đánh giá, và báo cho bạn khi luật yêu cầu."
          },
          {
            kind: "p",
            text: "Bạn có thể liên hệ người phụ trách bảo vệ dữ liệu qua [[dpo@dygo.example]] hoặc khiếu nại đến PDPC tại pdpc.gov.sg. Chúng tôi không gọi điện hay nhắn tin tiếp thị đến số Singapore khi chưa có sự đồng ý của bạn."
          }
        ]
      }
    },
    contact: {
      id: "p12",
      title: "Thay đổi và liên hệ",
      blocks: [
        {
          kind: "p",
          text: "Nếu thay đổi quan trọng chính sách này, chúng tôi sẽ báo trong ứng dụng ít nhất 30 ngày trước khi áp dụng, và xin lại sự đồng ý khi luật yêu cầu."
        },
        {
          kind: "p",
          text: "Người phụ trách bảo vệ dữ liệu: [[HỌ TÊN DPO]] · [[dpo@dygo.example]] · [[ĐỊA CHỈ ĐĂNG KÝ]]"
        }
      ]
    }
  }
};
