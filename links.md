# SES Social Media API Endpoints

## Base

- **HTTP origin:** `http://10.0.10.42:8080`  
  (or same host as the app; HTTPS uses same origin)
- **WebSocket:** `ws://10.0.10.42:8080/SES/WebLiveChat`
- **Auth:** session cookies (`credentials: "include"`)

> **Note:** WhatsApp paths include `/app/`. Messenger and Instagram Inbox do **not**.

---

## WhatsApp

Base path: `/SES/app/SocialMedia/whatsapp`

| Purpose | Method | Endpoint |
|---|---|---|
| Queue + assigned chats | `POST` | `/SES/app/SocialMedia/whatsapp/getQueueNAssignedChats` |
| Load conversation | `POST` | `/SES/app/SocialMedia/whatsapp/loadConversationById` |
| Ticket list by chat | `POST` | `/SES/app/SocialMedia/whatsapp/getTicketListByChatId` |
| Create ticket review | `POST` | `/SES/app/SocialMedia/whatsapp/createTicketReviewByChatId` |
| Assign chat | `POST` | `/SES/app/SocialMedia/whatsapp/assignChat` |
| Transfer chat | `POST` | `/SES/app/SocialMedia/whatsapp/transferChat` |

### Full URLs (example host)

- `http://10.0.10.42:8080/SES/app/SocialMedia/whatsapp/getQueueNAssignedChats`
- `http://10.0.10.42:8080/SES/app/SocialMedia/whatsapp/loadConversationById`
- `http://10.0.10.42:8080/SES/app/SocialMedia/whatsapp/getTicketListByChatId`
- `http://10.0.10.42:8080/SES/app/SocialMedia/whatsapp/createTicketReviewByChatId`
- `http://10.0.10.42:8080/SES/app/SocialMedia/whatsapp/assignChat`
- `http://10.0.10.42:8080/SES/app/SocialMedia/whatsapp/transferChat`

---

## Messenger

Base path: `/SES/SocialMedia/messenger`

| Purpose | Method | Endpoint |
|---|---|---|
| Queue + assigned chats | `POST` | `/SES/SocialMedia/messenger/getQueueNAssignedChats` |
| Load conversation | `POST` | `/SES/SocialMedia/messenger/loadConversationById` |
| Ticket list by chat | `POST` | `/SES/SocialMedia/messenger/getTicketListByChatId` |
| Create ticket review | `POST` | `/SES/SocialMedia/messenger/createTicketReviewByChatId` |
| Assign chat | `POST` | `/SES/SocialMedia/messenger/assignChat` |
| Transfer chat | `POST` | `/SES/SocialMedia/messenger/transferChat` |
| Close chat | `POST` | `/SES/SocialMedia/messenger/closeChat` |
| Auto-assignment status | `POST` | `/SES/SocialMedia/messenger/getAutoAssignmentStatus` |
| Supervisor dashboard | `POST` | `/SES/SocialMedia/messenger/dashboard` |

### Full URLs (example host)

- `http://10.0.10.42:8080/SES/SocialMedia/messenger/getQueueNAssignedChats`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/loadConversationById`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/getTicketListByChatId`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/createTicketReviewByChatId`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/assignChat`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/transferChat`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/closeChat`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/getAutoAssignmentStatus`
- `http://10.0.10.42:8080/SES/SocialMedia/messenger/dashboard`

---

## Instagram Inbox

Base path: `/SES/SocialMedia/instagram-inbox`

| Purpose | Method | Endpoint |
|---|---|---|
| Queue + assigned chats | `POST` | `/SES/SocialMedia/instagram-inbox/getQueueNAssignedChats` |
| Load conversation | `POST` | `/SES/SocialMedia/instagram-inbox/loadConversationById` |
| Ticket list by chat | `POST` | `/SES/SocialMedia/instagram-inbox/getTicketListByChatId` |
| Create ticket review | `POST` | `/SES/SocialMedia/instagram-inbox/createTicketReviewByChatId` |
| Assign chat | `POST` | `/SES/SocialMedia/instagram-inbox/assignChat` |
| Transfer chat | `POST` | `/SES/SocialMedia/instagram-inbox/transferChat` |
| Close chat | `POST` | `/SES/SocialMedia/instagram-inbox/closeChat` |
| Auto-assignment status | `POST` | `/SES/SocialMedia/instagram-inbox/getAutoAssignmentStatus` |
| Supervisor dashboard | `POST` | `/SES/SocialMedia/instagram-inbox/dashboard` |

### Full URLs (example host)

- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/getQueueNAssignedChats`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/loadConversationById`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/getTicketListByChatId`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/createTicketReviewByChatId`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/assignChat`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/transferChat`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/closeChat`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/getAutoAssignmentStatus`
- `http://10.0.10.42:8080/SES/SocialMedia/instagram-inbox/dashboard`