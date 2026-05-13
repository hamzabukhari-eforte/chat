import { QueueChatsTable } from "@/components/sections/supervisor-dashboard/ManageChatsTable";
import { dummyQueueChats } from "@/lib/dashboard/dummyData";

export default function DashboardQueuePage() {
  return <QueueChatsTable rows={dummyQueueChats} />;
}
