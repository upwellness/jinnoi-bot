import { Inter, Noto_Sans_Thai, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-thai',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata = {
  title: 'จิ้นน้อย · Admin Console',
  description: 'Admin dashboard for LINE Knowledge Assistant',
}

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme') || 'system';
    var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = stored;
  } catch (e) {}
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning className={`${inter.variable} ${notoThai.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-surface text-fg antialiased">
        {children}
      </body>
    </html>
  )
}
