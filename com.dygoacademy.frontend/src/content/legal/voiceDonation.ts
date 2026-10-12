import type { LegalBlock, LegalContent, LegalRegion, LegalSection } from './types';

/**
 * Voice donation text for the Terms and the Privacy Policy (plan
 * `docs/plans/Voice donation consent plan.md` §5, canvas LG boards 2026-10-11:
 * LegalTermsDesktop, LegalPrivacyDesktop, LegalTerms/PrivacyPhoneVi; zh-CN
 * is ours). Shown only with NEXT_PUBLIC_VOICE_DONATION on: the pages then
 * describe the optional donation; otherwise they keep saying recordings
 * are always deleted, which is true while the switch doesn't exist.
 * `[[…]]` is a fact Dylan still has to fill in, as in the base text.
 */
export interface VoiceDonationLegalText {
  terms: {
    /** short[3], the speaking practice bullet. */
    shortSpeaking: string;
    /** t7 Speaking practice, whole section. */
    t7: LegalBlock[];
  };
  privacy: {
    /** short[2], the voice bullet. */
    shortVoice: string;
    /** p2: a row after "Voice recording", and the note under the table. */
    p2Row: string[];
    p2Note: string;
    /** p3: a last bullet. */
    p3Item: string;
    /** p4 Your voice, whole section. */
    p4: LegalBlock[];
    /** p5: a bullet after Payments. */
    p5Item: string;
    /** p8: the "withdraw consent" bullet. */
    p8Withdraw: string;
    /** p9: a sentence at the end. */
    p9Sentence: string;
    /** p11: a paragraph after each region's first one. */
    local: Record<LegalRegion, string>;
  };
}

export const voiceDonationEnUs: VoiceDonationLegalText = {
  terms: {
    shortSpeaking:
      'Speaking practice: your recording is checked, then deleted, unless you choose to donate your recordings to help improve Dygo.',
    t7: [
      {
        kind: 'p',
        text: 'Dygo uses your microphone only while you tap to record. Unless you choose to donate (below), your recording is checked against a native speaker’s, then deleted straight away. Speaking scores are a learning guide, not an official assessment.',
      },
      {
        kind: 'p',
        text: '<b>Donating your recordings (optional).</b> If you are 16 or older, you can choose in Profile › Privacy to let us keep your speaking and pronunciation recordings to improve Dygo’s speech checker for Vietnamese speakers of English. It is off unless you turn it on, it never changes what you can use in Dygo, and you can turn it off or delete your donated recordings at any time. Child profiles can never donate.',
      },
      {
        kind: 'p',
        text: 'If you donate, you give us a free, non-exclusive licence to use those recordings to train and test Dygo’s own speech checker, for as long as we keep them under our Privacy Policy. We won’t sell them, publish them or use them for anything else.',
      },
    ],
  },
  privacy: {
    shortVoice:
      'Your voice is checked, then deleted, unless you choose to donate your recordings to improve Dygo. Donating is off until you turn it on.',
    p2Row: [
      'Donated voice recordings (only if you turn donation on): the recording, the word or sentence, its scores, your accent setting and, if you choose, your first language, region and English level',
      'To train and test Dygo’s own speech checker so it understands Vietnamese speakers of English better',
      'Your separate consent (Profile › Privacy)',
      'Up to [[3 years]], or until you turn donation off or delete them (we delete within [[30]] days)',
    ],
    p2Note:
      'We don’t collect precise location, contacts or photos, and we don’t use your data for advertising. We never use your voice to identify or recognise you.',
    p3Item:
      'Child profiles can never donate voice recordings, and a parent can’t turn donation on for a child.',
    p4: [
      {
        kind: 'p',
        text: '<b>Normally:</b> when you tap the mic, your recording is sent to our own speech checker, compared with a native speaker’s recording and deleted as soon as the result is ready. If you never tap the mic, we never hear you.',
      },
      {
        kind: 'p',
        text: '<b>If you choose to donate:</b> in Profile › Privacy you can turn on “Donate my voice”. From then on, we keep your speaking and pronunciation recordings to train and test our own speech checker. Recordings made before you turned it on were already deleted.',
      },
      {
        kind: 'ul',
        items: [
          'It’s off unless you turn it on. Saying no, or stopping later, never changes what you can do in Dygo.',
          'We store donated recordings under a random code, apart from your name and email. We keep the link only so you can delete them.',
          'Some recordings may be listened to by trained people, our team or a contractor bound by a written agreement, to mark how words were said. They don’t see your name or email.',
          'We use them only for Dygo’s own speech checker. We never sell them, publish them or use them to recognise who you are.',
          'We keep them for up to [[3 years]]. Turn donation off and we stop keeping new recordings at once; tap “Delete my donated recordings” and we delete them within [[30]] days. A speech model already trained can’t be un-trained, but your recordings won’t be used in any future training.',
        ],
      },
    ],
    p5Item:
      '<b>Voice labelling and model training (donated recordings only):</b> [[LABELLING PROVIDER, or our team only]] may listen to some donated recordings to mark pronunciation, without your name or email; [[TRAINING / GPU PROVIDER]], in [[REGION]], processes them to train our model.',
    p8Withdraw:
      'withdraw consent, for example turn off reminders, stop speaking practice or stop donating your voice;',
    p9Sentence:
      'Our speech checker is an AI model, trained in part on recordings learners chose to donate.',
    local: {
      vn: 'Donating your voice is a separate purpose with its own consent, which you give by turning on the setting yourself. We record when you agreed and to which version of this text, and we protect donated recordings as sensitive data.',
      au: 'We collect donated recordings only with your consent and only for the purpose described in “Your voice”.',
      sg: 'Voice donation relies on your consent under the PDPA. You can withdraw it at any time, and we will stop collecting and delete as described in “Your voice”.',
    },
  },
};

export const voiceDonationViVn: VoiceDonationLegalText = {
  terms: {
    shortSpeaking:
      'Luyện nói: bản ghi âm được chấm xong là xoá ngay, trừ khi bạn chọn góp bản ghi để giúp Dygo tốt hơn.',
    t7: [
      {
        kind: 'p',
        text: 'Dygo chỉ dùng micro khi bạn nhấn để ghi âm. Trừ khi bạn chọn góp bản ghi (xem dưới), bản ghi được so với giọng người bản xứ rồi xoá ngay. Điểm luyện nói chỉ để tham khảo khi học, không phải đánh giá chính thức.',
      },
      {
        kind: 'p',
        text: '<b>Góp bản ghi giọng nói (không bắt buộc).</b> Nếu bạn từ 16 tuổi trở lên, bạn có thể chọn trong Hồ sơ › Quyền riêng tư để chúng tôi lưu bản ghi luyện nói và phát âm của bạn nhằm cải thiện bộ chấm phát âm của Dygo cho người Việt nói tiếng Anh. Mặc định tắt, không ảnh hưởng đến những gì bạn được dùng trong Dygo, và bạn có thể tắt hoặc xoá các bản ghi đã góp bất cứ lúc nào. Hồ sơ của trẻ em không bao giờ được góp.',
      },
      {
        kind: 'p',
        text: 'Khi góp, bạn cho phép chúng tôi sử dụng miễn phí, không độc quyền các bản ghi đó để huấn luyện và kiểm thử bộ chấm phát âm riêng của Dygo, trong thời gian chúng tôi lưu giữ theo Chính sách quyền riêng tư. Chúng tôi không bán, không công khai và không dùng vào việc khác.',
      },
    ],
  },
  privacy: {
    shortVoice:
      'Giọng nói được chấm xong là xoá, trừ khi bạn chọn góp bản ghi để cải thiện Dygo. Mặc định không góp cho đến khi bạn tự bật.',
    p2Row: [
      'Bản ghi giọng nói được góp (chỉ khi bạn bật): bản ghi, từ hoặc câu, điểm, giọng UK/US bạn chọn và, nếu bạn muốn, tiếng mẹ đẻ, vùng miền và trình độ tiếng Anh',
      'Để huấn luyện và kiểm thử bộ chấm phát âm riêng của Dygo, giúp chấm người Việt nói tiếng Anh chính xác hơn',
      'Sự đồng ý riêng của bạn (Hồ sơ › Quyền riêng tư)',
      'Tối đa [[3 năm]], hoặc đến khi bạn tắt hoặc xoá (chúng tôi xoá trong vòng [[30]] ngày)',
    ],
    p2Note:
      'Chúng tôi không thu thập vị trí chính xác, danh bạ hay ảnh, và không dùng dữ liệu của bạn để quảng cáo. Chúng tôi không bao giờ dùng giọng nói để nhận diện bạn.',
    p3Item:
      'Hồ sơ của trẻ em không bao giờ được góp bản ghi giọng nói, và phụ huynh không thể bật việc góp cho trẻ.',
    p4: [
      {
        kind: 'p',
        text: '<b>Thông thường:</b> khi bạn nhấn micro, bản ghi được gửi đến bộ chấm phát âm của chính chúng tôi, so với giọng người bản xứ và xoá ngay khi có kết quả. Nếu bạn không nhấn micro, chúng tôi không nghe thấy bạn.',
      },
      {
        kind: 'p',
        text: '<b>Nếu bạn chọn góp:</b> trong Hồ sơ › Quyền riêng tư, bạn có thể bật “Góp giọng nói”. Từ lúc đó, chúng tôi lưu bản ghi luyện nói và phát âm của bạn để huấn luyện và kiểm thử bộ chấm phát âm riêng. Các bản ghi trước khi bạn bật đã được xoá.',
      },
      {
        kind: 'ul',
        items: [
          'Mặc định tắt cho đến khi bạn tự bật. Không đồng ý, hoặc dừng sau này, không làm thay đổi những gì bạn được dùng trong Dygo.',
          'Bản ghi được góp lưu dưới một mã ngẫu nhiên, tách khỏi tên và email của bạn. Chúng tôi chỉ giữ liên kết để bạn có thể xoá chúng.',
          'Một số bản ghi có thể được người đã qua đào tạo (đội ngũ của chúng tôi hoặc đối tác có thoả thuận bằng văn bản) nghe để đánh dấu cách phát âm. Họ không thấy tên hay email của bạn.',
          'Chúng tôi chỉ dùng chúng cho bộ chấm phát âm của Dygo. Không bán, không công khai và không dùng để nhận diện bạn.',
          'Chúng tôi lưu tối đa [[3 năm]]. Khi bạn tắt, chúng tôi ngừng lưu bản ghi mới ngay; khi bạn nhấn “Xoá các bản ghi đã góp”, chúng tôi xoá trong vòng [[30]] ngày. Mô hình đã huấn luyện không thể “quên” lại, nhưng bản ghi của bạn sẽ không được dùng cho lần huấn luyện nào sau đó.',
        ],
      },
    ],
    p5Item:
      '<b>Gán nhãn giọng nói và huấn luyện mô hình (chỉ bản ghi được góp):</b> [[ĐỐI TÁC GÁN NHÃN, hoặc chỉ đội ngũ của chúng tôi]] có thể nghe một số bản ghi để đánh dấu cách phát âm, không kèm tên hay email của bạn; [[NHÀ CUNG CẤP GPU / HUẤN LUYỆN]], tại [[KHU VỰC]], xử lý chúng để huấn luyện mô hình.',
    p8Withdraw:
      'rút lại sự đồng ý, ví dụ tắt nhắc nhở, ngừng luyện nói hoặc ngừng góp giọng nói;',
    p9Sentence:
      'Bộ chấm phát âm của chúng tôi là một mô hình AI, được huấn luyện một phần từ các bản ghi người học tự nguyện góp.',
    local: {
      vn: 'Góp giọng nói là một mục đích riêng với sự đồng ý riêng, do bạn tự bật trong cài đặt. Chúng tôi ghi lại thời điểm và phiên bản văn bản bạn đã đồng ý, và bảo vệ bản ghi được góp như dữ liệu nhạy cảm.',
      au: 'Chúng tôi chỉ thu thập bản ghi được góp khi bạn đồng ý và chỉ cho mục đích nêu trong “Giọng nói của bạn”.',
      sg: 'Việc góp giọng nói dựa trên sự đồng ý của bạn theo PDPA. Bạn có thể rút lại bất cứ lúc nào; chúng tôi sẽ ngừng thu thập và xoá như mô tả trong “Giọng nói của bạn”.',
    },
  },
};

export const voiceDonationZhCn: VoiceDonationLegalText = {
  terms: {
    shortSpeaking: '口语练习：你的录音评分后立即删除，除非你选择捐赠录音来帮助改进 Dygo。',
    t7: [
      {
        kind: 'p',
        text: '只有在你点击录音时，Dygo 才会使用麦克风。除非你选择捐赠（见下文），你的录音会与母语者的发音对比，然后立即删除。口语分数仅作学习参考，不是正式评估。',
      },
      {
        kind: 'p',
        text: '<b>捐赠录音（选填）。</b>如果你年满 16 岁，可以在 我的 › 隐私与数据 中选择让我们保留你的口语和发音录音，用来改进 Dygo 面向越南人说英语的发音检查。默认关闭，只有你自己打开才会生效；是否捐赠都不影响你在 Dygo 中可用的功能；你可以随时关闭或删除已捐赠的录音。孩子的资料永远不能捐赠。',
      },
      {
        kind: 'p',
        text: '如果你捐赠，即授予我们免费、非独占的许可，在我们依照隐私政策保留这些录音期间，用它们训练和测试 Dygo 自己的发音检查。我们不会出售、公开这些录音，也不会将其用于其他用途。',
      },
    ],
  },
  privacy: {
    shortVoice: '你的声音评分后立即删除，除非你选择捐赠录音来改进 Dygo。捐赠默认关闭，直到你自己打开。',
    p2Row: [
      '捐赠的录音（仅在你打开捐赠后）：录音、单词或句子、评分、你选择的口音，以及你愿意提供的母语、地区和英语水平',
      '训练和测试 Dygo 自己的发音检查，让它更准确地理解越南人说的英语',
      '你的单独同意（我的 › 隐私与数据）',
      '最长 [[3 年]]，或直到你关闭捐赠或删除录音（我们会在 [[30]] 天内删除）',
    ],
    p2Note: '我们不收集精确位置、通讯录或照片，也不将你的数据用于广告。我们从不使用你的声音来识别你的身份。',
    p3Item: '孩子的资料永远不能捐赠录音，父母也不能替孩子打开捐赠。',
    p4: [
      {
        kind: 'p',
        text: '<b>通常情况：</b>当你点击麦克风时，录音会发送到我们自己的发音评分程序，与母语者的录音对比，结果一出来就立即删除。如果你从不点击麦克风，我们就从不会听到你的声音。',
      },
      {
        kind: 'p',
        text: '<b>如果你选择捐赠：</b>你可以在 我的 › 隐私与数据 中打开“捐赠我的声音”。从那时起，我们会保留你的口语和发音录音，用来训练和测试我们自己的发音检查。你打开之前的录音早已删除。',
      },
      {
        kind: 'ul',
        items: [
          '默认关闭，只有你自己打开才会生效。拒绝或之后停止，都不会改变你在 Dygo 中能做的事。',
          '捐赠的录音以随机代码保存，与你的姓名和邮箱分开。我们保留两者的关联，只是为了让你能删除它们。',
          '部分录音可能会由受过培训的人员（我们的团队或签有书面协议的承包方）收听，用来标注单词的发音。他们看不到你的姓名或邮箱。',
          '我们只将这些录音用于 Dygo 自己的发音检查。我们从不出售、公开这些录音，也从不用它们识别你的身份。',
          '我们最多保留 [[3 年]]。关闭捐赠后，我们会立即停止保留新的录音；点击“删除我捐赠的录音”后，我们会在 [[30]] 天内删除。已经训练好的模型无法“忘记”，但你的录音不会再用于以后的任何训练。',
        ],
      },
    ],
    p5Item:
      '<b>语音标注和模型训练（仅捐赠的录音）：</b>[[标注服务商，或仅限我们的团队]] 可能会收听部分捐赠的录音来标注发音，不附带你的姓名或邮箱；[[GPU / 训练服务商]]，位于 [[地区]]，为我们处理这些录音以训练模型。',
    p8Withdraw: '撤回同意，例如关闭提醒、停止口语练习或停止捐赠录音；',
    p9Sentence: '我们的发音检查是一个 AI 模型，部分训练数据来自学习者自愿捐赠的录音。',
    local: {
      vn: '捐赠录音是一个单独的目的，需要你单独同意，由你自己在设置中打开。我们会记录你同意的时间和所同意的文本版本，并将捐赠的录音作为敏感数据加以保护。',
      au: '我们只在你同意的情况下收集捐赠的录音，且仅用于“你的声音”中所述的目的。',
      sg: '录音捐赠基于你根据 PDPA 作出的同意。你可以随时撤回，我们会按“你的声音”中所述停止收集并删除。',
    },
  },
};

function edit(sections: LegalSection[], id: string, change: (blocks: LegalBlock[]) => LegalBlock[]) {
  return sections.map((s) => (s.id === id ? { ...s, blocks: change(s.blocks) } : s));
}

/** The index of the p2 "Voice recording" row and the p5 "Payments" bullet (same in every language). */
const VOICE_ROW = 3;
const PAYMENTS_ITEM = 4;
const WITHDRAW_ITEM = 4;

/** The legal copy with the voice donation text in (a new object; the base is untouched). */
export function withVoiceDonation(content: LegalContent, text: VoiceDonationLegalText): LegalContent {
  const { terms, privacy } = content;

  const termsShort = [...terms.short];
  termsShort[3] = text.terms.shortSpeaking;
  const privacyShort = [...privacy.short];
  privacyShort[2] = text.privacy.shortVoice;

  let privacySections = edit(privacy.sections, 'p2', (blocks) =>
    blocks.map((block) => {
      if (block.kind === 'table') {
        const rows = [...block.rows];
        rows.splice(VOICE_ROW + 1, 0, text.privacy.p2Row);
        return { ...block, rows };
      }
      return block.kind === 'p' ? { ...block, text: text.privacy.p2Note } : block;
    }),
  );
  privacySections = edit(privacySections, 'p3', (blocks) =>
    blocks.map((block) =>
      block.kind === 'ul' ? { ...block, items: [...block.items, text.privacy.p3Item] } : block,
    ),
  );
  privacySections = edit(privacySections, 'p4', () => text.privacy.p4);
  privacySections = edit(privacySections, 'p5', (blocks) =>
    blocks.map((block) => {
      if (block.kind !== 'ul') return block;
      const items = [...block.items];
      items.splice(PAYMENTS_ITEM + 1, 0, text.privacy.p5Item);
      return { ...block, items };
    }),
  );
  privacySections = edit(privacySections, 'p8', (blocks) =>
    blocks.map((block) => {
      if (block.kind !== 'ul') return block;
      const items = [...block.items];
      items[WITHDRAW_ITEM] = text.privacy.p8Withdraw;
      return { ...block, items };
    }),
  );
  privacySections = edit(privacySections, 'p9', (blocks) =>
    blocks.map((block, index) =>
      index === blocks.length - 1 && block.kind === 'p'
        ? { ...block, text: `${block.text} ${text.privacy.p9Sentence}` }
        : block,
    ),
  );

  const localBlocks = Object.fromEntries(
    Object.entries(privacy.local.blocks).map(([region, blocks]) => [
      region,
      [blocks[0], { kind: 'p', text: text.privacy.local[region as LegalRegion] }, ...blocks.slice(1)],
    ]),
  ) as Record<LegalRegion, LegalBlock[]>;

  return {
    ...content,
    terms: {
      ...terms,
      short: termsShort,
      sections: edit(terms.sections, 't7', () => text.terms.t7),
    },
    privacy: {
      ...privacy,
      short: privacyShort,
      sections: privacySections,
      local: { ...privacy.local, blocks: localBlocks },
    },
  };
}
