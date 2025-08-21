"use client";

import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { API_BASE_URL } from "@/lib/constants";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

interface Notification {
  taskId: string;
  fileName: string;
  task_status: string;
}


export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  const toggleDropdown = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (!nextState) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/doc/get_all_tasks/`);
      const { tasks } = await res.json();

      const newNotis: Notification[] = [];

      // For each task, check its status
      for (const task of tasks) {
        try {
          const taskRes = await fetch(`${API_BASE_URL}/admin/doc/get_task/${task.task_id}/`);
          const data = await taskRes.json();

          if (data.task_status === "SUCCESS") {
            newNotis.push({
              taskId: task.task_id,
              fileName: task.file_name,
              task_status: data.task_status,
            });
          }
        } catch (error) {
          console.error(`Failed to check status for task ${task.task_id}:`, error);
        }
      }

      setNotifications(newNotis);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  // Clear the notification from the server 
  const handleClearNotifications = async  () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doc/delete_success_tasks/`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete success tasks");
      }

      setNotifications([]);
    } catch (err) {
      console.error("Error clearing notifications:", err);
    }
  };

  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
        </div>

        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {!notifications || notifications.length === 0 ? (
            <li className="text-center py-4 text-gray-500 dark:text-gray-400">No new notifications</li>
          ) : (
            notifications.map((noti, index) => (
              <li
                key={index}
                className="flex justify-between items-start p-3 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    Document <strong>{noti.fileName}</strong> has finished uploading.
                  </p>
                </div>
              </li>
            ))
          )}
        </ul>

        {notifications && notifications.length > 0 && (
          <button
            onClick={handleClearNotifications}
            className="mt-4 w-full text-sm font-medium text-center text-red-600 border-t border-gray-200 pt-2 hover:underline dark:border-gray-700"
          >
            Delete Notifications
          </button>
        )}
      </Dropdown>
    </div>
  );
}
