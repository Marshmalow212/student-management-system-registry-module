import { Geist, Geist_Mono, Public_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ReduxProvider } from "@/redux/provider"
import { cn } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"
import { prisma } from "@/lib/prisma"

const APP_ENV = process.env.APP_ENV || "development"

function dbConnectionCheck() {
  if (APP_ENV in ["dev", "sandbox","development", "test"]) {
    console.log("connecting to database url from .env file: ", process.env.DATABASE_URL);
  }
  prisma.$connect().then(() => {
    console.log(` [${APP_ENV}] Connected to the database successfully.`);
  }).catch((error) => {
    console.error(` [${APP_ENV}] Error connecting to the database:`, error);
  });
}

const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  dbConnectionCheck(); // Call the database connection check function

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", publicSans.variable)}
    >
      <body>
        <TooltipProvider>
          <ReduxProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </ReduxProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
