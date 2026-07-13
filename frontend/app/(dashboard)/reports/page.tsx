"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Download, FileText, Loader2, Star } from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get("/reports");
        setReports(res.data);
      } catch (err) {
        console.error("Failed to fetch reports", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleDownload = async (path: string, title: string, format: string) => {
    if (!path) return;
    try {
      const token = localStorage.getItem("token") || "";
      const baseURL = api.defaults.baseURL || "http://localhost:8000/api";
      const apiHost = baseURL.endsWith("/api") ? baseURL.slice(0, -4) : baseURL;
      const url = `${apiHost}${path}?token=${token}`;
      
      const link = document.createElement("a");
      link.href = url;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 200);
    } catch (err) {
      console.error("Failed to download report:", err);
    }
  };

  return (
    <div className="reports-container">
      <div className="header-section">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">View and download generated intelligence reports</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader2 className="spinner" size={32} />
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state glass">
          <FileText size={48} className="empty-icon" />
          <h3>No reports generated</h3>
          <p>Reports will appear here once your agents complete their tasks.</p>
        </div>
      ) : (
        <div className="reports-grid">
          {reports.map((r: any) => (
            <div key={r.id} className="report-card glass">
              <div className="report-header">
                <div className="report-title-row">
                  <FileText className="report-icon" />
                  <h3>{r.title}</h3>
                </div>
                {r.is_favourite && <Star className="star-icon" size={20} fill="var(--accent)" color="var(--accent)" />}
              </div>
              
              <div className="report-body">
                <p className="summary">{r.executive_summary || "No summary available."}</p>
                <div className="meta-info">
                  <span className="badge">{r.report_type}</span>
                  <span className="meta-text">Score: {r.quality_score}</span>
                  <span className="meta-text">{r.word_count} words</span>
                </div>
              </div>

              <div className="report-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleDownload(r.pdf_path, r.title, "pdf")}
                  disabled={!r.pdf_path}
                >
                  <Download size={16} style={{ marginRight: '0.5rem' }}/> PDF
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleDownload(r.docx_path, r.title, "docx")}
                  disabled={!r.docx_path}
                >
                  <Download size={16} style={{ marginRight: '0.5rem' }}/> DOCX
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .header-section {
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 1.875rem;
          font-weight: 700;
        }

        .page-subtitle {
          color: #94a3b8;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .empty-icon {
          color: #334155;
          margin-bottom: 1rem;
        }

        .empty-state p {
          color: #94a3b8;
          margin-top: 0.5rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .report-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .report-title-row {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .report-icon {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .report-title-row h3 {
          font-size: 1.125rem;
          font-weight: 600;
          line-height: 1.4;
        }

        .report-body {
          flex: 1;
        }

        .summary {
          color: #cbd5e1;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .meta-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          color: #e2e8f0;
          text-transform: uppercase;
        }

        .meta-text {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .report-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          border-top: 1px solid var(--surface-border);
          padding-top: 1.5rem;
        }

        .report-actions button {
          font-size: 0.875rem;
          padding: 0.5rem;
        }

        .report-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
