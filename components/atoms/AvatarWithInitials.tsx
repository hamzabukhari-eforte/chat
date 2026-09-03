"use client";

import Image from "next/image";
import { nameToInitials } from "../../lib/chat/initials";

interface Props {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

export function AvatarWithInitials({
  name,
  src,
  size = 40,
  className = "",
  alt,
}: Props) {
  const hasImage = typeof src === "string" && src.trim().length > 0;
  const initials = nameToInitials(name);
  const textClass =
    size >= 64 ? "text-xl" : size >= 48 ? "text-sm" : "text-xs";

  if (hasImage) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src.trim()}
          alt={alt ?? name}
          fill
          unoptimized
          sizes={`${size}px`}
          className="rounded-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 bg-brand-100 text-brand-800 font-semibold ${textClass} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={alt ?? name}
    >
      {initials}
    </div>
  );
}
