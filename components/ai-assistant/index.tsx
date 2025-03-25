"use client";

import React from "react";
import { AssistantProvider } from "./assistant-provider";
import { AssistantButton } from "./assistant-button";
import { AssistantPanel } from "./assistant-panel";
import dynamic from "next/dynamic";

// 客户端渲染组件
const ClientAssistant = dynamic(() => Promise.resolve(AssistantContent), {
  ssr: false,
});

function AssistantContent() {
  return (
    <>
      <AssistantButton />
      <AssistantPanel />
    </>
  );
}

export function AIAssistant({ children }: { children: React.ReactNode }) {
  return (
    <AssistantProvider>
      {children}
      <ClientAssistant />
    </AssistantProvider>
  );
}
