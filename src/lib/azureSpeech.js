import * as SDK from 'microsoft-cognitiveservices-speech-sdk'

function createSpeechConfig(azureKey, azureRegion) {
  const speechConfig = SDK.SpeechConfig.fromSubscription(azureKey, azureRegion)
  speechConfig.speechRecognitionLanguage = 'zh-CN'
  try {
    speechConfig.setProperty(SDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs, '10000')
    speechConfig.setProperty(SDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs, '1200')
  } catch (e) {
    console.warn('[assess] Không set được timeout:', e)
  }
  return speechConfig
}

// Nhận diện tự do (KHÔNG có câu mẫu) — chạy song song với lượt chấm điểm
// phát âm, để biết chính xác học viên đã nói ra CÂU GÌ, kể cả khi nói khác
// hẳn câu mẫu. Không reject khi lỗi — trả về null để không làm hỏng cả
// lượt chấm điểm chính nếu lượt phụ này gặp trục trặc.
function recognizeFreeSpeech(azureKey, azureRegion) {
  return new Promise((resolve) => {
    let audioConfig
    try {
      audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput()
    } catch (e) {
      resolve(null)
      return
    }
    const speechConfig = createSpeechConfig(azureKey, azureRegion)
    const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig)

    recognizer.recognizeOnceAsync(
      (result) => {
        resolve(result.reason === SDK.ResultReason.RecognizedSpeech ? result.text : '')
        recognizer.close()
      },
      () => {
        resolve(null)
        recognizer.close()
      }
    )
  })
}

export function assessPronunciation(referenceText) {
  return new Promise((resolve, reject) => {
    const AZURE_KEY = import.meta.env.VITE_AZURE_KEY
    const AZURE_REGION = import.meta.env.VITE_AZURE_REGION

    if (!AZURE_KEY || !AZURE_REGION) {
      reject('Chưa cấu hình VITE_AZURE_KEY / VITE_AZURE_REGION trong file .env')
      return
    }

    let audioConfig
    try {
      audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput()
    } catch (e) {
      reject('Không truy cập được microphone. Kiểm tra quyền trình duyệt.')
      return
    }

    const speechConfig = createSpeechConfig(AZURE_KEY, AZURE_REGION)

    const paConfig = new SDK.PronunciationAssessmentConfig(
      referenceText,
      SDK.PronunciationAssessmentGradingSystem.HundredMark,
      SDK.PronunciationAssessmentGranularity.Phoneme,
      true // enableMiscue
    )
    try {
      paConfig.enableProsodyAssessment = true

      console.log('Ok con de');
    } catch (e) {
      console.warn('[assess] Không bật được enableProsodyAssessment:', e)
    }

    const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig)
    paConfig.applyTo(recognizer)

    // Bắt đầu lượt nhận diện tự do CÙNG LÚC với lượt chấm điểm — cả 2 cùng
    // nghe 1 lượt học viên nói, không cần nói lại lần 2.
    const freeSpeechPromise = recognizeFreeSpeech(AZURE_KEY, AZURE_REGION)

    recognizer.recognizeOnceAsync(
      async (result) => {
        const spokenText = await freeSpeechPromise

        if (result.reason === SDK.ResultReason.RecognizedSpeech) {
          const pa = SDK.PronunciationAssessmentResult.fromResult(result)

          // Azure ở chế độ chấm điểm phát âm vẫn trả "thành công"
          // (RecognizedSpeech) ngay cả khi học viên hoàn toàn im lặng hoặc
          // chỉ có tiếng động không phải giọng nói — lúc đó điểm và văn bản
          // nhận diện đều rỗng/0. Tự phát hiện trường hợp này để báo lỗi
          // đúng, thay vì hiện kết quả 0 điểm gây hiểu lầm là "đã chấm xong,
          // bạn phát âm sai hết".
          const cleanedText = (result.text || '').replace(/[，。！？、.,\s]/g, '')
          const isSilent = Math.round(pa.pronunciationScore) === 0 && cleanedText === ''

          if (isSilent) {
            reject('Không nghe thấy bạn nói gì cả. Bấm mic rồi đọc to, rõ ràng nhé.')
            recognizer.close()
            return
          }

          let words = []
          try {
            const jsonStr = result.properties.getProperty(SDK.PropertyId.SpeechServiceResponse_JsonResult)
            const json = JSON.parse(jsonStr)
            words = json?.NBest?.[0]?.Words || []
          } catch (e) {
            console.warn('[assess] Không đọc được chi tiết theo từng từ:', e)
          }

          // Không dùng thang 100 gốc của Azure cho từng tiêu chí — quy đổi
          // ngay mỗi tiêu chí về thang tối đa 25 điểm, để 4 con số hiển thị
          // ra UI cộng lại đúng bằng điểm tổng (không dùng pa.pronunciationScore
          // của Azure, tự cộng 4 tiêu chí đã quy đổi lại với nhau).
          const accuracyValue = Math.round(pa.accuracyScore / 4)
          const fluencyValue = Math.round(pa.fluencyScore / 4)
          const completenessValue = Math.round(pa.completenessScore / 4)
          const prosodyAvailable = typeof pa.prosodyScore === 'number'
          const prosodyValue = prosodyAvailable ? Math.round(pa.prosodyScore / 4) : 0

          const customTotal = accuracyValue + fluencyValue + completenessValue + prosodyValue

          resolve({
            accuracy: accuracyValue,
            fluency: fluencyValue,
            completeness: completenessValue,
            prosody: prosodyAvailable ? prosodyValue : null,
            pronScore: customTotal,
            words,
            recognizedText: result.text,
            spokenText: spokenText || '',
          })
        } else if (result.reason === SDK.ResultReason.NoMatch) {
          const nm = SDK.NoMatchDetails.fromResult(result)
          const isSilence = nm.reason === SDK.NoMatchReason.InitialSilenceTimeout
          reject(
            isSilence
              ? 'Không nghe thấy bạn nói gì cả. Bấm mic rồi đọc ngay, đừng chờ lâu nhé.'
              : 'Nghe được tiếng nhưng chưa rõ. Hãy nói to hơn, gần mic hơn và kiểm tra tiếng ồn xung quanh.'
          )
        } else {
          reject('Không nhận diện được giọng nói, thử lại nhé.')
        }
        recognizer.close()
      },
      (err) => {
        reject('Lỗi khi ghi âm: ' + err)
        recognizer.close()
      }
    )
  })
}

// ---- Phần dưới đây trước đó bị rớt mất khi thay toàn bộ file — thêm lại ----

// Chuyển pinyin kèm số thanh điệu (Azure trả về dạng "nin 2") thành pinyin
// có dấu thanh chuẩn (dạng "nín") để hiển thị đẹp hơn cho học viên.
const TONE_MARKS = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

export function formatPinyinTone(raw) {
  if (!raw) return ''
  const match = raw.trim().match(/^([a-züv]+)\s*([0-5])?$/i)
  if (!match) return raw

  let [, letters, toneStr] = match
  letters = letters.toLowerCase().replace(/v/g, 'ü')
  const tone = toneStr ? Number(toneStr) : 0
  if (!tone || tone === 5) return letters // thanh nhẹ hoặc không rõ — để nguyên, không thêm dấu

  let vowelIndex = -1
  if (letters.includes('a')) vowelIndex = letters.indexOf('a')
  else if (letters.includes('e')) vowelIndex = letters.indexOf('e')
  else if (letters.includes('ou')) vowelIndex = letters.indexOf('o')
  else {
    for (let i = letters.length - 1; i >= 0; i--) {
      if ('iouü'.includes(letters[i])) {
        vowelIndex = i
        break
      }
    }
  }
  if (vowelIndex === -1) return letters

  const vowel = letters[vowelIndex]
  const marked = TONE_MARKS[vowel]?.[tone] || vowel
  return letters.slice(0, vowelIndex) + marked + letters.slice(vowelIndex + 1)
}

// Tách kết quả chấm điểm từ cấp "cả cụm từ" xuống cấp "từng chữ Hán riêng
// lẻ" — dùng Syllables (chữ + điểm) ghép với Phonemes (pinyin + thanh điệu)
// theo đúng vị trí tương ứng trong cùng 1 từ.
export function buildCharBreakdown(words) {
  const chars = []
    ; (words || []).forEach((w) => {
      const syllables = w.Syllables || []
      const phonemes = w.Phonemes || []

      if (syllables.length > 0) {
        syllables.forEach((syl, i) => {
          const phon = phonemes[i]
          chars.push({
            hanzi: syl.Grapheme || '',
            pinyin: phon ? formatPinyinTone(phon.Phoneme) : '',
            score: syl.PronunciationAssessment?.AccuracyScore ?? 0,
          })
        })
      } else {
        // Từ này không có dữ liệu âm tiết chi tiết — thường do bị bỏ qua hoàn
        // toàn (ErrorType "Omission", học viên không nói tới chữ này). Vẫn
        // hiện đủ từng chữ của câu mẫu ra UI, chỉ là điểm 0 vì không có gì để
        // chấm (không có Syllables nên cũng không có pinyin chi tiết).
        const fallbackScore = w.PronunciationAssessment?.AccuracyScore ?? 0
        Array.from(w.Word || '').forEach((ch) => {
          chars.push({ hanzi: ch, pinyin: '', score: fallbackScore })
        })
      }
    })
  return chars
}