"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatWebSocketClient } from "../lib/websocket/client";
import type { Chat, Message, User } from "../lib/chat/types";

interface State {
  chats: Chat[];
  messages: Message[];
  activeChatId: string | null;
}

const initialState: State = {
  chats: [],
  messages: [],
  activeChatId: null,
};

export function useWebSocketChat(currentUser: User | null) {
  const [state, setState] = useState<State>(initialState);

  const client = useMemo(() => new ChatWebSocketClient(), []);

  useEffect(() => {
    client.connect();
    const unsubscribe = client.subscribe((event) => {
      setState((prev) => {
        switch (event.type) {
          case "chat-queued": {
            const isOwnChat =
              currentUser &&
              event.payload.chat.customer.id === currentUser.id;
            return {
              ...prev,
              chats: [
                ...prev.chats,
                {
                  ...event.payload.chat,
                  lastMessage: event.payload.firstMessage,
                },
              ],
              messages: [...prev.messages, event.payload.firstMessage],
              activeChatId: isOwnChat
                ? event.payload.chat.id
                : prev.activeChatId,
            };
          }
          case "chat-assigned": {
            return {
              ...prev,
              chats: prev.chats.map((c) =>
                c.id === event.payload.chat.id
                  ? {
                      ...event.payload.chat,
                      lastMessage:
                        event.payload.chat.lastMessage ?? c.lastMessage,
                    }
                  : c,
              ),
            };
          }
          case "message": {
            return {
              ...prev,
              messages: [...prev.messages, event.payload.message],
              chats: prev.chats.map((c) =>
                c.id === event.payload.message.chatId
                  ? { ...c, lastMessage: event.payload.message }
                  : c,
              ),
            };
          }
          case "chat-updated": {
            return {
              ...prev,
              chats: prev.chats.map((c) =>
                c.id === event.payload.chat.id
                  ? {
                      ...event.payload.chat,
                      lastMessage:
                        event.payload.chat.lastMessage ?? c.lastMessage,
                    }
                  : c,
              ),
            };
          }
          default:
            return prev;
        }
      });
    });
    return () => {
      unsubscribe();
    };
  }, [client, currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    client.send({ type: "login", payload: { user: currentUser } });
  }, [client, currentUser]);

  const queue = useMemo(
    () => state.chats.filter((c) => c.status === "queued"),
    [state.chats],
  );
  const myChats = useMemo(
    () =>
      state.chats.filter(
        (c) => c.status !== "queued" && c.agent?.id === currentUser?.id,
      ),
    [state.chats, currentUser?.id],
  );
  const activeChat = useMemo(
    () => state.chats.find((c) => c.id === state.activeChatId) ?? null,
    [state.chats, state.activeChatId],
  );
  const activeMessages = useMemo(
    () =>
      state.activeChatId
        ? state.messages.filter((m) => m.chatId === state.activeChatId)
        : [],
    [state.messages, state.activeChatId],
  );

  const startChat = (text: string) => {
    if (!currentUser) return;
    client.send({
      type: "customer-start-chat",
      payload: { customer: currentUser, text },
    });
  };

  const claimChat = (chatId: string) => {
    if (!currentUser) return;
    client.send({
      type: "agent-claim-chat",
      payload: { chatId, agent: currentUser },
    });
  };

  const sendMessage = (text: string) => {
    if (!currentUser || !state.activeChatId) return;
    client.send({
      type: "send-message",
      payload: {
        chatId: state.activeChatId,
        text,
        sender: currentUser,
      },
    });
  };

  const resolveChat = () => {
    if (!currentUser || !state.activeChatId) return;
    client.send({
      type: "resolve-chat",
      payload: { chatId: state.activeChatId, agent: currentUser },
    });
    setState((prev) => ({ ...prev, activeChatId: null }));
  };

  const selectChat = (chatId: string) => {
    setState((prev) => ({ ...prev, activeChatId: chatId }));
  };

  return {
    chats: state.chats,
    messages: state.messages,
    queue,
    myChats,
    activeChat,
    activeMessages,
    activeChatId: state.activeChatId,
    startChat,
    claimChat,
    sendMessage,
    resolveChat,
    selectChat,
  };
}

