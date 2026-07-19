import * as SDK from 'microsoft-cognitiveservices-speech-sdk'

// Ghi âm 1 lượt từ microphone và chấm điểm phát âm so với referenceText (tiếng Trung).
// Trả về Promise resolve({ accuracy, fluency, completeness, pronScore, words, recognizedText })
// hoặc reject(message) nếu lỗi / không cấu hình key.
export function assessPronunciation(referenceText) {
  return new Promise((resolve, reject) => {
    const AZURE_KEY = import.meta.env.VITE_AZURE_KEY
    const AZURE_REGION = import.meta.env.VITE_AZURE_REGION

    if (!AZURE_KEY || !AZURE_REGION) {
      reject('Chưa cấu hình VITE_AZURE_KEY / VITE_AZURE_REGION trong file .env')
      return
    }

    const speechConfig = SDK.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION)
    speechConfig.speechRecognitionLanguage = 'zh-CN'

    // Cho nhiều thời gian bắt đầu nói (mặc định ~5s) và cho phép ngắt nhịp giữa câu
    try {
      speechConfig.setProperty(
        SDK.PropertyId.SpeechServiceConnection_InitialSilenceTimeoutMs,
        '10000'
      )
      speechConfig.setProperty(
        SDK.PropertyId.SpeechServiceConnection_EndSilenceTimeoutMs,
        '1200'
      )
    } catch (e) {
      console.warn('[assess] Không set được timeout:', e)
    }

    let audioConfig
    try {
      audioConfig = SDK.AudioConfig.fromDefaultMicrophoneInput()
    } catch (e) {
      reject('Không truy cập được microphone. Kiểm tra quyền trình duyệt.')
      return
    }

    const paConfig = new SDK.PronunciationAssessmentConfig(
      referenceText,
      SDK.PronunciationAssessmentGradingSystem.HundredMark,
      SDK.PronunciationAssessmentGranularity.Phoneme,
      true
    )
    try {
      paConfig.enableProsodyAssessment = true
    } catch (e) {
      // bản SDK cũ có thể chưa hỗ trợ, bỏ qua
    }

    const recognizer = new SDK.SpeechRecognizer(speechConfig, audioConfig)
    paConfig.applyTo(recognizer)

    recognizer.recognizeOnceAsync(
      (result) => {
        if (result.reason === SDK.ResultReason.RecognizedSpeech) {
          const pa = SDK.PronunciationAssessmentResult.fromResult(result)

          let words = []
          try {
            const jsonStr = result.properties.getProperty(
              SDK.PropertyId.SpeechServiceResponse_JsonResult
            )
            const json = JSON.parse(jsonStr)
            words = json?.NBest?.[0]?.Words || []
          } catch (e) {
            console.warn('[assess] Không đọc được chi tiết theo từng từ:', e)
          }

          resolve({
            accuracy: Math.round(pa.accuracyScore),
            fluency: Math.round(pa.fluencyScore),
            completeness: Math.round(pa.completenessScore),
            pronScore: Math.round(pa.pronunciationScore),
            words,
            recognizedText: result.text,
          })
        } else if (result.reason === SDK.ResultReason.NoMatch) {
          reject('Không nghe rõ, bạn thử nói lại nhé.')
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
