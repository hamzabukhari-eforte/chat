import { QueueChatsTable } from "@/components/sections/supervisor-dashboard/ManageChatsTable";
import { messengerDummyQueueChats } from "@/lib/dashboard/messengerDummyData";

export default function MessengerQueuePage() {
  return <QueueChatsTable rows={messengerDummyQueueChats} />;
}
