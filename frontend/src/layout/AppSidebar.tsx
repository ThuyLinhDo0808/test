"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  ChatIcon,
  FileIcon
} from "../icons/index";
import { HelpCircle, HomeIcon, WebhookIcon, WorkflowIcon } from "lucide-react";

interface AppSidebarProps {
  role: "admin" | "visitor";
}

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const getNavItems = (role: "admin" | "visitor"): NavItem[] => {
  if (role === "admin") {
    return [
      { name: "Upload Files", icon: <FileIcon />, path: "/upload" },
      { name: "Manage FAQs", icon: <HelpCircle />, path: "/FAQs-Update" },
      { name: "Workflow", icon: <WorkflowIcon />, path: "/workflow" },
      { name: "Webhook Config", icon: <WebhookIcon />, path: "/webhook-config" }
    ];
  }

  return [
    { name: "Home", icon: <HomeIcon />, path: "/" },
    { name: "Quick Chat", icon: <ChatIcon />, path: "/chat" },
    { name: "FAQs", icon: <HelpCircle />, path: "/FAQs" }
  ];
};

const AppSidebar: React.FC<AppSidebarProps> = ({ role }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const renderMenuItems = (navItems: NavItem[]) => (
    <ul className="flex flex-col gap-4">
      {navItems.map((nav) => (
        <li key={nav.name}>
          <Link
            href={nav.path || "#"}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
              isActive(nav.path || "")
                ? "bg-gray-200 text-black dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-black dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            }`}
          >
            <span>{nav.icon}</span>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span>{nav.name}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
  
  // const isActive = (path: string) => path === pathname;
  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  return (

    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 text-gray-900 h-screen transition-all duration-300 ease-in-out z-9  
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href={role === "admin" ? "/dashboard" : "/"}>
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.png"
                alt="Logo"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.png"
                alt="Logo"
                width={150}
                height={10}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.png"
              alt="Logo"
              width={42}
              height={42}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              {renderMenuItems(getNavItems(role))}
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
