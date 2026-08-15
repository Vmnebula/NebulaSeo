"use client";

import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface QuickAction {
  label: string;
  prompt: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
  onActionClick: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({
  actions,
  onActionClick,
  disabled = false,
}: QuickActionsProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Quick Actions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            onClick={() => onActionClick(action.prompt)}
            disabled={disabled}
            className="text-xs"
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
