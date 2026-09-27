import Image from "next/image";

/** Creator photo inside an Instagram-style red story ring. */
export function RingAvatar({ src, alt = "", size, className = "" }: { src: string; alt?: string; size: number; className?: string }) {
  const thin = size < 48;
  return (
    <span className={`block shrink-0 rounded-full bg-accent ${thin ? "p-[2px]" : "p-[3px]"} ${className}`} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={alt}
        width={size * 2}
        height={size * 2}
        className={`size-full rounded-full border-white object-cover bg-tile ${thin ? "border-2" : "border-[3px]"}`}
      />
    </span>
  );
}
