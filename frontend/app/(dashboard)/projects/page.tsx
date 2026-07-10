"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { 
  Plus, 
  Search, 
  Loader2, 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  PlayCircle, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Clock, 
  Coins, 
  Eye, 
  Calendar,
  Sparkles,
  AlertCircle
} from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ title: "", goal: "" });
  const [creating, setCreating] = useState(false);

  // Project Detail Console State
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await api.get(`/projects?search=${search}`);
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search]);

  // Load tasks & uploads when a project is selected
  useEffect(() => {
    if (!selectedProject) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const loadProjectDetails = async () => {
      try {
        const tasksRes = await api.get(`/projects/${selectedProject.id}/tasks`);
        setTasks(tasksRes.data);
        
        const uploadsRes = await api.get(`/uploads/${selectedProject.id}`);
        setUploads(uploadsRes.data);
      } catch (err) {
        console.error("Failed to load project tasks/uploads", err);
      }
    };

    loadProjectDetails();

    // Connect WebSocket if project is running
    if (selectedProject.status === "running" || selectedProject.status === "pending") {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const wsUrl = apiBase.replace("http", "ws") + "/ws/" + selectedProject.id;
      
      console.log("Connecting WebSocket to", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log("WebSocket message received:", msg);

        if (msg.type === "agent_start") {
          // Add or update task to running
          setTasks(prev => {
            const index = prev.findIndex(t => t.agent_type === msg.agent);
            if (index > -1) {
              const updated = [...prev];
              updated[index] = { ...updated[index], status: "running" };
              return updated;
            } else {
              return [...prev, { id: msg.agent, agent_type: msg.agent, status: "running", title: `Executing ${msg.agent}`, order: prev.length + 1 }];
            }
          });
          setSelectedProject((prev: any) => prev ? { ...prev, current_agent: msg.agent, progress: msg.progress || prev.progress } : null);
        } else if (msg.type === "agent_complete") {
          // Update task to completed
          setTasks(prev => {
            return prev.map(t => t.agent_type === msg.agent ? { 
              ...t, 
              status: "completed", 
              output_data: msg.data,
              duration_seconds: msg.duration 
            } : t);
          });
          setSelectedProject((prev: any) => prev ? { ...prev, current_agent: "", progress: msg.progress || prev.progress } : null);
        } else if (msg.type === "workflow_complete") {
          setSelectedProject((prev: any) => prev ? { ...prev, status: "completed", progress: 100.0 } : null);
          fetchProjects();
        } else if (msg.type === "error") {
          setSelectedProject((prev: any) => prev ? { ...prev, status: "failed" } : null);
          fetchProjects();
        }
      };

      ws.onclose = () => console.log("WebSocket disconnected");
      ws.onerror = (err) => console.error("WebSocket error:", err);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedProject?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post("/projects", newProject);
      setShowModal(false);
      setNewProject({ title: "", goal: "" });
      fetchProjects();
      // Auto open detail view of the newly created project
      setSelectedProject(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to create project. Ensure you have credits.");
    } finally {
      setCreating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/uploads/${selectedProject.id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      // Refresh uploads
      const uploadsRes = await api.get(`/uploads/${selectedProject.id}`);
      setUploads(uploadsRes.data);
    } catch (err) {
      console.error("Upload failed", err);
      alert("File upload failed. Supported formats: PDF, DOCX, TXT, CSV, XLSX.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReport = async (format: string) => {
    if (!selectedProject) return;
    try {
      const res = await api.get(`/reports/${selectedProject.id}/download/${format}`, {
        responseType: "blob",
      });
      
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Determine file name from content-disposition header if present
      let filename = `Report.${format}`;
      const disposition = res.headers["content-disposition"];
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      } else {
        const title = selectedProject.title ? selectedProject.title.replace(/\s+/g, "_") : "Report";
        filename = `${title}_Intelligence_Report.${format}`;
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      
      // Delay removal and revocation to let the browser process the download with the correct filename
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 200);
    } catch (err) {
      console.error("Failed to download report:", err);
      // Fallback
      const token = localStorage.getItem("token") || "";
      const url = `http://localhost:8000/api/reports/${selectedProject.id}/download/${format}?token=${token}`;
      window.open(url, "_blank");
    }
  };

  // Helper to render task status icon
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="status-ico success-ico" size={20} />;
      case "running":
        return <Loader2 className="status-ico spinner-ico" size={20} />;
      case "failed":
        return <XCircle className="status-ico error-ico" size={20} />;
      default:
        return <PlayCircle className="status-ico pending-ico" size={20} />;
    }
  };

  const renderAgentLogo = (agentType: string) => {
    return <Sparkles size={16} color="var(--primary)" />;
  };

  return (
    <div className="projects-container">
      <div className="header-flex">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Track and configure multi-agent execution pipelines</p>
        </div>
        <button className="btn btn-primary create-btn" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>New Project</span>
        </button>
      </div>

      <div className="search-bar">
        <Search className="search-icon" size={20} />
        <input 
          type="text" 
          placeholder="Search projects..." 
          className="search-input glass"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader2 className="spinner" size={32} />
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state glass">
          <h3>No projects found</h3>
          <p>Create a new project to kick off the AI agent workflow.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p: any) => (
            <div key={p.id} className="project-card glass hover-card" onClick={() => setSelectedProject(p)}>
              <div className="project-header">
                <h3>{p.title}</h3>
                <span className={`status-badge ${p.status}`}>{p.status}</span>
              </div>
              <p className="project-goal">{p.goal}</p>
              <div className="project-footer">
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${p.progress}%` }}></div>
                </div>
                <span className="progress-text">{p.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass animate-fade-in">
            <h2>Create New Project</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  placeholder="E.g., Launching a SaaS App"
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Goal / Objective (Prompt)</label>
                <textarea 
                  className="form-input" 
                  rows={4}
                  required
                  placeholder="Describe your business objective. The agents will build a business plan, financial model, and marketing strategy around this goal."
                  value={newProject.goal}
                  onChange={e => setNewProject({...newProject, goal: e.target.value})}
                ></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating} style={{ width: "auto" }}>
                  {creating ? <Loader2 className="spinner" size={20} /> : "Launch Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAILED CONSOLE MODAL */}
      {selectedProject && (
        <div className="modal-overlay">
          <div className="console-modal glass animate-fade-in">
            <div className="console-header">
              <div>
                <div className="console-title-row">
                  <h2>{selectedProject.title}</h2>
                  <span className={`status-badge ${selectedProject.status}`}>{selectedProject.status}</span>
                </div>
                <p className="console-subtitle">Project ID: {selectedProject.id}</p>
              </div>
              <button className="console-close-btn" onClick={() => setSelectedProject(null)}>✕</button>
            </div>

            <div className="console-layout">
              {/* Left Column: Info & Uploads */}
              <div className="console-sidebar">
                <div className="console-section glass">
                  <h3>Goal Statement</h3>
                  <p className="goal-text">{selectedProject.goal}</p>
                  {selectedProject.category && (
                    <div className="meta-tag">
                      <span className="meta-label">Category:</span>
                      <span className="meta-value">{selectedProject.category.replace('_', ' ')}</span>
                    </div>
                  )}
                  <div className="meta-tag">
                    <span className="meta-label">Priority:</span>
                    <span className="meta-value" style={{ textTransform: "capitalize" }}>{selectedProject.priority}</span>
                  </div>
                </div>

                <div className="console-section glass">
                  <div className="section-header-row">
                    <h3>Project Documents</h3>
                    <label className="file-upload-label">
                      {uploading ? (
                        <Loader2 className="spinner" size={16} />
                      ) : (
                        <Upload size={16} />
                      )}
                      <input 
                        type="file" 
                        style={{ display: "none" }} 
                        onChange={handleFileUpload} 
                        disabled={uploading || selectedProject.status !== "pending"}
                      />
                    </label>
                  </div>
                  <p className="section-desc">Upload PDF/Word/Excel context for AI agents</p>

                  <div className="uploads-list">
                    {uploads.length === 0 ? (
                      <p className="empty-uploads">No files uploaded yet.</p>
                    ) : (
                      uploads.map(up => (
                        <div key={up.id} className="upload-item">
                          <FileText size={16} className="file-icon" />
                          <div className="upload-details">
                            <span className="filename" title={up.original_name}>{up.original_name}</span>
                            <span className="filesize">{(up.file_size / 1024).toFixed(1)} KB • <span className={`file-status ${up.analysis_status}`}>{up.analysis_status}</span></span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Execution Monitor */}
              <div className="console-main glass">
                <div className="progress-section">
                  <div className="progress-meta">
                    <h3>Pipeline Execution</h3>
                    <span>{selectedProject.progress}% Complete</span>
                  </div>
                  <div className="console-progress-bar-container">
                    <div className="console-progress-bar" style={{ width: `${selectedProject.progress}%` }}></div>
                  </div>
                </div>

                {selectedProject.status === "completed" && (
                  <div className="report-ready-banner">
                    <Sparkles size={20} color="var(--accent)" />
                    <div className="banner-text">
                      <h4>Intelligence Report Published</h4>
                      <p>Your document deliverables are compiled and ready for download.</p>
                    </div>
                    <div className="banner-downloads">
                      <button className="btn btn-primary" onClick={() => handleDownloadReport("pdf")}>
                        <Download size={16} style={{ marginRight: "0.25rem" }} /> PDF
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleDownloadReport("docx")}>
                        DOCX
                      </button>
                    </div>
                  </div>
                )}

                <div className="tasks-timeline">
                  {tasks.length === 0 ? (
                    selectedProject.status === "failed" ? (
                      <div className="empty-tasks error-state" style={{ textAlign: "center", padding: "2rem" }}>
                        <XCircle size={32} style={{ color: "var(--error)", marginBottom: "0.5rem" }} />
                        <h4 style={{ fontWeight: 600 }}>Pipeline Initialization Failed</h4>
                        <p style={{ fontSize: "0.875rem", color: "#94a3b8" }}>The agent workflow encountered an error and failed to start.</p>
                      </div>
                    ) : (
                      <div className="empty-tasks">
                        <Loader2 className="spinner" size={24} />
                        <p>Initializing agent scheduler...</p>
                      </div>
                    )
                  ) : (
                    tasks.map((task: any) => {
                      const isExpanded = expandedTask === task.id;
                      return (
                        <div key={task.id || task.agent_type} className={`task-node ${task.status}`}>
                          <div className="task-node-header" onClick={() => task.output_data && setExpandedTask(isExpanded ? null : task.id)}>
                            {renderStatusIcon(task.status)}
                            <div className="task-info">
                              <h4>{task.title}</h4>
                              <div className="task-meta">
                                <span className="agent-badge">
                                  {renderAgentLogo(task.agent_type)}
                                  {task.agent_name}
                                </span>
                                {task.duration_seconds !== null && (
                                  <span className="duration-tag">
                                    <Clock size={12} />
                                    {task.duration_seconds}s
                                  </span>
                                )}
                              </div>
                            </div>
                            {task.output_data && (
                              <button className="expand-btn">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            )}
                          </div>

                          {isExpanded && task.output_data && (
                            <div className="task-node-body animate-fade-in">
                              <pre className="json-viewer">
                                {JSON.stringify(task.output_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .header-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 1.875rem;
          font-weight: 700;
        }

        .page-subtitle {
          color: #94a3b8;
        }

        .create-btn {
          gap: 0.5rem;
          width: auto;
        }

        .search-bar {
          position: relative;
          margin-bottom: 2rem;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
          border-radius: 12px;
          color: var(--foreground);
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .empty-state p {
          color: #94a3b8;
          margin-top: 0.5rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .project-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          cursor: pointer;
        }

        .hover-card {
          transition: all 0.25s ease;
        }

        .hover-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
          box-shadow: 0 12px 36px 0 rgba(99, 102, 241, 0.15);
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .project-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0;
        }

        .status-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          text-transform: uppercase;
          font-weight: 600;
        }

        .status-badge.pending { background: rgba(234, 179, 8, 0.2); color: #eab308; }
        .status-badge.running { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
        .status-badge.completed { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .status-badge.failed { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .project-goal {
          color: #cbd5e1;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .project-footer {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .progress-bar-container {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-bar {
          height: 100%;
          background: var(--primary);
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.75rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }

        .modal-content {
          width: 100%;
          max-width: 500px;
          padding: 2rem;
        }

        .modal-content h2 {
          margin-bottom: 1.5rem;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
        }

        /* PROJECT DETAILED CONSOLE DESIGN */
        .console-modal {
          width: 100%;
          max-width: 1100px;
          height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
        }

        .console-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--surface-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .console-title-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .console-title-row h2 {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .console-subtitle {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        .console-close-btn {
          color: #94a3b8;
          font-size: 1.5rem;
          transition: color 0.2s;
        }

        .console-close-btn:hover {
          color: var(--foreground);
        }

        .console-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          flex: 1;
          overflow: hidden;
        }

        .console-sidebar {
          padding: 1.5rem;
          border-right: 1px solid var(--surface-border);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .console-section {
          padding: 1.25rem;
        }

        .console-section h3 {
          font-size: 0.9375rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: var(--foreground);
        }

        .goal-text {
          font-size: 0.8125rem;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 1rem;
        }

        .meta-tag {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          padding: 0.35rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .meta-label {
          color: #64748b;
        }

        .meta-value {
          color: var(--foreground);
          font-weight: 500;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .section-header-row h3 {
          margin-bottom: 0;
        }

        .file-upload-label {
          cursor: pointer;
          color: var(--primary);
          transition: opacity 0.2s;
        }

        .file-upload-label:hover {
          opacity: 0.8;
        }

        .section-desc {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 1rem;
        }

        .uploads-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .empty-uploads {
          font-size: 0.75rem;
          color: #64748b;
          text-align: center;
          padding: 1rem 0;
        }

        .upload-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.65rem;
          background: rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .file-icon {
          color: var(--primary);
        }

        .upload-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .filename {
          font-size: 0.75rem;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .filesize {
          font-size: 0.6875rem;
          color: #64748b;
        }

        .file-status {
          text-transform: capitalize;
          font-weight: 600;
        }

        .file-status.completed { color: var(--success); }
        .file-status.pending { color: var(--accent); }
        .file-status.processing { color: #38bdf8; }

        .console-main {
          padding: 1.5rem 2rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          border-radius: 0;
          border: none;
        }

        .progress-section {
          padding: 1.25rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.03);
        }

        .progress-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .console-progress-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          overflow: hidden;
        }

        .console-progress-bar {
          height: 100%;
          background: linear-gradient(to right, var(--primary), var(--accent));
          transition: width 0.4s ease;
        }

        .report-ready-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 12px;
        }

        .banner-text {
          flex: 1;
        }

        .banner-text h4 {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .banner-text p {
          font-size: 0.75rem;
          color: #cbd5e1;
          margin-top: 0.15rem;
        }

        .banner-downloads {
          display: flex;
          gap: 0.5rem;
        }

        .banner-downloads .btn {
          font-size: 0.8125rem;
          padding: 0.5rem 1rem;
          width: auto;
        }

        .tasks-timeline {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-tasks {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 0;
          color: #64748b;
          gap: 0.5rem;
        }

        .task-node {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(15, 17, 21, 0.4);
          overflow: hidden;
          transition: border-color 0.25s;
        }

        .task-node.completed {
          border-left: 4px solid var(--success);
        }

        .task-node.running {
          border-left: 4px solid #38bdf8;
          border-color: rgba(56, 189, 248, 0.3);
          box-shadow: 0 0 12px 0 rgba(56, 189, 248, 0.05);
          background: rgba(56, 189, 248, 0.02);
        }

        .task-node.failed {
          border-left: 4px solid var(--error);
        }

        .task-node.pending {
          border-left: 4px solid #475569;
          opacity: 0.6;
        }

        .task-node-header {
          display: flex;
          align-items: center;
          padding: 1rem 1.25rem;
          cursor: pointer;
          gap: 1rem;
        }

        .task-info {
          flex: 1;
        }

        .task-info h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--foreground);
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.25rem;
        }

        .agent-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.6875rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .duration-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          color: #64748b;
        }

        .expand-btn {
          color: #64748b;
        }

        .status-ico {
          flex-shrink: 0;
        }

        .success-ico { color: var(--success); }
        .error-ico { color: var(--error); }
        .pending-ico { color: #475569; }
        .spinner-ico {
          color: #38bdf8;
          animation: spin 1.2s linear infinite;
        }

        .task-node-body {
          padding: 0 1.25rem 1.25rem 3.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
          background: rgba(0, 0, 0, 0.25);
        }

        .json-viewer {
          font-family: "Courier New", Courier, monospace;
          font-size: 0.75rem;
          color: #38bdf8;
          overflow-x: auto;
          white-space: pre-wrap;
          padding: 1rem;
          background: rgba(0,0,0,0.4);
          border-radius: 8px;
          max-height: 250px;
          overflow-y: auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .console-layout {
            grid-template-columns: 1fr;
          }
          .console-sidebar {
            border-right: none;
            border-bottom: 1px solid var(--surface-border);
          }
        }
      `}</style>
    </div>
  );
}
