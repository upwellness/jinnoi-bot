export const metadata = {
  title: 'LINE Knowledge Bot — Admin',
  description: 'Admin dashboard for LINE Knowledge Assistant',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
