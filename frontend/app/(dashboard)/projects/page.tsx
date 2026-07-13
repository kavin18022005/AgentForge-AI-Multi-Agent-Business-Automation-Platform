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
      const token = localStorage.getItem("token") || "";
      const baseURL = api.defaults.baseURL || "http://localhost:8000/api";
      const apiHost = baseURL.endsWith("/api") ? baseURL.slice(0, -4) : baseURL;
      const url = `${apiHost}/api/reports/${selectedProject.id}/download/${format}?token=${token}`;
      
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
          {projects.map((p: any, idx: number) => (
            <div key={p.id} className={`project-card glass hover-card animate-fade-in animate-stagger-${(idx % 5) + 1}`} onClick={() => setSelectedProject(p)}>
              <div className="project-header">
                <h3>{p.title}</h3>
                <span className={`status-badge ${p.status}`}>{p.status}</span>
              </div>
              <p className="project-goal">{p.goal}</p>
              <div className="project-footer">
                <div className="progress-bar-container">
                  <div className="progress-bar fluid-progress" style={{ width: `${p.progress}%` }}></div>
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
                    <div className="console-progress-bar fluid-progress" style={{ width: `${selectedProject.progress}%` }}></div>
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
          margin-bottom: 2.5rem;
        }

        .page-title {
          font-size: 2.25rem;
          font-weight: 800;
          background: linear-gradient(to right, #ffffff, #c084fc, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          color: #94a3b8;
          font-size: 0.95rem;
          margin-top: 0.25rem;
        }

        .create-btn {
          gap: 0.6rem;
          width: auto;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.35);
        }

        .search-bar {
          position: relative;
          margin-bottom: 2.5rem;
        }

        .search-icon {
          position: absolute;
          left: 1.25rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          transition: color 0.3s ease;
        }

        .search-input {
          width: 100%;
          padding: 0.9rem 1.25rem 0.9rem 3.25rem;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--surface-border);
          color: var(--foreground);
          font-size: 0.95rem;
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(15, 23, 42, 0.6);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .search-bar:focus-within .search-icon {
          color: var(--primary);
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 6rem 2rem;
          text-align: center;
          border: 1px solid var(--surface-border);
          border-radius: 20px;
          background: rgba(15, 23, 42, 0.25);
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #94a3b8;
          font-size: 0.9rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .project-card {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          position: relative;
          background: rgba(15, 23, 42, 0.3);
          border: 1px solid var(--surface-border);
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .hover-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hover-card:hover {
          transform: translateY(-5px);
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 12px 30px -10px rgba(99, 102, 241, 0.3), 
                      0 4px 24px rgba(0, 0, 0, 0.3);
          background: rgba(15, 23, 42, 0.45);
        }

        .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.25rem;
          gap: 1rem;
        }

        .project-header h3 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
          margin: 0;
          line-height: 1.3;
        }

        .status-badge {
          font-size: 0.7rem;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .status-badge::before {
          content: '';
          width: 5px;
          height: 5px;
          border-radius: 50%;
          display: inline-block;
        }

        .status-badge.pending { 
          background: rgba(234, 179, 8, 0.1); 
          color: #fbbf24;
          border: 1px solid rgba(234, 179, 8, 0.25);
        }
        .status-badge.pending::before {
          background: #fbbf24;
        }

        .status-badge.running { 
          background: rgba(56, 189, 248, 0.1); 
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.25);
        }
        .status-badge.running::before {
          background: #38bdf8;
          animation: badge-pulse 1.2s infinite;
        }

        .status-badge.completed { 
          background: rgba(16, 185, 129, 0.1); 
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .status-badge.completed::before {
          background: #34d399;
        }

        .status-badge.failed { 
          background: rgba(239, 68, 68, 0.1); 
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.25);
        }
        .status-badge.failed::before {
          background: #f87171;
        }

        @keyframes badge-pulse {
          0% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.85); opacity: 0.5; }
        }

        .project-goal {
          color: #94a3b8;
          font-size: 0.9rem;
          margin-bottom: 1.75rem;
          line-height: 1.5;
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
          margin-top: auto;
        }

        .progress-bar-container {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-text {
          font-size: 0.75rem;
          font-weight: 700;
          color: #94a3b8;
          min-width: 32px;
          text-align: right;
        }

        /* Modal pop animation */
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 4, 8, 0.6);
          backdrop-filter: blur(12px) saturate(180%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1.5rem;
        }

        .modal-content {
          width: 100%;
          max-width: 520px;
          padding: 2.5rem;
          animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        }

        .modal-content h2 {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          letter-spacing: -0.02em;
          background: linear-gradient(to right, #ffffff, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
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
          max-width: 1200px;
          height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
          animation: modalPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
        }

        .console-header {
          padding: 1.75rem 2.25rem;
          border-bottom: 1px solid var(--surface-border);
          background: rgba(15, 23, 42, 0.2);
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
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: white;
        }

        .console-subtitle {
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        .console-close-btn {
          color: #64748b;
          font-size: 1.5rem;
          transition: all 0.2s ease;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .console-close-btn:hover {
          color: var(--foreground);
          background: rgba(255, 255, 255, 0.08);
          transform: rotate(90deg);
        }

        .console-layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          flex: 1;
          overflow: hidden;
        }

        .console-sidebar {
          padding: 2rem 1.5rem;
          border-right: 1px solid var(--surface-border);
          background: rgba(15, 23, 42, 0.15);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .console-section {
          padding: 1.5rem;
          background: rgba(15, 23, 42, 0.25);
        }

        .console-section h3 {
          font-size: 0.95rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #f1f5f9;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .goal-text {
          font-size: 0.85rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 1.25rem;
        }

        .meta-tag {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .meta-label {
          color: #64748b;
        }

        .meta-value {
          color: #e2e8f0;
          font-weight: 600;
        }

        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .section-header-row h3 {
          margin-bottom: 0;
        }

        .file-upload-label {
          cursor: pointer;
          color: var(--primary);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.15);
          transition: all 0.2s ease;
        }

        .file-upload-label:hover {
          background: rgba(99, 102, 241, 0.2);
          transform: scale(1.05);
        }

        .section-desc {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 1.25rem;
        }

        .uploads-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .empty-uploads {
          font-size: 0.8rem;
          color: #64748b;
          text-align: center;
          padding: 1.5rem 0;
        }

        .upload-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.8rem 1rem;
          background: rgba(15, 23, 42, 0.45);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.2s ease;
        }

        .upload-item:hover {
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.6);
        }

        .file-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .upload-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .filename {
          font-size: 0.8rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #f1f5f9;
        }

        .filesize {
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 0.15rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .file-status {
          text-transform: capitalize;
          font-weight: 700;
          font-size: 0.7rem;
        }

        .file-status.completed { color: var(--success); }
        .file-status.pending { color: var(--accent); }
        .file-status.processing { color: #38bdf8; }

        .console-main {
          padding: 2rem 2.25rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          background: transparent;
          border-radius: 0;
          border: none;
        }

        .progress-section {
          padding: 1.5rem;
          background: rgba(15, 23, 42, 0.35);
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .progress-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 0.85rem;
        }

        .progress-meta h3 {
          font-size: 1rem;
          color: white;
        }

        .progress-meta span {
          color: var(--accent);
        }

        .console-progress-bar-container {
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          overflow: hidden;
        }

        .report-ready-banner {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(217, 70, 239, 0.08) 100%);
          border: 1px solid rgba(217, 70, 239, 0.25);
          border-radius: 14px;
          box-shadow: 0 4px 20px rgba(217, 70, 239, 0.08);
          animation: pulse-glow 2.5s infinite alternate;
        }

        @keyframes pulse-glow {
          0% { border-color: rgba(217, 70, 239, 0.2); box-shadow: 0 4px 15px rgba(217, 70, 239, 0.05); }
          100% { border-color: rgba(217, 70, 239, 0.35); box-shadow: 0 4px 25px rgba(217, 70, 239, 0.12); }
        }

        .banner-text {
          flex: 1;
        }

        .banner-text h4 {
          font-size: 1rem;
          font-weight: 750;
          color: white;
        }

        .banner-text p {
          font-size: 0.8rem;
          color: #cbd5e1;
          margin-top: 0.2rem;
        }

        .banner-downloads {
          display: flex;
          gap: 0.6rem;
        }

        .banner-downloads .btn {
          font-size: 0.8rem;
          padding: 0.5rem 1.1rem;
          width: auto;
          border-radius: 8px;
        }

        .tasks-timeline {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .empty-tasks {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 0;
          color: #64748b;
          gap: 0.75rem;
        }

        .task-node {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.04);
          background: rgba(15, 23, 42, 0.3);
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .task-node.completed {
          border-left: 4px solid var(--success);
          background: rgba(16, 185, 129, 0.01);
        }

        .task-node.running {
          border-left: 4px solid #38bdf8;
          border-color: rgba(56, 189, 248, 0.3);
          box-shadow: 0 4px 20px rgba(56, 189, 248, 0.08);
          background: rgba(56, 189, 248, 0.02);
        }

        .task-node.failed {
          border-left: 4px solid var(--error);
          background: rgba(239, 68, 68, 0.01);
        }

        .task-node.pending {
          border-left: 4px solid #475569;
          opacity: 0.65;
        }

        .task-node-header {
          display: flex;
          align-items: center;
          padding: 1.25rem 1.5rem;
          cursor: pointer;
          gap: 1.25rem;
        }

        .task-node-header:hover {
          background: rgba(255, 255, 255, 0.01);
        }

        .task-info {
          flex: 1;
        }

        .task-info h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: white;
        }

        .task-meta {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          margin-top: 0.3rem;
        }

        .agent-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.72rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .duration-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          color: #64748b;
        }

        .expand-btn {
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .task-node-header:hover .expand-btn {
          color: var(--foreground);
        }

        .status-ico {
          flex-shrink: 0;
        }

        .success-ico { color: var(--success); filter: drop-shadow(0 0 4px var(--success)); }
        .error-ico { color: var(--error); filter: drop-shadow(0 0 4px var(--error)); }
        .pending-ico { color: #475569; }
        .spinner-ico {
          color: #38bdf8;
          animation: spin 1.2s linear infinite;
          filter: drop-shadow(0 0 4px #38bdf8);
        }

        .task-node-body {
          padding: 0 1.5rem 1.5rem 3.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
          background: rgba(0, 0, 0, 0.15);
        }

        .json-viewer {
          font-family: "Fira Code", "Courier New", Courier, monospace;
          font-size: 0.8rem;
          color: #a5b4fc;
          overflow-x: auto;
          white-space: pre-wrap;
          padding: 1.25rem;
          background: rgba(8, 7, 16, 0.6);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 10px;
          max-height: 300px;
          overflow-y: auto;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
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
