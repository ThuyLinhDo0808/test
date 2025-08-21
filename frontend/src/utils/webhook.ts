export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString) return "Never"
  const date = new Date(dateString)
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date()
}

export const getDaysUntilExpiry = (expiresAt: string): number => {
  const days = Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  return days
}
