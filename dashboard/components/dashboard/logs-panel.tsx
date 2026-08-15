"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Wrench,
  MessageSquare,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LogEntry {
  timestamp: string;
  type: 'REQUEST' | 'TOOL_CALL';
  status: 'started' | 'completed' | 'error' | 'success';
  message: string;
  request_id?: string;
  session_id?: string;
  tool?: string;
  args?: Record<string, any>;
  error?: string;
  duration_ms?: number;
  tools_called?: string[];
  tools_count?: number;
  response_length?: number;
  full_message?: string;
}

interface LogsPanelProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxHeight?: string;
}

export function LogsPanel({ 
  autoRefresh = true, 
  refreshInterval = 5000,
  maxHeight = "400px"
}: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'REQUEST' | 'TOOL_CALL'>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (filter !== 'all') params.append('type', filter);

      const response = await fetch(`/api/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchLogs, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchLogs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'started':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      started: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    };
    return variants[status] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'REQUEST':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'TOOL_CALL':
        return <Wrench className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Request Logs
            </CardTitle>
            <CardDescription>Real-time agent activity</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {filter === 'all' ? 'All' : filter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All Logs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('REQUEST')}>
                  Requests Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('TOOL_CALL')}>
                  Tool Calls Only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {loading ? 'Loading logs...' : 'No logs yet. Send a message to the agent.'}
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log, index) => {
                const logKey = `${log.timestamp}-${index}`;
                const isExpanded = expandedLog === logKey;
                
                return (
                  <div 
                    key={logKey} 
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div 
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => setExpandedLog(isExpanded ? null : logKey)}
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        {getStatusIcon(log.status)}
                        {getTypeIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <Badge variant="outline" className={getStatusBadge(log.status)}>
                            {log.status}
                          </Badge>
                          {log.type === 'TOOL_CALL' && log.tool && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {log.tool}
                            </Badge>
                          )}
                          {log.duration_ms && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(log.duration_ms)}
                            </span>
                          )}
                          {log.tools_count !== undefined && log.tools_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {log.tools_count} tool{log.tools_count > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1 truncate">
                          {log.message}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t text-xs space-y-2">
                        {log.request_id && (
                          <div>
                            <span className="text-muted-foreground">Request ID: </span>
                            <code className="bg-muted px-1 rounded">{log.request_id}</code>
                          </div>
                        )}
                        {log.session_id && (
                          <div>
                            <span className="text-muted-foreground">Session: </span>
                            <code className="bg-muted px-1 rounded">{log.session_id}</code>
                          </div>
                        )}
                        {log.full_message && (
                          <div>
                            <span className="text-muted-foreground">Full Message: </span>
                            <p className="mt-1 bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                              {log.full_message}
                            </p>
                          </div>
                        )}
                        {log.tools_called && log.tools_called.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Tools Called: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {log.tools_called.map((tool, i) => (
                                <Badge key={i} variant="secondary" className="text-xs font-mono">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.args && Object.keys(log.args).length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Arguments: </span>
                            <pre className="mt-1 bg-muted p-2 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.args, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.error && (
                          <div>
                            <span className="text-red-500">Error: </span>
                            <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded text-red-700 dark:text-red-300">
                              {log.error}
                            </code>
                          </div>
                        )}
                        {log.response_length && (
                          <div>
                            <span className="text-muted-foreground">Response Length: </span>
                            <span>{log.response_length.toLocaleString()} chars</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
