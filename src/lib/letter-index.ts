export const LETTER_INDEX = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export const LETTER_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "oklch(0.62 0.2 25)", text: "#ffffff" }, // red
  B: { bg: "oklch(0.62 0.2 255)", text: "#ffffff" }, // blue
  C: { bg: "oklch(0.82 0.17 95)", text: "oklch(0.15 0.004 60)" }, // yellow
  D: { bg: "oklch(0.65 0.2 145)", text: "#ffffff" }, // green
  E: { bg: "oklch(0.65 0.2 350)", text: "#ffffff" }, // pink
  F: { bg: "oklch(0.67 0.2 55)", text: "#ffffff" }, // orange
  G: { bg: "oklch(0.58 0.2 295)", text: "#ffffff" }, // purple
  H: { bg: "oklch(0.7 0.16 205)", text: "oklch(0.15 0.004 60)" }, // cyan
  I: { bg: "oklch(0.75 0.2 120)", text: "oklch(0.15 0.004 60)" }, // lime
  J: { bg: "oklch(0.65 0.22 330)", text: "#ffffff" }, // magenta
  K: { bg: "oklch(0.7 0.15 175)", text: "oklch(0.15 0.004 60)" }, // teal
  L: { bg: "oklch(0.75 0.17 80)", text: "oklch(0.15 0.004 60)" }, // amber
  M: { bg: "oklch(0.6 0.2 285)", text: "#ffffff" }, // violet
  N: { bg: "oklch(0.62 0.2 15)", text: "#ffffff" }, // rose
  O: { bg: "oklch(0.65 0.18 155)", text: "#ffffff" }, // emerald
  P: { bg: "oklch(0.65 0.18 230)", text: "#ffffff" }, // sky
  Q: { bg: "oklch(0.7 0.2 310)", text: "oklch(0.15 0.004 60)" }, // fuchsia
  R: { bg: "oklch(0.58 0.2 270)", text: "#ffffff" }, // indigo
  S: { bg: "oklch(0.7 0.05 250)", text: "oklch(0.15 0.004 60)" }, // slate
  T: { bg: "oklch(0.6 0.2 40)", text: "#ffffff" }, // orange-red
  U: { bg: "oklch(0.75 0.15 175)", text: "oklch(0.15 0.004 60)" }, // turquoise
  V: { bg: "oklch(0.8 0.2 120)", text: "oklch(0.15 0.004 60)" }, // chartreuse
  W: { bg: "oklch(0.7 0.2 340)", text: "#ffffff" }, // hot pink
  X: { bg: "oklch(0.55 0.15 245)", text: "#ffffff" }, // steel blue
  Y: { bg: "oklch(0.8 0.18 90)", text: "oklch(0.15 0.004 60)" }, // gold
  Z: { bg: "oklch(0.5 0.2 295)", text: "#ffffff" }, // dark violet
};

export function getLetterColor(letter: string) {
  return (
    LETTER_COLORS[letter.toUpperCase()] ?? {
      bg: "oklch(0.6 0.05 250)",
      text: "#ffffff",
    }
  );
}
