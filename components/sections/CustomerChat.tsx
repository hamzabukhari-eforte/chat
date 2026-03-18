"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useWebSocketChat } from "../../hooks/useWebSocketChat";

export function CustomerChat() {
  const { user } = useAuth();
  const chat = useWebSocketChat(
    user
      ? {
          id: user.id,
          name: user.name,
          role: user.role,
        }
      : null,
  );
  const [draft, setDraft] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    if (chat.activeChat) {
      chat.sendMessage(text);
    } else {
      chat.startChat(text);
    }
    setDraft("");
  };

  return (
    <section className="flex-1 flex flex-col h-[80vh] bg-white w-full max-w-5xl mx-auto mb-20 justify-center my-auto">
      <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white/80">
        <h1 className="text-sm font-semibold text-gray-900">
          Customer Chat Demo
        </h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc] flex flex-col gap-3">
        {chat.activeChat &&
          chat.activeMessages.map((message) => {
            const isMine = message.senderId === user?.id;
            return (
              <div
                key={message.id}
                className={`flex items-start gap-2 max-w-[80%] ${
                  isMine ? "self-end flex-row-reverse" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 mb-1">
                  {isMine ? "Me" : "Ag"}
                </div>
                <div className="flex flex-col gap-1">
                  <div
                    className={
                      "px-4 py-2.5 rounded-2xl shadow-sm text-sm " +
                      (isMine
                        ? "bg-brand-600 text-white"
                        : "bg-white border border-gray-100 text-gray-800")
                    }
                  >
                    {message.text}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}

        {!chat.activeChat && (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            Send a message to start a new chat with an agent.
          </div>
        )}
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white border-t border-gray-200 shrink-0"
      >
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl flex items-end overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
            <textarea
              rows={1}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none focus:ring-0 py-3 px-3 text-sm resize-none max-h-32 min-h-[44px] outline-none text-gray-700"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={!draft.trim()}
            className="w-11 h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ➤
          </button>
        </div>
      </form>
    </section>
  );
}

