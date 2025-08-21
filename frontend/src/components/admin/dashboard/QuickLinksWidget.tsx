"use client"

import { FileText, HelpCircle, Upload, ArrowRight, WebhookIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { API_BASE_URL } from "@/lib/constants"

interface Visitor {
  name: string
  dob: string
  card_id: string
  purpose?: string
  access_time: string
  access_code: string
  qr_hash: string
}

interface QuickLinksWidgetProps {
  visitors?: Visitor[]
}

export function QuickLinksWidget({ visitors = [] }: QuickLinksWidgetProps) {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalVisitors: 0,
    uploadCount: 0,
    activeFAQs: 0,
  })
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [faqsResponse, , uploadsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/faqs/`).catch(() => null),
          fetch(`${API_BASE_URL}/admin/webhook/config/`).catch(() => null),
          fetch(`${API_BASE_URL}/admin/doc/all_docs/`).catch(() => null),
        ]);

        let activeFAQs = 0;
        let uploadCount = 0;

        if (faqsResponse?.ok) {
          const faqsData = await faqsResponse.json();
          activeFAQs = Array.isArray(faqsData.faqs) ? faqsData.faqs.length : 0;
        }

        if (uploadsResponse?.ok) {
          const uploadsData = await uploadsResponse.json();
          uploadCount = uploadsData.documents
            ? Object.keys(uploadsData.documents).length
            : 0;
        }


        setStats((prev) => ({
          ...prev,
          uploadCount,
          activeFAQs,
        }));
      } catch (error) {
        console.error("Error fetching quick links stats:", error);
      }
    };

    fetchStats();
  }, []);

  // 🔁 Always update totalVisitors when visitors prop changes
  useEffect(() => {
    setStats((prev) => {
      if (prev.totalVisitors !== visitors.length) {
        return {
          ...prev,
          totalVisitors: visitors.length,
        };
      }
      return prev;
    });
  }, [visitors]);


  const quickLinks = [
    {
      title: "Visitor Logs",
      description: "View and manage all visitor records",
      icon: FileText,
      path: "/visitor-logs",
      color: "blue",
      stats: `${stats.totalVisitors} total visitors`,
    },
    {
      title: "Upload Center",
      description: "Upload visitor documents and files",
      icon: Upload,
      path: "/upload",
      color: "purple",
      stats: `${stats.uploadCount} total uploads`,
    },
    {
      title: "FAQ Management",
      description: "Update frequently asked questions",
      icon: HelpCircle,
      path: "/FAQs-Update",
      color: "green",
      stats: `${stats.activeFAQs} active FAQs`,
    },
    {
      title: "Webhook Config",
      description: "Configure notification webhooks",
      icon: WebhookIcon,
      path: "/webhook-config/",
      color: "orange",
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
        text: "text-blue-700 dark:text-blue-300",
        iconBg: "bg-blue-500/10 dark:bg-blue-400/10",
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      purple: {
        bg: "from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
        text: "text-purple-700 dark:text-purple-300",
        iconBg: "bg-purple-500/10 dark:bg-purple-400/10",
        iconColor: "text-purple-600 dark:text-purple-400",
      },
      green: {
        bg: "from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
        text: "text-green-700 dark:text-green-300",
        iconBg: "bg-green-500/10 dark:bg-green-400/10",
        iconColor: "text-green-600 dark:text-green-400",
      },
      orange: {
        bg: "from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20",
        text: "text-orange-700 dark:text-orange-300",
        iconBg: "bg-orange-500/10 dark:bg-orange-400/10",
        iconColor: "text-orange-600 dark:text-orange-400",
      },
    }
    return colors[color as keyof typeof colors]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Access frequently used features</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link) => {
          const colorClasses = getColorClasses(link.color)
          return (
            <div
              key={link.title}
              className={`relative overflow-hidden border-0 bg-gradient-to-br ${colorClasses.bg} cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg group h-32 rounded-lg`}
              onClick={() => router.push(link.path)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  router.push(link.path)
                }
              }}
            >
              <div className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${colorClasses.iconBg}`}>
                    <link.icon className={`h-5 w-5 ${colorClasses.iconColor}`} />
                  </div>
                  <ArrowRight
                    className={`h-4 w-4 ${colorClasses.text} opacity-0 group-hover:opacity-100 transition-opacity`}
                  />
                </div>
                <div className="space-y-1">
                  <h3 className={`font-semibold text-sm ${colorClasses.text}`}>{link.title}</h3>
                  <p className={`text-xs ${colorClasses.text} opacity-80 line-clamp-2`}>{link.description}</p>
                  <p className={`text-xs ${colorClasses.text} opacity-60`}>{link.stats}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
