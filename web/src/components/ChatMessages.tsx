"use client";

import { useEffect, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  response_time_ms?: number | null;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
}

export default function ChatMessages({ messages, loading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-600">
        <div className="text-center">
          <p className="mb-2">Start a conversation with the LLM judge.</p>
          <p className="text-sm text-gray-700">
            Try pasting a scenario description, or ask it to evaluate a
            situation. Change the context controls above to see how responses
            shift.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-3">
      {messages.map((msg) => {
        if (msg.role === "system") {
          return (
            <div
              key={msg.id}
              className="text-center text-sm italic text-gray-600"
            >
              {msg.content}
            </div>
          );
        }

        const isUser = msg.role === "user";
        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                isUser
                  ? "bg-blue-700/40 text-gray-200"
                  : "bg-gray-800 text-gray-300"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {!isUser &&
                (msg.input_tokens != null || msg.response_time_ms != null) && (
                  <div className="mt-1 text-sm text-gray-600">
                    {msg.input_tokens != null && msg.output_tokens != null && (
                      <span>
                        {msg.input_tokens}+{msg.output_tokens} tokens
                      </span>
                    )}
                    {msg.response_time_ms != null && (
                      <span className="ml-2">
                        {(msg.response_time_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="flex justify-start">
          <div className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-gray-600" />
              Thinking...
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
