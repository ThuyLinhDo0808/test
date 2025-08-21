"use client"

import { API_BASE_URL } from "@/lib/constants"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Eye, Trash2 } from "lucide-react"
import ComponentCard from "@/components/common/ComponentCard"
import Button from "@/components/ui/button/Button"
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Pagination from "@/components/tables/Pagination"
interface VisitorLog {
  id: number
  name: string
  dob: string
  card_id: string
  purpose: string
  access_time: string
  access_code: string
  qr_hash: string
}

export default function VisitorLogsClient() {
  const { status } = useSession()
  const router = useRouter()
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([])
  const { isOpen, openModal, closeModal } = useModal();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(visitorLogs.length / itemsPerPage)
  const paginatedLogs = visitorLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const fetchVisitorLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/visitors/`)
      const data = await res.json()
      if (Array.isArray(data.visitors)) {
        setVisitorLogs(data.visitors.reverse())
      } else {
        console.error("Expected visitors array in response:", data)
      }
    } catch (error) {
      console.error("Error fetching visitor logs:", error)
    }
  }
  const handleCloseModal = () => {
    setSelectedVisitor(null);
    closeModal();
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin")
    } else if (status === "authenticated") {
      fetchVisitorLogs()
    }
  }, [status, router])
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorLog | null>(null);

  const handleDelete = async (visitorId: number) => {
    try {
      await fetch(`${API_BASE_URL}/admin/visitors/delete_by_id/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: visitorId }),
      });

      // Optimistically remove the item from the list
      setVisitorLogs((logs) => logs.filter((log) => log.id !== visitorId));
    } catch (error) {
      console.error("Error deleting visitor:", error);
      // Optional: handle silently or log to analytics
    }
  };

function formatDobDDMMYYYY(input: string) {
  if (!input) return "";
  const s = String(input).trim();

  // 1) Y-M-D (with optional time, timezone, microseconds)
  //    e.g. "2004-05-12", "2004-05-12 00:00:00", "2004-05-12T00:00:00.000Z"
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    return `${d}/${mo}/${y}`; // 12/5/2004
  }

  // 2) D/M/Y (if it somehow already comes this way)
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(s);
  if (m) {
    const d = +m[1], mo = +m[2], y = +m[3];
    return `${d}/${mo}/${y}`;
  }

  // 3) Compact YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    const y = +s.slice(0, 4), mo = +s.slice(4, 6), d = +s.slice(6, 8);
    return `${d}/${mo}/${y}`;
  }

  // Fallback: show as-is
  return s;
}

function formatAccessTime(ts: string) {
  // Normalize: replace space with 'T' and trim microseconds to 3 digits
  const sanitized = ts
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1'); // ".512138" -> ".512"

  const dt = new Date(sanitized);
  if (isNaN(dt.getTime())) return ts; // fallback: show raw if unparseable

  const day = dt.getDate();                 // no leading zeros
  const month = dt.getMonth() + 1;          // 1-12
  const year = dt.getFullYear();

  let hours = dt.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;                // 12-hour clock
  const minutes = String(dt.getMinutes()).padStart(2, '0');
  const seconds = String(dt.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}${ampm}`;
}

  return (
    <div className="flex flex-col gap-8 p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Visitor Management</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Total: {visitorLogs.length} visitors</span>
        </div>
      </div>

      <ComponentCard title="Monitor and manage all visitor information" className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
                <th className="text-left py-1 px-16 text-base font-semibold text-gray-900 dark:text-gray-300">Name</th>
                <th className="text-left py-1 px-10 text-base font-semibold text-gray-900 dark:text-gray-300">DOB</th>
                <th className="text-left py-1 px-10 text-base font-semibold text-gray-900 dark:text-gray-300">Card ID</th>
                <th className="text-left py-1 px-14 text-base font-semibold text-gray-900 dark:text-gray-300">Purpose</th>
                <th className="text-left py-1 px-11 text-base font-semibold text-gray-900 dark:text-gray-300">Access Time</th>
                <th className="text-left py-1 px-3 text-base font-semibold text-gray-900 dark:text-gray-300">Access Code</th>
                <th className="text-left py-1 px-12 text-base font-semibold text-gray-900 dark:text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((visitor) => (
              <tr
                key={visitor.id}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-gray-800/30"
              >
                <td className="py-3 px-6 text-sm text-gray-800 dark:text-gray-200">{visitor.name}</td>
                <td className="py-3 px-6 text-sm text-gray-800 dark:text-gray-200">
                  {formatDobDDMMYYYY(visitor.dob)}
                </td>
                <td className="py-3 px-6 text-sm text-gray-800 dark:text-gray-200">{visitor.card_id}</td>
                <td className="py-3 px-6 text-sm text-gray-800 dark:text-gray-200">{visitor.purpose}</td>
                <td className="py-3 px-6 text-sm text-gray-800 dark:text-gray-200">
                  {formatAccessTime(visitor.access_time)}
                </td>
                <td className="py-3 px-6 text-sm font-mono text-gray-800 dark:text-gray-200">{visitor.access_code}</td>
                <td className="py-3 px-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVisitor(visitor);
                        openModal();
                      }}
                      className="px-2 py-1 text-xs"
                    >
                      <Eye className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(visitor.id)}
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {paginatedLogs.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-500 dark:text-gray-400">
                  No visitor logs available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ComponentCard>

      <Modal isOpen={isOpen} onClose={handleCloseModal}>
        <div className="p-6 max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
            Visitor Details
          </h2>

          {selectedVisitor && (
            <div className="grid grid-cols-[120px_1fr] gap-y-4 gap-x-6 text-base text-gray-800 dark:text-gray-200">
              {/* Name */}
              <div className="text-right font-medium text-gray-500 dark:text-gray-400">Name</div>
              <div className="font-semibold text-center text-gray-900 dark:text-white">
                {selectedVisitor.name}
              </div>

              {/* DOB */}
              <div className="text-right font-medium text-gray-500 dark:text-gray-400">DOB</div>
              <div className="text-center">{formatDobDDMMYYYY(selectedVisitor.dob)}</div>

              {/* Card ID */}
              <div className="text-right font-medium text-gray-500 dark:text-gray-400">Card ID</div>
              <div className="font-mono text-sm text-center text-gray-700 dark:text-gray-300">
                {selectedVisitor.card_id}
              </div>

              {/* Purpose */}
              <div className="text-right font-medium text-gray-500 dark:text-gray-400">Purpose</div>
              <div className="text-center">{selectedVisitor.purpose}</div>

              {/* Access Time */}
              <div className="text-right font-medium text-gray-500 dark:text-gray-400">Access Time</div>
              <div className="font-semibold text-blue-600 dark:text-blue-400 text-center">
                {formatAccessTime(selectedVisitor.access_time)}
              </div>


              {/* Access Code (highlighted) */}
              <div className="text-right font-medium text-gray-500 dark:text-gray-400">Access Code</div>
              <div className="text-2xl text-center font-extrabold text-green-600 dark:text-green-400 font-mono bg-green-50 dark:bg-green-900 px-4 py-2 rounded-lg shadow-inner">
                {selectedVisitor.access_code}
              </div>
            </div>
          )}
        </div>
      </Modal>
      {/* Pagination */}
      {visitorLogs.length > 0 && (
        <div className="flex flex-col gap-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={visitorLogs.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}
    </div>
  )
}
