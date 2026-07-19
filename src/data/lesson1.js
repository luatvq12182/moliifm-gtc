// Dữ liệu nội dung Bài 1 - trích từ file "Nội dung Bài 1.docx"
// Đường dẫn video: đặt file HKS_1_lession_1.mp4 vào thư mục public/videos/
// rồi trỏ videoSrc bên dưới tới "/videos/HKS_1_lession_1.mp4"

export const lesson1 = {
  id: 'bai-1',
  title: 'Bài 1 - Làm quen, giới thiệu bản thân',
  videoSrc: '/videos/HKS_1_lession_1.mp4',

  // startTime / endTime (đơn vị: giây) — placeholder tạm tính mỗi câu 6 giây,
  // BẠN CẦN SỬA LẠI cho khớp với thời điểm thực tế của từng câu thoại trong video
  // HKS_1_lession_1.mp4. Các giá trị này dùng để: (1) tự động highlight phụ đề
  // đang phát khi xem video, (2) phát lại đúng đoạn khi học viên bấm "nghe lại
  // câu này" ở phần Luyện nói.
  dialogue: [
    { speaker: '秋荷', hanzi: '您好！', pinyin: 'Nín hǎo!', vi: 'Thu Hà: Chào cô!' , startTime: 0.0, endTime: 2.5 },
    { speaker: '张老师', hanzi: '你好！你叫什么名字？', pinyin: 'Nǐ hǎo! Nǐ jiào shénme míngzi?', vi: 'Cô Trương: Chào em! Em tên gì?' , startTime: 2.5, endTime: 5.5 },
    { speaker: '秋荷', hanzi: '我叫秋荷。您是？', pinyin: 'Wǒ jiào Qiū Hé. Nín shì?', vi: 'Thu Hà: Em tên Thu Hà. Cô là?' , startTime: 5.5, endTime: 8.5 },
    { speaker: '张老师', hanzi: '我是张老师，是汉语老师。很高兴认识你。', pinyin: 'Wǒ shì Zhāng lǎoshī, shì Hànyǔ lǎoshī. Hěn gāoxìng rènshi nǐ.', vi: 'Cô Trương: Tôi là cô Trương, giáo viên dạy tiếng Trung. Rất vui được làm quen với em.' , startTime: 8.5, endTime: 13.5 },
    { speaker: '秋荷', hanzi: '我也很高兴认识您。', pinyin: 'Wǒ yě hěn gāoxìng rènshi nín.', vi: 'Thu Hà: Em cũng rất vui được làm quen với cô ạ.' , startTime: 13.5, endTime: 15.5 },
    { speaker: '张老师', hanzi: '你是中国人吗？', pinyin: 'Nǐ shì Zhōngguó rén ma?', vi: 'Cô Trương: Em là người Trung Quốc hả?' , startTime: 15.5, endTime: 17.5 },
    { speaker: '秋荷', hanzi: '我不是中国人，我是越南人。您呢？', pinyin: 'Wǒ bú shì Zhōngguó rén, wǒ shì Yuènán rén. Nín ne?', vi: 'Thu Hà: Em không phải người Trung Quốc, em là người Việt Nam. Còn cô thì sao ạ?' , startTime: 17.5, endTime: 21.5 },
    { speaker: '张老师', hanzi: '我是中国人。她是谁？她是我们的同事吗？', pinyin: 'Wǒ shì Zhōngguó rén. Tā shì shéí? Tā shì wǒmen de tóngshì ma?', vi: 'Cô Trương: Tôi là người Trung Quốc. Cô ấy là ai? Cô ấy có phải đồng nghiệp của chúng ta không?' , startTime: 21.5, endTime: 26.0 },
    { speaker: '秋荷', hanzi: '不是。她是我的朋友。', pinyin: 'Bú shì. Tā shì wǒ de péngyou.', vi: 'Thu Hà: Không ạ. Cô ấy là bạn của em.' , startTime: 26.0, endTime: 28.5 },
    { speaker: '张老师', hanzi: '哦，这是你的女儿吗？她今年几岁了？', pinyin: "Ō, zhè shì nǐ de nǚ'ér ma? Tā jīnnián jǐ suì le?", vi: 'Cô Trương: Ồ, đây là con gái em hả? Năm nay con bé mấy tuổi rồi?' , startTime: 28.5, endTime: 34.0 },
    { speaker: '秋荷', hanzi: '对，她是我的女儿。她今年八岁了，是小学生。您家有几口人？', pinyin: "Duì, tā shì wǒ de nǚ'ér. Tā jīnnián bā suì le, shì xiǎoxuéshēng. Nín jiā yǒu jǐ kǒu rén?", vi: 'Thu Hà: Dạ, con bé là con gái em. Cháu năm nay tám tuổi rồi, là học sinh tiểu học ạ. Nhà cô có mấy người ạ?' , startTime: 34.0, endTime: 40.25 },
    { speaker: '张老师', hanzi: '我家有三口人:我爸爸、妈妈和我。', pinyin: 'Wǒ jiā yǒu sān kǒu rén: Wǒ bàba, māma hé wǒ.', vi: 'Cô Trương: Nhà tôi có ba người: bố tôi, mẹ tôi và tôi.' , startTime: 40.25, endTime: 44.5 },
    { speaker: '秋荷', hanzi: '哦，您今年多大了？', pinyin: 'Ō, nín jīnnián duō dà le?', vi: 'Thu Hà: Ồ, năm nay cô bao nhiêu tuổi rồi ạ?' , startTime: 44.5, endTime: 46.5 },
    { speaker: '张老师', hanzi: '我今年三十五岁了。你呢？', pinyin: 'Wǒ jīnnián sānshíwǔ suì le. Nǐ ne?', vi: 'Cô Trương: Năm nay tôi 35 tuổi. Còn em thì sao?' , startTime: 46.5, endTime: 49.5 },
    { speaker: '秋荷', hanzi: '我今年二十八岁。啊对了，这是我的礼物，送给您。', pinyin: 'Wǒ jīnnián èrshíbā suì. A duì le, zhè shì wǒ de lǐwù, sòng gěi nín.', vi: 'Thu Hà: Em năm nay 28 tuổi. À đúng rồi, đây là quà của em, tặng cô ạ.' , startTime: 49.5, endTime: 56.5 },
    { speaker: '张老师', hanzi: '谢谢！谢谢！', pinyin: 'Xièxie! Xièxie!', vi: 'Cô Trương: Cảm ơn nhé, cảm ơn.' , startTime: 56.5, endTime: 58.5 },
    { speaker: '秋荷', hanzi: '不客气！', pinyin: 'Bú kèqì!', vi: 'Thu Hà: Không có gì đâu ạ!' , startTime: 58.5, endTime: 63.0 },
  ],

  vocabulary: [
    { hanzi: '高兴', pinyin: 'gāoxìng', pos: 'Tính từ', meaning: 'vui mừng', example: { hanzi: '我非常高兴。', pinyin: 'Wǒ fēicháng gāoxìng.', vi: 'Tôi rất vui.' } },
    { hanzi: '认识', pinyin: 'rènshi', pos: 'Động từ', meaning: 'biết, làm quen', example: { hanzi: '我不认识他。', pinyin: 'Wǒ bù rènshi tā.', vi: 'Tôi không biết anh ấy.' } },
    { hanzi: '也', pinyin: 'yě', pos: 'Phó từ', meaning: 'cũng (也 + động từ)', example: { hanzi: '我也是老师。', pinyin: 'Wǒ yě shì lǎoshī.', vi: 'Tôi cũng là giáo viên.' } },
    { hanzi: '我们', pinyin: 'wǒmen', pos: 'Đại từ nhân xưng', meaning: 'chúng tôi / chúng ta', example: { hanzi: '我们是同学。', pinyin: 'Wǒmen shì tóngxué.', vi: 'Chúng tôi là bạn cùng lớp.' } },
    { hanzi: '同事', pinyin: 'tóngshì', pos: 'Danh từ', meaning: 'đồng nghiệp', example: { hanzi: '他是我的同事。', pinyin: 'Tā shì wǒ de tóngshì.', vi: 'Anh ấy là đồng nghiệp của tôi.' } },
    { hanzi: '哦', pinyin: 'ō', pos: 'Thán từ', meaning: 'ồ (biểu thị bỗng nhiên hiểu ra điều gì)', example: { hanzi: '哦，我明白了。', pinyin: 'Ò, wǒ míngbai le.', vi: 'Ồ, tôi hiểu rồi.' } },
    { hanzi: '对', pinyin: 'duì', pos: 'Tính từ', meaning: 'đúng', example: { hanzi: '你说对了。', pinyin: 'Nǐ shuō duì le.', vi: 'Bạn nói đúng rồi.' } },
    { hanzi: '小学生', pinyin: 'xiǎoxuéshēng', pos: 'Danh từ', meaning: 'học sinh tiểu học', example: { hanzi: '我女儿是小学生。', pinyin: "Wǒ nǚ'ér shì xiǎoxuéshēng.", vi: 'Con gái tôi là học sinh tiểu học.' } },
    { hanzi: '爸爸', pinyin: 'bàba', pos: 'Danh từ', meaning: 'bố', example: { hanzi: '这是我爸爸。', pinyin: 'Zhè shì wǒ bàba.', vi: 'Đây là bố tôi.' } },
    { hanzi: '妈妈', pinyin: 'māma', pos: 'Danh từ', meaning: 'mẹ', example: { hanzi: '这是我妈妈。', pinyin: 'Zhè shì wǒ māma.', vi: 'Đây là mẹ tôi.' } },
    { hanzi: '和', pinyin: 'hé', pos: 'Liên từ', meaning: 'và', example: { hanzi: '我和他都是中国人。', pinyin: 'Wǒ hé tā dōu shì Zhōngguórén.', vi: 'Tôi và anh ấy đều là người Trung Quốc.' } },
    { hanzi: '礼物', pinyin: 'lǐwù', pos: 'Danh từ', meaning: 'quà tặng', example: { hanzi: '这是我的礼物。', pinyin: 'Zhè shì wǒ de lǐwù.', vi: 'Đây là quà của tôi.' } },
    { hanzi: '送', pinyin: 'sòng', pos: 'Động từ', meaning: 'tặng', example: { hanzi: '我送他一本书。', pinyin: 'Wǒ sòng tā yì běn shū.', vi: 'Tôi tặng anh ấy một quyển sách.' } },
    { hanzi: '给', pinyin: 'gěi', pos: 'Động từ / Giới từ', meaning: 'cho', example: { hanzi: '送给你', pinyin: 'Sòng gěi nǐ', vi: 'Tặng cho bạn' } },
    { hanzi: '啊对了', pinyin: 'ā duì le', pos: 'Cụm từ', meaning: 'à đúng rồi', example: { hanzi: '啊对了，这是我的礼物。', pinyin: 'Ā duì le, zhè shì wǒ de lǐwù.', vi: 'À đúng rồi, đây là quà của tôi.' } },
  ],

  exercises: {
    multipleChoice: [
      {
        id: 'mc1',
        question: '张老师是做什么的？',
        pinyin: 'Zhāng lǎoshī shì zuò shénme de?',
        options: [
          { hanzi: '越南语老师', pinyin: 'Yuènányǔ lǎoshī' },
          { hanzi: '英语老师', pinyin: 'Yīngyǔ lǎoshī' },
          { hanzi: '汉语老师', pinyin: 'Hànyǔ lǎoshī' },
          { hanzi: '法语老师', pinyin: 'Fǎyǔ lǎoshī' },
        ],
        correctIndex: 2,
      },
      {
        id: 'mc2',
        question: '秋荷是哪国人？',
        pinyin: 'Qiū Hé shì nǎ guó rén?',
        options: [
          { hanzi: '中国人', pinyin: 'Zhōngguó rén' },
          { hanzi: '越南人', pinyin: 'Yuènán rén' },
          { hanzi: '美国人', pinyin: 'Měiguó rén' },
          { hanzi: '日本人', pinyin: 'Rìběn rén' },
        ],
        correctIndex: 1,
      },
    ],
    trueFalse: [
      {
        id: 'tf1',
        statement: "秋荷的女儿今年九岁了。",
        pinyin: "Qiū Hé de nǚ'ér jīnnián jiǔ suì le.",
        correct: false,
      },
      {
        id: 'tf2',
        statement: '张老师家有她爸爸、妈妈和她，一共三个人。',
        pinyin: 'Zhāng lǎoshī jiā yǒu tā bàba, māma hé tā, yígòng sān gè rén.',
        correct: true,
      },
    ],
    sentenceOrder: [
      { id: 'so1', words: ['朋友', '是', '我', '她', '的'], correctSentence: '她是我的朋友。' },
      { id: 'so2', words: ['礼物', '这', '我', '是', '的'], correctSentence: '这是我的礼物。' },
    ],
    shortAnswer: [
      {
        id: 'sa1',
        question: '张老师是哪国人？',
        pinyin: 'Zhāng lǎoshī shì nǎ guó rén?',
        acceptedAnswers: ['中国人', '张老师是中国人'],
      },
      {
        id: 'sa2',
        question: '秋荷今年多大了？',
        pinyin: 'Qiū Hé jīn nián duō dà le?',
        acceptedAnswers: ['28岁', '二十八岁', '秋荷今年二十八岁', '秋荷今年28岁'],
      },
      {
        id: 'sa3',
        question: '张老师今年多大了？',
        pinyin: 'Zhāng lǎoshī jīn nián duō dà le?',
        acceptedAnswers: ['35岁', '三十五岁', '张老师今年三十五岁', '张老师今年35岁'],
      },
    ],
  },
}
