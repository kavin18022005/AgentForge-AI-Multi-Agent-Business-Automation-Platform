"use client";

import { useEffect, useState } from "react";
import { api, getErrorMessage } from "@/lib/api";
import { User, Mail, Shield, Coins, Check, Loader2, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [buyingCredits, setBuyingCredits] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", username: "" });
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleBuyCredits = async () => {
    setBuyingCredits(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await api.post("/auth/buy-credits?amount=100");
      setProfile(res.data);
      setMessage({ text: "Successfully purchased 100 AI credits! ⚡", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: getErrorMessage(err, "Failed to purchase credits"), type: "error" });
    } finally {
      setBuyingCredits(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/me");
        setProfile(res.data);
        setFormData({
          full_name: res.data.full_name || "",
          username: res.data.username || "",
        });
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await api.patch("/auth/me", formData);
      setProfile(res.data);
      setMessage({ text: "Profile updated successfully! 🚀", type: "success" });
      setTimeout(() => setMessage({ text: "", type: "" }), 4000);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: getErrorMessage(err, "Failed to update profile"), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading settings...</div>;
  }

  return (
    <div className="settings-container">
      <div className="header-section">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile options and subscription tier</p>
      </div>

      <div className="settings-grid">
        <div className="settings-card glass animate-fade-in">
          <h2 className="section-title">
            <User size={20} style={{ color: "var(--primary)" }} />
            <span>Profile Details</span>
          </h2>

          {message.text && (
            <div className={`alert-box ${message.type}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="form-input disabled-input"
                  value={profile?.email || ""}
                  disabled
                />
              </div>
              <span className="input-hint">Email address cannot be changed</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="form-input"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={saving}>
              {saving ? (
                <Loader2 className="spinner" size={20} />
              ) : (
                <>
                  <Check size={18} style={{ marginRight: "0.5rem" }} />
                  Save Settings
                </>
              )}
            </button>
          </form>
        </div>

        <div className="settings-card glass animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="section-title">
            <Sparkles size={20} style={{ color: "var(--accent)" }} />
            <span>Usage & Subscription</span>
          </h2>

          <div className="metrics-box">
            <div className="metric-row">
              <div className="metric-icon-wrap" style={{ background: "rgba(139, 92, 246, 0.15)" }}>
                <Coins size={22} color="var(--accent)" />
              </div>
              <div className="metric-details">
                <span className="metric-label">AI Credits Balance</span>
                <span className="metric-val">{profile?.ai_credits || 0} credits</span>
              </div>
            </div>

            <div className="metric-row">
              <div className="metric-icon-wrap" style={{ background: "rgba(16, 185, 129, 0.15)" }}>
                <Shield size={22} color="var(--success)" />
              </div>
              <div className="metric-details">
                <span className="metric-label">Current Tier Plan</span>
                <span className="metric-val" style={{ textTransform: "capitalize" }}>{profile?.plan || "Free"} Tier</span>
              </div>
            </div>
          </div>

          <div className="upgrade-box" style={{ marginBottom: "1.5rem" }}>
            <h4>Add AI Credits</h4>
            <p>Need more credits immediately for your projects? Refill your balance here.</p>
            <button type="button" className="btn btn-primary upgrade-btn" onClick={handleBuyCredits} disabled={buyingCredits} style={{ width: "100%" }}>
              {buyingCredits ? <Loader2 className="spinner" size={16} /> : "Buy 100 Credits (⚡ Add Balance)"}
            </button>
          </div>

          <div className="upgrade-box">
            <h4>Ready to scale?</h4>
            <p>Upgrade to Pro or Enterprise to get unlimited credits, priority agents, and document generation templates.</p>
            <button type="button" className="btn btn-secondary upgrade-btn" style={{ width: "100%" }}>
              Upgrade Subscription
            </button>
          </div>
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
        }

        .page-subtitle {
          color: #94a3b8;
          margin-top: 0.5rem;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 2rem;
        }

        .settings-card {
          padding: 2rem;
          height: fit-content;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--foreground);
        }

        .alert-box {
          padding: 0.75rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        .alert-box.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid var(--success);
          color: var(--success);
        }

        .alert-box.error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid var(--error);
          color: var(--error);
        }

        .input-with-icon {
          position: relative;
        }

        .input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .input-with-icon .form-input {
          padding-left: 2.75rem;
        }

        .disabled-input {
          background: rgba(15, 17, 21, 0.9);
          color: #64748b;
          cursor: not-allowed;
        }

        .input-hint {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.35rem;
        }

        .submit-btn {
          margin-top: 2rem;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        .metrics-box {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .metric-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-details {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .metric-val {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--foreground);
        }

        .upgrade-box {
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.07), rgba(139, 92, 246, 0.07));
          border-radius: 12px;
          border: 1px solid rgba(139, 92, 246, 0.15);
        }

        .upgrade-box h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--foreground);
        }

        .upgrade-box p {
          font-size: 0.8125rem;
          color: #94a3b8;
          line-height: 1.4;
          margin-bottom: 1.25rem;
        }

        .upgrade-btn {
          font-size: 0.875rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
