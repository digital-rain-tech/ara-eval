"use client";

import { useState, useEffect } from "react";
import Nav from "@/components/Nav";

interface ChatSession {
  session_id: string;
  started_at: string;
  model: string;
  initial_personality: string;
  initial_jurisdiction: string;
  initial_rubric: string;
  message_count: number;
  context_changes: number;
}

interface ChatMessage {
  id: string;
  session_id: string;
  created_at: string;
  role: string;
  content: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  response_time_ms: number | null;
}

export default function ChatHistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    fetch("/api/chat/sessions")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    fetch(`/api/chat/sessions?id=${selectedId}`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []));
  }, [selectedId]);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl p-4">
        <h1 className="mb-4 text-lg font-bold text-gray-100">
          Chat History
        </h1>

        <div className="flex gap-4">
          {/* Sessions list */}
          <div className={`${selectedId ? "w-1/3" : "w-full"} overflow-x-auto`}>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : sessions.length === 0 ? (
              <p className="text-gray-500">
                No chat sessions yet. Start a conversation on the Chat page.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Model</th>
                    <th className="px-2 py-2">Personality</th>
                    <th className="px-2 py-2">Grounding</th>
                    <th className="px-2 py-2">Msgs</th>
                    <th className="px-2 py-2">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const date = new Date(s.started_at);
                    const isSelected = s.session_id === selectedId;
                    return (
                      <tr
                        key={s.session_id}
                        onClick={() =>
                          setSelectedId(isSelected ? null : s.session_id)
                        }
                        className={`cursor-pointer border-b border-gray-800 ${
                          isSelected
                            ? "bg-gray-800"
                            : "hover:bg-gray-900/50"
                        }`}
                      >
                        <td className="px-2 py-2 text-xs text-gray-300">
                          {date.toLocaleDateString()}{" "}
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-gray-400">
                          {s.model.length > 25
                            ? s.model.slice(0, 25) + "..."
                            : s.model}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-400">
                          {s.initial_personality}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-400">
                          {s.initial_jurisdiction}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-400">
                          {s.message_count}
                        </td>
                        <td className="px-2 py-2 text-xs text-gray-400">
                          {s.context_changes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Conversation view */}
          {selectedId && (
            <div className="w-2/3 overflow-y-auto rounded border border-gray-800 bg-gray-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-300">
                  Conversation
                </h2>
                <button
                  onClick={() => setSelectedId(null)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3">
                {messages.map((msg) => {
                  if (msg.role === "system") {
                    return (
                      <div
                        key={msg.id}
                        className="text-center text-xs italic text-gray-600"
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
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          isUser
                            ? "bg-blue-700/40 text-gray-200"
                            : "bg-gray-800 text-gray-300"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="mt-1 flex gap-3 text-xs text-gray-600">
                          <span>{msg.personality}</span>
                          <span>{msg.jurisdiction}</span>
                          {!isUser && msg.input_tokens != null && (
                            <span>
                              {msg.input_tokens}+{msg.output_tokens} tokens
                            </span>
                          )}
                          {!isUser && msg.response_time_ms != null && (
                            <span>
                              {(msg.response_time_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
