"use client"

import ComponentCard from "@/components/common/ComponentCard"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts"

interface Visitor {
  name: string
  dob: string
  card_id: string
  purpose: string
  access_time: string
  access_code: string
  qr_hash: string
}

interface VisitorChartsProps {
  visitors: Visitor[]
}

export function VisitorCharts({ visitors = [] }: VisitorChartsProps) {
  // Process visitor data for charts
  const processWeeklyData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const weeklyData = days.map((day) => ({
      date: day,
      visitors: 0
    }))

    visitors.forEach((visitor) => {
      const date = new Date(visitor.access_time)
      const dayIndex = date.getDay()
      weeklyData[dayIndex].visitors++
    })

    return weeklyData
  }

  const processHourlyData = () => {
    const hours = Array.from({ length: 9 }, (_, i) => ({
      time: `${i + 9}-${i + 10} ${i + 9 < 12 ? "AM" : "PM"}`,
      visitors: 0,
    }))

    visitors.forEach((visitor) => {
      const hour = new Date(visitor.access_time).getHours()
      if (hour >= 9 && hour <= 17) {
        hours[hour - 9].visitors++
      }
    })

    return hours
  }

  const weeklyData = processWeeklyData()
  const hourlyData = processHourlyData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics Overview</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Visitor insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComponentCard
          title="Weekly Traffic"
          className="p-1 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50"
        >
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Visitor trends</p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                  name="Visitors"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ComponentCard>
        <ComponentCard
          title="Peak Hours Analysis"
          className="p-1 border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50"
        >
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visitor distribution throughout the day
            </p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="visitors" fill="url(#colorGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>

              </BarChart>
            </ResponsiveContainer>
          </div>
        </ComponentCard>

      </div>

    </div>
  )
}
