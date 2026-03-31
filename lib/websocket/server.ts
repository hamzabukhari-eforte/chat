import { createServer } from "http";
import { WebSocketServer, type WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { Chat, Message, IncomingEvent, OutgoingEvent, User } from "../chat/types";

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

const clients = new Map<WebSocket, User>();
let chats: Chat[] = [];
const messages: Message[] = [];

function broadcast(event: IncomingEvent) {
  const data = JSON.stringify(event);
  for (const socket of wss.clients) {
    if (socket.readyState === 1) {
      socket.send(data);
    }
  }
}

function lastMessageForChat(chatId: string): Message | undefined {
  const forChat = messages.filter((m) => m.chatId === chatId);
  if (!forChat.length) return undefined;
  return forChat.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
  );
}

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

httpServer.on("request", (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url?.startsWith("/api/chat-sync")) {
    const chatsWithLast: Chat[] = chats.map((c) => ({
      ...c,
      lastMessage: lastMessageForChat(c.id),
    }));
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ chats: chatsWithLast, messages }));
    return;
  }
  res.writeHead(404, corsHeaders);
  res.end();
});

wss.on("connection", (socket) => {
  socket.on("message", (data) => {
    let event: OutgoingEvent;
    try {
      event = JSON.parse(String(data));
    } catch {
      return;
    }

    switch (event.type) {
      case "login":
        clients.set(socket, event.payload.user);
        break;
      case "customer-start-chat": {
        const chat: Chat = {
          id: randomUUID(),
          customer: event.payload.customer,
          status: "queued",
          createdAt: new Date().toISOString(),
        };
        const msg: Message = {
          id: randomUUID(),
          chatId: chat.id,
          senderId: event.payload.customer.id,
          senderRole: "customer",
          text: event.payload.text,
          createdAt: new Date().toISOString(),
          attachments: event.payload.attachments,
        };
        chats.push(chat);
        messages.push(msg);
        broadcast({ type: "chat-queued", payload: { chat, firstMessage: msg } });
        break;
      }
      case "agent-claim-chat": {
        chats = chats.map((c) =>
          c.id === event.payload.chatId
            ? { ...c, agent: event.payload.agent, status: "assigned" }
            : c,
        );
        const chat = chats.find((c) => c.id === event.payload.chatId);
        if (chat) {
          broadcast({ type: "chat-assigned", payload: { chat } });
        }
        break;
      }
      case "send-message": {
        const msg: Message = {
          id: randomUUID(),
          chatId: event.payload.chatId,
          senderId: event.payload.sender.id,
          senderRole: event.payload.sender.role,
          text: event.payload.text,
          createdAt: new Date().toISOString(),
          attachments: event.payload.attachments,
        };
        messages.push(msg);
        broadcast({ type: "message", payload: { message: msg } });
        break;
      }
      case "resolve-chat": {
        chats = chats.map((c) =>
          c.id === event.payload.chatId ? { ...c, status: "resolved" } : c,
        );
        const chat = chats.find((c) => c.id === event.payload.chatId);
        if (chat) {
          broadcast({ type: "chat-updated", payload: { chat } });
        }
        break;
      }
    }
  });

  socket.on("close", () => {
    clients.delete(socket);
  });
});

httpServer.listen(3030, () => {
  console.log(
    "Chat server: ws://localhost:3030 | GET http://localhost:3030/api/chat-sync",
  );
});

