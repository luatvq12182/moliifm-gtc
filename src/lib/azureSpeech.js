import * as SDK from 'microsoft-cognitiveservices-speech-sdk'

// Thời gian tối đa cho toàn bộ 1 lượt nhận diện. Nếu quá mốc này mà Azure
// chưa trả kết quả (mất mạng, deadlock mic, không phát hiện được im lặng
// cuối câu...), tự hủy để KHÔNG BAO GIỜ đơ vĩnh viễn ở màn hình lắng nghe.
const OVERALL_TIMEOUT_MS = 15000

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

// Đóng recognizer an toàn (không ném lỗi nếu đã đóng rồi).
function safeClose(recognizer) {
  if (!recognizer) return
  try {
    recognizer.close()
  } catch (e) {
    /* đã đóng rồi hoặc lỗi khi đóng — bỏ qua */
  }
}

// Nhận diện tự do (KHÔNG có câu mẫu) — chạy song song với lượt chấm điểm để
// biết học viên đã nói ra CÂU GÌ. Không reject khi lỗi — trả về '' để không
// làm hỏng lượt chấm điểm chính. Trả về cả recognizer để lượt chính có thể
// ép dừng khi người dùng bấm "Dừng" hoặc khi hết timeout.
function startFreeSpeech(azureKey, azureRegion) {
  let recognizer = null
  const promise = new Promise((resolve) => {
    let audioConfig
    try {
      audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput()
    } catch (e) {
      resolve('')
      return
    }
    const speechConfig = createSpeechConfig(azureKey, azureRegion)
    recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig)

    let settled = false
    const done = (value) => {
      if (settled) return
      settled = true
      resolve(value)
      safeClose(recognizer)
    }

    recognizer.recognizeOnceAsync(
      (result) => done(result.reason === SDK.ResultReason.RecognizedSpeech ? result.text : ''),
      () => done('')
    )
  })

  return {
    promise,
    stop: () => {
      // Ép phiên tự do dừng ngay (nếu còn đang chạy).
      if (recognizer) {
        try {
          recognizer.stopContinuousRecognitionAsync(
            () => safeClose(recognizer),
            () => safeClose(recognizer)
          )
        } catch (e) {
          safeClose(recognizer)
        }
      }
    },
  }
}

// Trả về { result, stop }:
//   result -> Promise, resolve kết quả chấm điểm / reject kèm thông báo lỗi
//   stop() -> ép dừng ngay lập tức (dùng cho nút "Dừng" hoặc timeout tổng)
export function assessPronunciation(referenceText) {
  const AZURE_KEY = import.meta.env.VITE_AZURE_KEY
  const AZURE_REGION = import.meta.env.VITE_AZURE_REGION

  let recognizer = null
  let freeSpeech = null
  let timeoutId = null
  let settled = false
  let stopRequested = false

  const cleanup = () => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = null
    safeClose(recognizer)
    if (freeSpeech) freeSpeech.stop()
  }

  const result = new Promise((resolve, reject) => {
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
    } catch (e) {
      console.warn('[assess] Không bật được enableProsodyAssessment:', e)
    }

    recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig)
    paConfig.applyTo(recognizer)

    // Lượt nhận diện tự do chạy song song.
    freeSpeech = startFreeSpeech(AZURE_KEY, AZURE_REGION)

    // ---- Lớp bảo vệ: timeout tổng ----
    timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject('Quá thời gian chờ xử lý. Vui lòng kiểm tra kết nối mạng và thử lại nhé.')
    }, OVERALL_TIMEOUT_MS)

    const finish = (fn, payload) => {
      if (settled) return
      settled = true
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = null
      fn(payload)
      // đóng nốt tài nguyên (freeSpeech đã tự đóng khi promise của nó xong)
      safeClose(recognizer)
    }

    recognizer.recognizeOnceAsync(
      async (res) => {
        // Chờ lượt tự do, nhưng KHÔNG để nó làm treo lượt chính: nếu quá 3s
        // chưa có thì bỏ qua, hiện "Nội dung bạn nói" rỗng.
        let spokenText = ''
        try {
          spokenText = await Promise.race([
            freeSpeech.promise,
            new Promise((r) => setTimeout(() => r(''), 3000)),
          ])
        } catch (e) {
          spokenText = ''
        }

        // Nếu người dùng đã bấm Dừng giữa chừng và Azure vẫn trả về sau đó,
        // vẫn xử lý bình thường với dữ liệu thu được (không bỏ phí).

        if (res.reason === SDK.ResultReason.RecognizedSpeech) {
          const pa = SDK.PronunciationAssessmentResult.fromResult(res)

          const cleanedText = (res.text || '').replace(/[，。！？、.,\s]/g, '')
          const isSilent = Math.round(pa.pronunciationScore) === 0 && cleanedText === ''

          if (isSilent) {
            finish(reject, 'Không nghe thấy bạn nói gì cả. Bấm mic rồi đọc to, rõ ràng nhé.')
            return
          }

          let words = []
          try {
            const jsonStr = res.properties.getProperty(SDK.PropertyId.SpeechServiceResponse_JsonResult)
            const json = JSON.parse(jsonStr)
            words = json?.NBest?.[0]?.Words || []
          } catch (e) {
            console.warn('[assess] Không đọc được chi tiết theo từng từ:', e)
          }

          const accuracyValue = Math.round(pa.accuracyScore / 4)
          const fluencyValue = Math.round(pa.fluencyScore / 4)
          const completenessValue = Math.round(pa.completenessScore / 4)
          const prosodyAvailable = typeof pa.prosodyScore === 'number'
          const prosodyValue = prosodyAvailable ? Math.round(pa.prosodyScore / 4) : 0

          const customTotal = accuracyValue + fluencyValue + completenessValue + prosodyValue

          finish(resolve, {
            accuracy: accuracyValue,
            fluency: fluencyValue,
            completeness: completenessValue,
            prosody: prosodyAvailable ? prosodyValue : null,
            pronScore: customTotal,
            words,
            recognizedText: res.text,
            spokenText: spokenText || '',
          })
        } else if (res.reason === SDK.ResultReason.NoMatch) {
          const nm = SDK.NoMatchDetails.fromResult(res)
          const isSilence = nm.reason === SDK.NoMatchReason.InitialSilenceTimeout
          finish(
            reject,
            stopRequested
              ? 'Chưa nghe rõ câu nói. Bấm nói lại và đọc to, rõ ràng nhé.'
              : isSilence
                ? 'Không nghe thấy bạn nói gì cả. Bấm mic rồi đọc ngay, đừng chờ lâu nhé.'
                : 'Nghe được tiếng nhưng chưa rõ. Hãy nói to hơn, gần mic hơn và kiểm tra tiếng ồn xung quanh.'
          )
        } else {
          finish(reject, 'Không nhận diện được giọng nói, thử lại nhé.')
        }
      },
      (err) => {
        finish(reject, 'Lỗi khi ghi âm: ' + err)
      }
    )
  })

  return {
    result,
    stop: () => {
      // Người dùng bấm "Dừng": ép Azure kết thúc nhận diện với dữ liệu đã
      // thu được. recognizer sẽ gọi callback recognizeOnceAsync như bình
      // thường (thường ra kết quả nếu đã nói đủ, hoặc NoMatch nếu quá ít).
      stopRequested = true
      if (recognizer) {
        try {
          recognizer.stopContinuousRecognitionAsync(
            () => { },
            () => { }
          )
        } catch (e) {
          /* bỏ qua */
        }
      }
      if (freeSpeech) freeSpeech.stop()
    },
  }
}

// ---- Các hàm hiển thị pinyin / breakdown (giữ nguyên) ----

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
  if (!tone || tone === 5) return letters

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
        const fallbackScore = w.PronunciationAssessment?.AccuracyScore ?? 0
        Array.from(w.Word || '').forEach((ch) => {
          chars.push({ hanzi: ch, pinyin: '', score: fallbackScore })
        })
      }
    })
  return chars
}