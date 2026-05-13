import { AssignedChatsTable } from "@/components/sections/supervisor-dashboard/ManageChatsTable";
import { dummyAssignedChats } from "@/lib/dashboard/dummyData";

export default function DashboardAssignedPage() {
  return <AssignedChatsTable rows={dummyAssignedChats} />;
}
