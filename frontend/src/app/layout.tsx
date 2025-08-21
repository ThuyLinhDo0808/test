import { Outfit } from 'next/font/google';
import './globals.css';
import { Providers } from './providers'; // 👈 Import your client providers

const outfit = Outfit({
  subsets: ["latin"],
});

// 🚀 Metadata for favicon, title, description
export const metadata = {
  title: {
    default: "Aura",
    template: "%s | Aura", // Allows dynamic titles if needed
  },
  description: "Your AI receptionist",
  icons: {
    icon: "/favicon.png?v=1", // Notice versioning to force update
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className={`${outfit.className} dark:bg-gray-900 custom-scrollbar`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
