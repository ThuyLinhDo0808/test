"use client";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useSidebar } from "@/context/SidebarContext";
import React from "react";
import { useSession } from "next-auth/react";
const AppHeader: React.FC = () => {
  const { status } = useSession();
  const { } = useSidebar();
  
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3 pr-2">
      <ThemeToggleButton />
      {status === "authenticated" && <NotificationDropdown />}
      <UserDropdown />
    </div>

  );
};

export default AppHeader;
