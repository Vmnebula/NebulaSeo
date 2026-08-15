"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { Keyword } from "@/types";
import { formatNumber, cn } from "@/lib/utils";

interface TopKeywordsTableProps {
  keywords: Keyword[];
  title?: string;
  loading?: boolean;
  onKeywordClick?: (keyword: Keyword) => void;
}

export function TopKeywordsTable({
  keywords,
  title = "Top Keywords",
  loading = false,
  onKeywordClick,
}: TopKeywordsTableProps) {
  const getTrendIcon = (trend?: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 w-4 bg-muted rounded" />
                <div className="h-4 flex-1 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {keywords.map((keyword, index) => (
            <div
              key={keyword.keyword}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors",
                onKeywordClick && "cursor-pointer"
              )}
              onClick={() => onKeywordClick?.(keyword)}
            >
              <span className="text-sm font-medium text-muted-foreground w-6">
                {index + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{keyword.keyword}</p>
                {keyword.url && (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {keyword.url}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(keyword.trend)}
                <Badge variant="secondary">
                  {formatNumber(keyword.clicks)} clicks
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
