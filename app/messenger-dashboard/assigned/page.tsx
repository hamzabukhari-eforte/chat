import { AssignedChatsTable } from "@/components/sections/supervisor-dashboard/ManageChatsTable";
import { messengerDummyAssignedChats } from "@/lib/dashboard/messengerDummyData";

export default function MessengerAssignedPage() {
  return <AssignedChatsTable rows={messengerDummyAssignedChats} />;
}
