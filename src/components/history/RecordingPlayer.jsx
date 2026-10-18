import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/apiClient.js";

/**
 * Nghe lại một bản ghi âm luyện nói.
 *
 * KHÔNG dùng thẳng được <audio src={url}>: route trả file có kiểm quyền bằng
 * header Authorization, mà thẻ audio không gắn header. Phải tải về bằng fetch
 * kèm token rồi biến thành object URL.
 *
 * TẢI KHI BẤM, không tải sẵn: một lượt học có thể có 25 câu, tải hết ngay khi
 * mở trang là 25 request và vài MB cho thứ học viên có thể không nghe câu nào.
 *
 * MỘT NÚT TRÒN, không phải thanh điều khiển gốc của trình duyệt: mỗi bản ghi
 * chỉ dài vài giây nên thanh tua không giúp gì, mà nó rộng tới vài trăm pixel
 * và làm vỡ bố cục của một hàng danh sách.
 */
export default function RecordingPlayer({ path, label }) {
    const audioRef = useRef(null);
    const urlRef = useRef("");
    const [state, setState] = useState("idle"); // idle | loading | playing | error
    const [error, setError] = useState("");

    // Thu hồi object URL và dừng phát khi rời đi. Không thu hồi thì mỗi lần
    // nghe một câu là một blob bị bỏ quên trong bộ nhớ.
    useEffect(() => {
        return () => {
            if (audioRef.current) audioRef.current.pause();
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        };
    }, []);

    const toggle = async () => {
        if (state === "playing") {
            audioRef.current?.pause();
            setState("idle");
            return;
        }

        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setState("playing");
            return;
        }

        setState("loading");
        setError("");
        try {
            const blob = await api.blob(path);
            const url = URL.createObjectURL(blob);
            urlRef.current = url;

            const audio = new Audio(url);
            audio.onended = () => setState("idle");
            audio.onerror = () => {
                setError("Không phát được bản ghi này.");
                setState("error");
            };
            audioRef.current = audio;

            await audio.play();
            setState("playing");
        } catch (e) {
            setError(e.message);
            setState("error");
        }
    };

    return (
        <div className="shrink-0 flex items-center gap-1.5">
            {error && (
                <span className="text-[10px] text-red-600 max-w-[8rem] text-right leading-tight">
                    {error}
                </span>
            )}
            {label ? (
                // Dạng nút kèm chữ — dùng khi đứng cạnh nút "Nghe mẫu", để hai
                // nút đọc được ngay là gì mà không phải đoán từ biểu tượng.
                <button
                    type="button"
                    onClick={toggle}
                    disabled={state === "loading"}
                    aria-label="Nghe lại giọng đọc"
                    className={
                        "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition " +
                        (state === "playing"
                            ? "border-primary-dark bg-primary text-gray-900"
                            : "border-gray-200 text-gray-600 hover:border-primary-dark hover:text-primary-dark") +
                        (state === "loading" ? " opacity-60" : "")
                    }
                >
                    {state === "loading" ? <Spinner /> : state === "playing" ? <PauseIcon /> : <PlayIcon />}
                    {label}
                </button>
            ) : (
            <button
                type="button"
                onClick={toggle}
                disabled={state === "loading"}
                title="Nghe lại giọng đọc"
                aria-label="Nghe lại giọng đọc"
                className={
                    "w-9 h-9 rounded-full flex items-center justify-center border transition " +
                    (state === "playing"
                        ? "border-primary-dark bg-primary text-gray-900"
                        : "border-gray-200 text-gray-500 hover:border-primary-dark hover:text-primary-dark hover:bg-primary/10") +
                    (state === "loading" ? " opacity-60" : "")
                }
            >
                {state === "loading" ? (
                    <Spinner />
                ) : state === "playing" ? (
                    <PauseIcon />
                ) : (
                    <PlayIcon />
                )}
            </button>
            )}
        </div>
    );
}

function PlayIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}

function PauseIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
        </svg>
    );
}

function Spinner() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
            <path d="M21 12a9 9 0 00-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
