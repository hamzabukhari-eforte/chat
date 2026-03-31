import { createServer } from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

const clients = new Map();
let chats = [];
let messages = [];

function broadcast(event) {
  const data = JSON.stringify(event);
  for (const socket of wss.clients) {
    if (socket.readyState === 1) {
      socket.send(data);
    }
  }
}

function lastMessageForChat(chatId) {
  const forChat = messages.filter((m) => m.chatId === chatId);
  if (!forChat.length) return undefined;
  return forChat.reduce((a, b) =>
    new Date(a.createdAt) > new Date(b.createdAt) ? a : b,
  );
}

const corsHeaders = {
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
    const chatsWithLast = chats.map((c) => ({
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
    let event;
    try {
      event = JSON.parse(String(data));
    } catch {
      console.error("Invalid WS message", data);
      return;
    }

    switch (event.type) {
      case "login":
        clients.set(socket, event.payload.user);
        break;
      case "customer-start-chat": {
        const chat = {
          id: randomUUID(),
          customer: event.payload.customer,
          status: "queued",
          createdAt: new Date().toISOString(),
        };
        const msg = {
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
        console.log("New chat queued", chat.id);
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
          console.log("Chat claimed", chat.id, "by", event.payload.agent.name);
          broadcast({ type: "chat-assigned", payload: { chat } });
        }
        break;
      }
      case "send-message": {
        const msg = {
          id: randomUUID(),
          chatId: event.payload.chatId,
          senderId: event.payload.sender.id,
          senderRole: event.payload.sender.role,
          text: event.payload.text,
          createdAt: new Date().toISOString(),
          attachments: event.payload.attachments,
        };
        messages.push(msg);
        console.log("Message in chat", msg.chatId, "from", msg.senderRole, msg.attachments ? `with ${msg.attachments.length} attachment(s)` : "");
        broadcast({ type: "message", payload: { message: msg } });
        break;
      }
      case "resolve-chat": {
        chats = chats.map((c) =>
          c.id === event.payload.chatId ? { ...c, status: "resolved" } : c,
        );
        const chat = chats.find((c) => c.id === event.payload.chatId);
        if (chat) {
          console.log("Chat resolved", chat.id);
          broadcast({ type: "chat-updated", payload: { chat } });
        }
        break;
      }
      default:
        console.warn("Unknown event type", event.type);
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

