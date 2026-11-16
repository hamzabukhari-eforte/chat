import { AssignedChatsTable } from "@/components/sections/supervisor-dashboard/ManageChatsTable";
import { instagramDummyAssignedChats } from "@/lib/dashboard/instagramDummyData";

export default function InstagramAssignedPage() {
  return <AssignedChatsTable rows={instagramDummyAssignedChats} />;
}
