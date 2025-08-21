"use client"

import ComponentCard from "@/components/common/ComponentCard"
import Button from "@/components/ui/button/Button"
import { ArrowRight, Clock, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface Visitor {
  id: number
  name: string
  dob: string
  sex: string
  national_id: string
  purpose: string
  access_level: string
  access_time: string
  access_code: string
  qr_hash: string
}

interface RecentVisitorsTableProps {
  visitors: Visitor[]
}

export function RecentVisitorsTable({ visitors }: RecentVisitorsTableProps) {
  const router = useRouter()

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return {
          color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          dot: "bg-green-500"
        }
      default:
        return {
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
          dot: "bg-blue-500"
        }
    }
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase()
  }

  const formatTime = (iso: string) => {
    try {
      return format(new Date(iso), "hh:mm a")
    } catch {
      return "Invalid time"
    }
  }

  return (
    <ComponentCard 
      title="Recent Activity"
      className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50"
    >
      <div className="p-1 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">Latest visitor check-ins and updates</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push("/visitor-logs")}
            className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-900/20"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {visitors.map((visitor) => {
            const statusConfig = getStatusConfig("Active")
            return (
              <div 
                key={visitor.id} 
                className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-200"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(visitor.name)}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4  dark:border-gray-800`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">{visitor.name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                      Access Code: {visitor.access_code}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">Purpose: {visitor.purpose}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(visitor.access_time)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ComponentCard>
  )
}
