import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export function formatPercent(num: number): string {
  return (num * 100).toFixed(2) + "%";
}

export function formatPosition(pos: number): string {
  return pos.toFixed(1);
}

export function getTrendDirection(current: number, previous: number): "up" | "down" | "neutral" {
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return "neutral";
  return diff > 0 ? "up" : "down";
}

export function getTrendColor(direction: "up" | "down" | "neutral", inverse: boolean = false): string {
  if (direction === "neutral") return "text-muted-foreground";
  if (inverse) {
    return direction === "up" ? "text-red-500" : "text-green-500";
  }
  return direction === "up" ? "text-green-500" : "text-red-500";
}
