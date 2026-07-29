"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { QuickLinksWidget } from "@/components/admin/dashboard/QuickLinksWidget"
import { VisitorCharts } from "@/components/admin/dashboard/VisitorCharts"
import { RecentVisitorsTable } from "@/components/admin/dashboard/RecentVisitorsTable"
import { API_BASE_URL } from "@/lib/constants"
export default function DashboardClient() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [allVisitors, setAllVisitors] = useState([])
  const fetchVisitors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/visitors/`)
      if (!res.ok) {
        console.error("Failed to fetch visitors:", res.statusText)
        setAllVisitors([])
        return
      }

      const data = await res.json()
      console.log("Fetched visitor response:", data)

      if (Array.isArray(data.visitors)) {
        setAllVisitors(data.visitors.reverse())
      } else {
        console.error("Unexpected response format. Expected 'visitors' to be an array:", data)
        setAllVisitors([])
      }
    } catch (err) {
      console.error("Error fetching visitors:", err)
      setAllVisitors([])
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin")
      return
    }

    if (status === "authenticated") {
      fetchVisitors()
    }
  }, [status, router])


  if (status === "loading")
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome, {session?.user?.name}</h1>
        <p className="text-gray-600 dark:text-gray-400">Monitor visitor activity and manage access to your building</p>
      </div>


      {/* Quick Links */}
      <QuickLinksWidget visitors={allVisitors}/>

      {/* Charts */}
      <VisitorCharts visitors={allVisitors}/>

      {/* Recent Visitors */}
      <RecentVisitorsTable visitors={allVisitors.slice(0,5)} />
    </div>
  )
}
