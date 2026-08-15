"use client";

import { Header } from "@/components/layout/header";
import { LogsPanel } from "@/components/dashboard/logs-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Info } from "lucide-react";

export default function LogsPage() {
  return (
    <div className="min-h-screen">
      <Header dataSource="Logs" onRefresh={() => {}} isRefreshing={false} />

      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500" />
              Request Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor all agent requests, tool calls, and responses in real-time
            </p>
          </div>
          <Badge variant="outline" className="text-blue-500 border-blue-500/30">
            Auto-refreshes every 5s
          </Badge>
        </div>

        {/* Info Card */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Understanding Logs</p>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>• <strong>REQUEST</strong> - User messages to the agent (purple)</li>
                  <li>• <strong>TOOL_CALL</strong> - Tools executed by the agent (orange)</li>
                  <li>• <strong>started</strong> - Request in progress (blue)</li>
                  <li>• <strong>completed/success</strong> - Successful execution (green)</li>
                  <li>• <strong>error</strong> - Failed execution (red)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Full Logs Panel */}
        <LogsPanel 
          autoRefresh={true} 
          refreshInterval={5000} 
          maxHeight="calc(100vh - 400px)" 
        />
      </div>
    </div>
  );
}
