// app/(cozinha)/layout.tsx
export default function CozinhaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      {children}
    </div>
  )
}
