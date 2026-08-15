"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  MessageSquare,
  Key,
  FileSearch,
  Users,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Github,
  Sparkles,
  Wand2,
  Gauge,
  Globe,
  Code2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Keywords", href: "/keywords", icon: Key },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "PageSpeed", href: "/pagespeed", icon: Gauge },
  { name: "Indexing", href: "/indexing", icon: Globe },
  { name: "Schema", href: "/schema", icon: Code2 },
  { name: "Content", href: "/content", icon: Sparkles },
  { name: "GitHub", href: "/github", icon: Github },
  { name: "Actions", href: "/actions", icon: Wand2 },
  { name: "Audits", href: "/audits", icon: FileSearch },
  { name: "Competitors", href: "/competitors", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-card border-r transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Search className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-lg">SEO Agent</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>

      {/* User & Status */}
      <div className="p-4 border-t">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span>Agent Online</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">v5.3 - Autonomous</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
