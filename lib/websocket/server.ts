import { createServer } from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import type { Chat, Message, IncomingEvent, OutgoingEvent, User } from "../chat/types";

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

const clients = new Map<any, User>();
let chats: Chat[] = [];
let messages: Message[] = [];

function broadcast(event: IncomingEvent) {
  const data = JSON.stringify(event);
  for (const socket of wss.clients) {
    if (socket.readyState === 1) {
      socket.send(data);
    }
  }
}

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
  // eslint-disable-next-line no-console
  console.log("WebSocket chat server listening on ws://localhost:3030");
});

