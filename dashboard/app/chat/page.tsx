"use client";

import { Header } from "@/components/layout/header";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ChatPage() {
  return (
    <div className="h-screen flex flex-col">
      <Header dataSource="Agent Connected" />
      <div className="flex-1 p-6 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
