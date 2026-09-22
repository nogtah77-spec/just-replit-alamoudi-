import React, { useMemo } from "react";
import { generateQRMatrix } from "@/lib/qrCodeGenerator";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  className = "",
}) => {
  const matrix = useMemo(() => generateQRMatrix(value), [value]);
  const numCells = matrix.length;
  const cellSize = size / numCells;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`bg-white rounded-xl p-2 shadow-inner ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} fill="#ffffff" rx="8" />
      {matrix.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize + 0.3}
              height={cellSize + 0.3}
              fill="#0f172a"
            />
          );
        })
      )}
    </svg>
  );
};
