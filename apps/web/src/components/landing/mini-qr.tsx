"use client";

import { QRCodeSVG } from "qrcode.react";

/** qrcode.react uses hooks, so it needs a client boundary to render inside server components. */
export function MiniQR({ value, size }: { value: string; size: number }) {
  return <QRCodeSVG value={value} size={size} fgColor="#0e0e12" aria-hidden="true" />;
}
