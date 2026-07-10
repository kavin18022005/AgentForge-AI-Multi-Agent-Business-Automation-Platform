"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { 
  FolderKanban, 
  CheckCircle, 
  XCircle, 
  FileText,
  Activity,
  Zap
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/analytics/dashboard");
        setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleBuyCredits = async () => {
    try {
      const res = await api.post("/auth/buy-credits?amount=100");
      setStats((prev: any) => ({
        ...prev,
        ai_credits_remaining: res.data.ai_credits
      }));
      alert("Successfully purchased 100 AI Credits!");
    } catch (err) {
      console.error("Failed to buy credits", err);
      alert("Failed to purchase credits.");
    }
  };

  if (loading) {
    return <div className="loading-state">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-content">
      <div className="header-section">
        <h1 className="page-title">Overview</h1>
        <p className="page-subtitle">Here's what's happening with your agents today.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon" style={{ background: "rgba(99, 102, 241, 0.2)", color: "var(--primary)" }}>
            <FolderKanban size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Projects</span>
            <span className="stat-value">{stats?.total_projects || 0}</span>
          </div>
        </div>
        
        <div className="stat-card glass">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.2)", color: "var(--success)" }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{stats?.completed_projects || 0}</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.2)", color: "var(--error)" }}>
            <XCircle size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Failed</span>
            <span className="stat-value">{stats?.failed_projects || 0}</span>
          </div>
        </div>

        <div className="stat-card glass">
          <div className="stat-icon" style={{ background: "rgba(139, 92, 246, 0.2)", color: "var(--accent)" }}>
            <FileText size={24} />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Reports</span>
            <span className="stat-value">{stats?.total_reports || 0}</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card glass">
          <h2 className="section-title">
            <Activity size={20} />
            Performance
          </h2>
          <div className="metrics-row">
            <div className="metric">
              <span className="metric-label">Success Rate</span>
              <span className="metric-value">{stats?.success_rate || 0}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">Avg. Completion Time</span>
              <span className="metric-value">{stats?.avg_completion_minutes || 0} min</span>
            </div>
          </div>
        </div>

        <div className="chart-card glass">
          <h2 className="section-title">
            <Zap size={20} />
            AI Credits
          </h2>
          <div className="credits-display">
            <span className="credits-amount">{stats?.ai_credits_remaining || 0}</span>
            <span className="credits-label">Credits Remaining</span>
          </div>
          <button className="btn btn-secondary" style={{ marginTop: "1rem" }} onClick={handleBuyCredits}>
            Buy More Credits
          </button>
        </div>
      </div>

      <style jsx>{`
        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #94a3b8;
        }

        .header-section {
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 1.875rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .page-subtitle {
          color: #94a3b8;
          margin-top: 0.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-details {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .chart-card {
          padding: 1.5rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--foreground);
        }

        .metrics-row {
          display: flex;
          gap: 2rem;
        }

        .metric {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.875rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary);
        }

        .credits-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
        }

        .credits-amount {
          font-size: 3rem;
          font-weight: 700;
          color: var(--accent);
          line-height: 1;
        }

        .credits-label {
          color: #94a3b8;
          margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
