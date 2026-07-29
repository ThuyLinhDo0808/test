"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import React from "react";
import { useSession } from "next-auth/react";
<<<<<<< HEAD
import { usePathname } from "next/navigation";
const AppHeader: React.FC = () => {
  const { status } = useSession();
  const { } = useSidebar();
  const pathname = usePathname();

  return (
    <div className="">
      <div className="fixed gap-3 pr-2 bottom-4 left-4 z-50 flex items-center">
        <ThemeToggleButton />
      </div>
      <div className="fixed gap-3 pr-2 top-4 right-4 z-50 flex items-center">
        {status === "authenticated" && <NotificationDropdown />}
        {!(pathname === "/chat" && status === "unauthenticated") && <UserDropdown />}
      </div>
    </div>
=======
const AppHeader: React.FC = () => {
  const { status } = useSession();
  const { } = useSidebar();
  
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 pr-2">
      <ThemeToggleButton />
      {status === "authenticated" && <NotificationDropdown />}
      <UserDropdown />
    </div>

>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  );
};

export default AppHeader;
