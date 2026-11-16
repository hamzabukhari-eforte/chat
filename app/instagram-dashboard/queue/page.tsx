import { QueueChatsTable } from "@/components/sections/supervisor-dashboard/ManageChatsTable";
import { instagramDummyQueueChats } from "@/lib/dashboard/instagramDummyData";

export default function InstagramQueuePage() {
  return <QueueChatsTable rows={instagramDummyQueueChats} />;
}
