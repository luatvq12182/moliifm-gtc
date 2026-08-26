/**
 * Cắt và phát MỘT ĐOẠN trong bản ghi âm của học viên.
 *
 * Dùng để cho học viên nghe lại đúng chữ mình đọc sai, thay vì phải nghe cả câu
 * rồi tự dò. Vị trí từng chữ do iFLYTEK cung cấp (beg_pos/end_pos, đơn vị khung
 * 10ms) — đã kiểm khớp với file thật, lệch 24ms trên bản ghi 3,3 giây.
 *
 * VÌ SAO KHÔNG DÙNG THẺ <audio> + currentTime:
 * Đặt currentTime rồi hẹn giờ dừng có độ chính xác rất kém, mà các đoạn cần phát
 * chỉ dài 100-400ms. Giải mã sẵn ra AudioBuffer rồi phát bằng AudioBufferSourceNode
 * cho phép chỉ định chính xác điểm bắt đầu và độ dài.
 */

let sharedCtx = null
function getCtx() {
    if (!sharedCtx || sharedCtx.state === 'closed') {
        sharedCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return sharedCtx
}

/**
 * Đảm bảo AudioContext ĐANG CHẠY trước khi phát.
 *
 * VÌ SAO CẦN: rời app rồi quay lại (hoặc khoá màn hình, hoặc có cuộc gọi) thì
 * trình duyệt di động TREO AudioContext. Bản đầu gọi resume() rồi phát ngay mà
 * không chờ — resume() là bất đồng bộ, nên lệnh phát rơi vào lúc context còn
 * chưa chạy lại và không ra tiếng gì, cũng không báo lỗi.
 *
 * Ngoài 'suspended', Safari trên iOS còn có trạng thái riêng là 'interrupted'.
 * Nếu resume không ăn thì dựng context mới — AudioBuffer đã giải mã vẫn dùng
 * lại được nên không phải giải mã lại từ đầu.
 */
async function ensureRunning() {
    let ctx = getCtx()
    if (ctx.state === 'running') return ctx

    try {
        await ctx.resume()
    } catch (e) { /* thử phương án dựng lại bên dưới */ }

    if (ctx.state === 'running') return ctx

    try {
        if (ctx.state !== 'closed') await ctx.close().catch(() => { })
    } catch (e) { /* bỏ qua */ }
    sharedCtx = null
    ctx = getCtx()
    try {
        await ctx.resume()
    } catch (e) { /* bỏ qua */ }
    return ctx
}

let currentSource = null

export function stopSegment() {
    if (currentSource) {
        try {
            currentSource.onended = null
            currentSource.stop()
        } catch (e) { /* bỏ qua */ }
        currentSource = null
    }
}

// Đệm hai đầu đoạn cắt — nhưng CHỈ LẤN VÀO KHOẢNG TRỐNG, không lấn sang chữ
// bên cạnh.
//
// BẢN ĐẦU đệm cứng 90-160ms mỗi bên và nghe ra 1-2 chữ thay vì một. Lý do: các
// chữ nằm LIỀN NHAU, không có khoảng trống giữa chúng. Ví dụ thật:
//   今 2320-3040ms | 天 3040-3460ms | 天 3460-3860ms
// Chữ 天 chỉ dài 420ms mà đệm 90ms mỗi bên là ăn sang cả hai chữ kề.
//
// Giờ đệm bị chặn bởi mốc của chữ liền trước/liền sau. Chữ nào nằm giữa câu thì
// gần như không được đệm — đúng như mong muốn: nghe ra đúng một chữ.
const MAX_PAD_MS = 120

// Vuốt nhỏ dần ở hai đầu để đoạn cắt không bị "tách" khi bắt đầu và kết thúc
// giữa chừng sóng âm. Không có nó thì mỗi lần phát đều nghe một tiếng lách tách.
const FADE_MS = 12

const bufferCache = new WeakMap() // Blob -> Promise<AudioBuffer>

function decode(blob) {
    if (bufferCache.has(blob)) return bufferCache.get(blob)
    const task = blob
        .arrayBuffer()
        .then((ab) => getCtx().decodeAudioData(ab))
        .catch((err) => {
            bufferCache.delete(blob)
            throw err
        })
    bufferCache.set(blob, task)
    return task
}

/**
 * Phát đoạn [begMs, endMs] trong blob ghi âm.
 * onStart/onEnd để giao diện hiện trạng thái đang phát; onEnd LUÔN được gọi đúng
 * một lần kể cả khi lỗi hoặc bị cắt ngang.
 */
export function playSegment(
    blob,
    begMs,
    endMs,
    { onStart, onEnd, prevEndMs, nextBegMs } = {}
) {
    let finished = false
    const finish = () => {
        if (finished) return
        finished = true
        if (typeof onEnd === 'function') onEnd()
    }

    if (!blob || typeof begMs !== 'number' || typeof endMs !== 'number' || endMs <= begMs) {
        return Promise.resolve()
    }

    stopSegment()
    if (typeof onStart === 'function') onStart()

    // TUẦN TỰ, không chạy song song: ensureRunning có thể phải ĐÓNG context rồi
    // dựng lại, mà decodeAudioData lại cần context. Chạy song song thì việc giải
    // mã có thể rơi đúng vào lúc context bị đóng và thất bại.
    return ensureRunning()
        .then((ctx) => decode(blob).then((buffer) => ({ ctx, buffer })))
        .then(({ ctx, buffer }) => {
            // Chỉ đệm tới sát chữ liền kề, không lấn qua.
            const padBefore = Math.min(
                MAX_PAD_MS,
                typeof prevEndMs === 'number' ? Math.max(0, begMs - prevEndMs) : MAX_PAD_MS
            )
            const padAfter = Math.min(
                MAX_PAD_MS,
                typeof nextBegMs === 'number' ? Math.max(0, nextBegMs - endMs) : MAX_PAD_MS
            )

            const start = Math.max(0, (begMs - padBefore) / 1000)
            const stop = Math.min(buffer.duration, (endMs + padAfter) / 1000)
            const dur = stop - start
            if (dur <= 0) {
                finish()
                return
            }

            const src = ctx.createBufferSource()
            src.buffer = buffer

            // Vuốt hai đầu, độ dài vuốt không vượt quá 1/4 đoạn để không nuốt
            // mất phụ âm đầu của những chữ rất ngắn.
            const gain = ctx.createGain()
            const fade = Math.min(FADE_MS / 1000, dur / 4)
            const t0 = ctx.currentTime
            gain.gain.setValueAtTime(0, t0)
            gain.gain.linearRampToValueAtTime(1, t0 + fade)
            gain.gain.setValueAtTime(1, t0 + dur - fade)
            gain.gain.linearRampToValueAtTime(0, t0 + dur)

            src.connect(gain)
            gain.connect(ctx.destination)
            src.onended = () => {
                if (currentSource === src) currentSource = null
                finish()
            }
            currentSource = src
            src.start(0, start, dur)
        })
        .catch((err) => {
            console.warn('[audioSegment] Không phát được đoạn:', err)
            finish()
        })
}
