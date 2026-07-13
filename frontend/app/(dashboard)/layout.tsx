"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FolderKanban, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      const fetchUser = async () => {
        try {
          const res = await api.get("/auth/me");
          setUser(res.data);
        } catch (err) {
          console.error("Failed to load user profile", err);
          localStorage.removeItem("token");
          router.push("/login");
        }
      };
      fetchUser();
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar glass ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>AgentForge AI</h2>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="nav-item logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar glass">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="user-profile">
            <div className="avatar">
              {user.full_name ? user.full_name[0].toUpperCase() : "U"}
            </div>
            <span>{user.full_name || user.username || "User"}</span>
          </div>
        </header>

        <main className="content-area animate-fade-in">
          {children}
        </main>
      </div>

      <style jsx>{`
        .dashboard-container {
          display: flex;
          min-height: 100vh;
          background: transparent;
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          z-index: 40;
        }

        .sidebar {
          width: 270px;
          display: flex;
          flex-direction: column;
          border-radius: 0;
          border-top: none;
          border-bottom: none;
          border-left: none;
          background: rgba(15, 23, 42, 0.35);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid var(--surface-border);
          z-index: 50;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sidebar-header {
          padding: 2rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-header h2 {
          font-size: 1.4rem;
          font-weight: 800;
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, var(--primary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .mobile-close {
          display: none;
          color: var(--foreground);
        }

        .sidebar-nav {
          flex: 1;
          padding: 0 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.85rem 1.2rem;
          border-radius: 12px;
          color: #94a3b8;
          font-weight: 500;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--foreground);
          padding-left: 1.4rem;
        }

        .nav-item.active {
          background: linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.02) 100%);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.25);
          box-shadow: inset 0 0 12px rgba(99, 102, 241, 0.05);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 25%;
          height: 50%;
          width: 3px;
          background: var(--primary);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 8px var(--primary);
        }

        .sidebar-footer {
          padding: 1.5rem 1.25rem;
        }

        .logout-btn {
          width: 100%;
          color: #fda4af;
          border: 1px solid rgba(244, 63, 94, 0.1);
        }

        .logout-btn:hover {
          background: rgba(244, 63, 94, 0.08);
          border-color: rgba(244, 63, 94, 0.2);
          color: #f43f5e;
          padding-left: 1.2rem;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: transparent;
        }

        .topbar {
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0 2.5rem;
          border-radius: 0;
          border-top: none;
          border-left: none;
          border-right: none;
          background: rgba(8, 7, 16, 0.25);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--surface-border);
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .mobile-menu-btn {
          display: none;
          color: var(--foreground);
          margin-right: auto;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.4rem 0.85rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .user-profile:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          font-size: 0.9rem;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }

        .user-profile span {
          font-weight: 600;
          font-size: 0.9rem;
          color: #e2e8f0;
        }

        .content-area {
          flex: 1;
          padding: 2.5rem;
          overflow-y: auto;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            inset: 0 auto 0 0;
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .mobile-close, .mobile-menu-btn {
            display: block;
          }

          .topbar {
            padding: 0 1.5rem;
            height: 64px;
          }

          .content-area {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
