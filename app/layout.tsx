import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { getPublicAppSettings } from '@/lib/app-settings'
import { Providers } from '@/app/providers'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings()

  return {
    title: settings.app_title,
    description: settings.company_tagline,
    generator: 'v0.app',
    icons: {
      icon: [
        {
          url: '/icon-light-32x32.png',
          media: '(prefers-color-scheme: light)',
        },
        {
          url: '/icon-dark-32x32.png',
          media: '(prefers-color-scheme: dark)',
        },
        {
          url: '/icon.svg',
          type: 'image/svg+xml',
        },
      ],
      apple: '/apple-icon.png',
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
