// Nạp YouTube IFrame Player API 1 lần duy nhất cho cả trang, dù có nhiều
// video YouTube trong cùng 1 bài học cũng chỉ load script này 1 lần.
let apiPromise = null

export function loadYoutubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
    if (apiPromise) return apiPromise

    apiPromise = new Promise((resolve) => {
        const prevCallback = window.onYouTubeIframeAPIReady
        window.onYouTubeIframeAPIReady = () => {
            if (prevCallback) prevCallback()
            resolve(window.YT)
        }
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
    })

    return apiPromise
}