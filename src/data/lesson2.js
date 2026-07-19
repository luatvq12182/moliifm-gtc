// Dữ liệu nội dung Bài 2 - trích từ file "Nội dung Bài 2.docx"
// Đường dẫn video: đặt file HKS_1_lession_2.mp4 vào thư mục public/videos/
// rồi trỏ videoSrc bên dưới tới "/videos/HKS_1_lession_2.mp4"

export const lesson2 = {
  id: 'bai-2',
  title: 'Bài 2 - Ngày tháng, sở thích & mua sắm',
  videoSrc: '/videos/HKS_1_lession_2.mp4',

  // startTime / endTime (đơn vị: giây) — placeholder tạm tính mỗi câu 6 giây,
  // BẠN CẦN SỬA LẠI cho khớp với thời điểm thực tế của từng câu thoại trong video
  // HKS_1_lession_2.mp4. Các giá trị này dùng để: (1) tự động highlight phụ đề
  // đang phát khi xem video, (2) phát lại đúng đoạn khi học viên bấm "nghe lại
  // câu này" ở phần Luyện nói.
  dialogue: [
    // --- Cảnh 1: 在食堂 (Zài shítáng) - Trong nhà ăn ---
    { speaker: '小林', hanzi: '小美，今天几号？星期几啊？', pinyin: 'Xiǎoměi, jīntiān jǐ hào? Xīngqī jǐ a?', vi: 'Tiểu Lâm: Tiểu Mỹ, hôm nay ngày mấy, thứ mấy vậy?', startTime: 0.0, endTime: 7.0 },
    { speaker: '小美', hanzi: '今天6月8号，星期一。你下午想做什么？', pinyin: 'Jīntiān liù yuè bā hào, xīngqī yī. Nǐ xiàwǔ xiǎng zuò shénme?', vi: 'Tiểu Mỹ: Hôm nay là mùng 8 tháng 6, thứ 2. Buổi chiều cậu muốn làm gì?', startTime: 7.0, endTime: 13.0 },
    { speaker: '小林', hanzi: '我想去学校看书。你呢？', pinyin: 'Wǒ xiǎng qù xuéxiào kàn shū. Nǐ ne?', vi: 'Tiểu Lâm: Tớ muốn đến trường đọc sách. Còn cậu thì sao?', startTime: 13.0, endTime: 19.5 },
    { speaker: '小美', hanzi: '我在家写汉字，你会写汉字吗？', pinyin: 'Wǒ zài jiā xiě hànzì, nǐ huì xiě hànzì ma?', vi: 'Tiểu Mỹ: Tớ ở nhà viết chữ Hán, cậu biết viết chữ Hán không?', startTime: 19.5, endTime: 23.5 },
    { speaker: '小林', hanzi: '我会读汉字，但是不会写，这个字怎么写？', pinyin: 'Wǒ huì dú hànzì, dànshì bú huì xiě, zhège zì zěnme xiě?', vi: 'Tiểu Lâm: Tớ biết đọc chữ Hán, nhưng không biết viết, chữ này viết như thế nào nhỉ?', startTime: 23.5, endTime: 32.0 },
    { speaker: '小美', hanzi: '不好意思，这个字我也不会写。', pinyin: 'Bù hǎo yìsi, zhège zì wǒ yě bú huì xiě.', vi: 'Tiểu Mỹ: Ngại quá, chữ này tớ cũng không biết viết.', startTime: 32.0, endTime: 36.0 },
    { speaker: '小林', hanzi: '对了，你昨天说想买一个杯子？', pinyin: 'Duì le, nǐ zuótiān shuō xiǎng mǎi yí ge bēizi?', vi: 'Tiểu Lâm: À đúng rồi, hôm qua cậu nói muốn mua một cái cốc phải không?', startTime: 36.0, endTime: 40.5 },
    { speaker: '小美', hanzi: '对，我想去商店买一个杯子，这家商店的杯子很好看。', pinyin: 'Duì, wǒ xiǎng qù shāngdiàn mǎi yí ge bēizi, zhè jiā shāngdiàn de bēizi hěn hǎo kàn.', vi: 'Tiểu Mỹ: Đúng vậy, tớ muốn đến cửa hàng mua một cái cốc, cốc ở cửa hàng này rất đẹp.', startTime: 40.5, endTime: 46.0 },

    // --- Cảnh 2: 在路上 (Zài lùshang) - Trên đường ---
    { speaker: '小林', hanzi: '小美，你买杯子了吗？', pinyin: 'Xiǎoměi, nǐ mǎi bēizi le ma?', vi: 'Tiểu Lâm: Tiểu Mỹ, cậu mua cốc chưa?', startTime: 46.0, endTime: 51.5 },
    { speaker: '小美', hanzi: '我买了，你看！', pinyin: 'Wǒ mǎi le, nǐ kàn!', vi: 'Tiểu Mỹ: Tớ mua rồi, cậu xem này!', startTime: 51.5, endTime: 55.5 },
    { speaker: '小林', hanzi: '这个杯子多少钱？', pinyin: 'Zhège bēizi duōshao qián?', vi: 'Tiểu Lâm: Cái cốc này bao nhiêu tiền?', startTime: 55.5, endTime: 57.0 },
    { speaker: '小美', hanzi: '这个杯子25块。你想喝什么吗？', pinyin: 'Zhège bēizi èrshíwǔ kuài. Nǐ xiǎng hē shénme ma?', vi: 'Tiểu Mỹ: Cái cốc này 25 tệ. Cậu có muốn uống gì không?', startTime: 57.0, endTime: 63 },
    { speaker: '小林', hanzi: '我想喝茶。', pinyin: 'Wǒ xiǎng hē chá.', vi: 'Tiểu Lâm: Tớ muốn uống trà.', startTime: 63.0, endTime: 66.5 },
    { speaker: '小美', hanzi: '好，我们去那边喝茶。', pinyin: 'Hǎo, wǒmen qù nàbiān hē chá.', vi: 'Tiểu Mỹ: Được, chúng mình qua bên kia uống trà nha.', startTime: 66.5, endTime: 68.5 },

    // --- Cảnh 3: 在茶馆 (Zài cháguǎn) - Trong quán trà ---
    { speaker: '小林', hanzi: '你想吃什么？', pinyin: 'Nǐ xiǎng chī shénme?', vi: 'Tiểu Lâm: Cậu muốn ăn gì?', startTime: 68.5, endTime: 73.0 },
    { speaker: '小美', hanzi: '我想吃中国菜，中国菜很好吃，你会做中国菜吗？', pinyin: 'Wǒ xiǎng chī Zhōngguó cài, Zhōngguó cài hěn hǎo chī, nǐ huì zuò Zhōngguó cài ma?', vi: 'Tiểu Mỹ: Tớ muốn ăn món Trung Quốc, đồ ăn Trung Quốc rất ngon, cậu biết nấu món Trung Quốc không?', startTime: 73.0, endTime: 79 },
    { speaker: '小林', hanzi: '我不会做中国菜，我妈妈会做。', pinyin: 'Wǒ bú huì zuò Zhōngguó cài, wǒ māma huì zuò.', vi: 'Tiểu Lâm: Tớ không biết nấu món Trung Quốc, mẹ tớ biết nấu.', startTime: 79, endTime: 85.0 },
  ],

  vocabulary: [
    { hanzi: '但是', pinyin: 'dànshì', pos: 'Liên từ', meaning: 'nhưng, tuy nhiên', example: { hanzi: '我想去，但是没有钱。', pinyin: 'Wǒ xiǎng qù, dànshì méiyǒu qián.', vi: 'Tôi muốn đi nhưng không có tiền.' } },
    { hanzi: '不好意思', pinyin: 'bù hǎo yìsi', pos: 'Cụm từ', meaning: 'xin lỗi, thật ngại quá', example: { hanzi: '不好意思，这个字我不会写。', pinyin: 'Bù hǎo yìsi, zhège zì wǒ bú huì xiě.', vi: 'Ngại quá, chữ này tôi không biết viết.' } },
    { hanzi: '家', pinyin: 'jiā', pos: 'Lượng từ', meaning: 'ngôi, quán, cửa tiệm... (dùng cho đơn vị kinh doanh)', example: { hanzi: '这家商店很大。', pinyin: 'Zhè jiā shāngdiàn hěn dà.', vi: 'Cửa hàng này rất to.' } },
    { hanzi: '好看', pinyin: 'hǎokàn', pos: 'Tính từ', meaning: 'đẹp, hay', example: { hanzi: '这个杯子很好看。', pinyin: 'Zhè ge bēizi hěn hǎokàn.', vi: 'Cái cốc này rất đẹp.' } },
    { hanzi: '那边', pinyin: 'nàbiān', pos: 'Danh từ', meaning: 'bên kia', example: { hanzi: '那边有汉语书吗？', pinyin: 'Nàbiān yǒu Hànyǔ shū ma?', vi: 'Bên kia có sách tiếng Trung không?' } },
    { hanzi: '在 + địa điểm + V', pinyin: '', pos: 'Cấu trúc ngữ pháp', meaning: 'Ở đâu làm gì / làm gì ở đâu', example: { hanzi: '我在家写汉字。', pinyin: 'Wǒ zài jiā xiě hànzì.', vi: 'Tôi viết chữ Hán ở nhà.' } },
    { hanzi: '...了吗？', pinyin: 'le ma?', pos: 'Cấu trúc ngữ pháp', meaning: 'làm gì chưa?', example: { hanzi: '你吃饭了吗？', pinyin: 'Nǐ chīfàn le ma?', vi: 'Bạn đã ăn cơm chưa?' } },
  ],

  exercises: {
    multipleChoice: [
      {
        id: 'mc1',
        question: '今天几号？星期几？',
        pinyin: 'Jīntiān jǐ hào? Xīngqī jǐ?',
        options: [
          { hanzi: '6月3号，星期一', pinyin: 'Liù yuè sān hào, xīngqī yī' },
          { hanzi: '8月6号，星期一', pinyin: 'Bā yuè liù hào, xīngqī yī' },
          { hanzi: '6月8号，星期一', pinyin: 'Liù yuè bā hào, xīngqī yī' },
          { hanzi: '6月6号，星期一', pinyin: 'Liù yuè liù hào, xīngqī yī' },
        ],
        correctIndex: 2,
      },
      {
        id: 'mc2',
        question: '小美下午想做什么？',
        pinyin: 'Xiǎoměi xiàwǔ xiǎng zuò shénme?',
        options: [
          { hanzi: '看书', pinyin: 'kàn shū' },
          { hanzi: '写汉字', pinyin: 'xiě Hànzì' },
          { hanzi: '看电视', pinyin: 'kàn diànshì' },
          { hanzi: '写作文', pinyin: 'xiě zuòwén' },
        ],
        correctIndex: 1,
      },
    ],
    trueFalse: [
      {
        id: 'tf1',
        statement: '小林会写汉字，不会读。',
        pinyin: 'Xiǎolín huì xiě Hànzì, bú huì dú.',
        correct: false,
      },
      {
        id: 'tf2',
        statement: '小美的杯子是25块钱买的。',
        pinyin: 'Xiǎoměi de bēizi shì èrshíwǔ kuài qián mǎi de.',
        correct: true,
      },
    ],
    sentenceOrder: [
      { id: 'so1', words: ['一个', '商店', '买', '去', '想', '我', '杯子'], correctSentence: '我想去商店买一个杯子。' },
      { id: 'so2', words: ['喝', '想', '小林', '去', '茶'], correctSentence: '小林想去喝茶。' },
    ],
    shortAnswer: [
      {
        id: 'sa1',
        question: '小美想吃什么？',
        pinyin: 'Xiǎoměi xiǎng chī shénme?',
        acceptedAnswers: ['中国菜', '吃中国菜', '想吃中国菜', '小美想吃中国菜', '她想吃中国菜'],
      },
      {
        id: 'sa2',
        question: '谁会做中国菜？',
        pinyin: 'Shéi huì zuò Zhōngguó cài?',
        acceptedAnswers: ['小林的妈妈', '小林的妈妈会做中国菜', '小林的妈妈会做'],
      },
    ],
  },
}