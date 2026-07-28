export default function ConfettiDecorations() {
  const items = [
    { top: "8%", left: "9%", size: 14, color: "text-amber-300", shape: "star" },
    { top: "22%", left: "4%", size: 8, color: "text-amber-400", shape: "dot" },
    {
      top: "40%",
      left: "13%",
      size: 10,
      color: "text-green-300",
      shape: "diamond",
    },
    {
      top: "58%",
      left: "7%",
      size: 16,
      color: "text-amber-400",
      shape: "star",
    },
    {
      top: "10%",
      right: "9%",
      size: 10,
      color: "text-green-300",
      shape: "diamond",
    },
    {
      top: "24%",
      right: "5%",
      size: 16,
      color: "text-amber-400",
      shape: "sparkle",
    },
    {
      top: "44%",
      right: "11%",
      size: 14,
      color: "text-amber-300",
      shape: "star",
    },
    {
      top: "60%",
      right: "17%",
      size: 6,
      color: "text-amber-400",
      shape: "dot",
    },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {items.map((item, i) => (
        <span
          key={i}
          className={"absolute " + item.color}
          style={{ top: item.top, left: item.left, right: item.right }}
        >
          {item.shape === "star" && <StarIcon size={item.size} />}
          {item.shape === "sparkle" && <SparkleIcon size={item.size} />}
          {item.shape === "dot" && (
            <span
              className="block rounded-full bg-current"
              style={{ width: item.size, height: item.size }}
            />
          )}
          {item.shape === "diamond" && (
            <span
              className="block bg-current"
              style={{
                width: item.size,
                height: item.size,
                transform: "rotate(45deg)",
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}

function StarIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
    </svg>
  );
}

function SparkleIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
    </svg>
  );
}
