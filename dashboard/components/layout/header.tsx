"use client";

import { usePathname } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/chat": "AI Chat",
  "/keywords": "Keywords Explorer",
  "/analytics": "Analytics",
  "/audits": "Technical Audits",
  "/competitors": "Competitor Analysis",
  "/actions": "SEO Actions",
  "/content": "AI Content",
  "/github": "GitHub Integration",
  "/logs": "Agent Logs",
  "/pagespeed": "PageSpeed Insights",
  "/indexing": "Indexing Manager",
  "/schema": "Schema Validator",
  "/settings": "Settings",
};

interface HeaderProps {
  dataSource?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ dataSource = "Manual Data", onRefresh, isRefreshing }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Badge variant={dataSource.includes("GSC") ? "success" : "secondary"}>
          {dataSource}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
        <Button variant="outline" size="icon">
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
