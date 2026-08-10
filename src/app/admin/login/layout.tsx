// Login page has its own minimal layout — no sidebar, no session guard
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "Inter, system-ui, sans-serif", background: "#f0fdfa" }}>
        {children}
      </body>
    </html>
  );
}
