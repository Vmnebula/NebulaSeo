"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber, getTrendColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  format?: "number" | "percent" | "position";
  invertTrend?: boolean;
  loading?: boolean;
}

export function MetricCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  format = "number",
  invertTrend = false,
  loading = false,
}: MetricCardProps) {
  const formatValue = () => {
    if (typeof value === "string") return value;
    switch (format) {
      case "percent":
        return `${(value * 100).toFixed(2)}%`;
      case "position":
        return value.toFixed(1);
      default:
        return formatNumber(value);
    }
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = getTrendColor(trend, invertTrend);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{formatValue()}</p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 mt-1 text-sm", trendColor)}>
                <TrendIcon className="w-4 h-4" />
                <span>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-primary/10 rounded-full">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
