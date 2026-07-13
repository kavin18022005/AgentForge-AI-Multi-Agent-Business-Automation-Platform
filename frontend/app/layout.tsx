import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentForge AI",
  description: "Advanced Agentic Workflow Builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="bg-mesh-container">
          <div className="bg-blob blob-primary"></div>
          <div className="bg-blob blob-accent"></div>
          <div className="bg-blob blob-cyan"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
