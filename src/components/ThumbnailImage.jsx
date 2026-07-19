import { useState } from 'react'

export default function ThumbnailImage({ src, alt, className }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className={className + ' bg-gray-100 flex items-center justify-center'}>
        <span className="text-[11px] text-gray-400 text-center px-2">{alt}</span>
      </div>
    )
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />
}
