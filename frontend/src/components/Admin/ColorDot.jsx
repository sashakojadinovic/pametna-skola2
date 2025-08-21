/**
 * File: ColorDot.jsx
 * Path: /frontend/src/components/Admin
 * Author: Saša Kojadinović
 */

export default function ColorDot({ color = "#1976d2", size = 10, style }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        marginRight: 6,
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
}
