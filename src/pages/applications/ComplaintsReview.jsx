import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Button, CircularProgress,
  Divider, FormControl, Grid, InputLabel,
  MenuItem, Paper, Select, TextField, Typography, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { RefreshCw, Search, MessageSquare } from "lucide-react";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import { toast } from "react-hot-toast";

const API_BASE = Config.apiUrl;
const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-API-KEY": Config.apiKey,
});

const CATEGORY_LABELS = {
  technical:     "Technical",
  roll_no_slip:  "Roll No Slip",
  result:        "Result",
  payment:       "Payment",
  general:       "General",
};

const STATUS_COLOR = {
  open:       "default",
  in_review:  "warning",
  resolved:   "success",
  closed:     "default",
};

const ComplaintsReview = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  // Review Dialog State
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState("in_review");
  const [reviewResponse, setReviewResponse] = useState("");

  // ── Load Complaints ────────────────────────────────────────────────────────
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_BASE}/complaints`);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      if (categoryFilter) url.searchParams.set("category", categoryFilter);

      const res = await fetch(url.toString(), { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load complaints");
      setComplaints(json.data || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Search is client-side (candidate name/cnic/subject) — the backend
  // filters status/category only.
  const visibleComplaints = complaints.filter((c) => {
    if (!searchText.trim()) return true;
    const needle = searchText.trim().toLowerCase();
    return [c.subject, c.candidate?.name, c.candidate?.cnic]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(needle));
  });

  // ── Update Complaint ───────────────────────────────────────────────────────
  const handleUpdate = async (id, status, adminResponse = "") => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/complaints/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          status,
          ...(adminResponse ? { admin_response: adminResponse } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update complaint");

      toast.success("Complaint updated!");
      fetchComplaints();
      setDialogOpen(false);
      setSelected(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const openReviewDialog = (complaint) => {
    setSelected(complaint);
    setReviewStatus(complaint.status === "open" ? "in_review" : complaint.status);
    setReviewResponse(complaint.admin_response || "");
    setDialogOpen(true);
  };

  return (
    <Box>
      {/* Controls */}
      <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2.5, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="open">Open</MenuItem>
                <MenuItem value="in_review">In Review</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="closed">Closed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2.5}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
                <MenuItem value="">All Categories</MenuItem>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth size="small"
              label="Search"
              placeholder="Candidate name, CNIC, or subject..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{ endAdornment: <Search size={16} style={{ opacity: 0.5 }} /> }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md="auto">
            <Button
              variant="contained" size="small"
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={14} />}
              onClick={fetchComplaints}
              disabled={loading}
              sx={{ height: "40px" }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>}

      {/* Complaints Table */}
      {visibleComplaints.length > 0 && !loading && (
        <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1", textAlign: "left", color: "#1e3a8a", fontWeight: 600 }}>Candidate</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1", textAlign: "left", color: "#1e3a8a", fontWeight: 600 }}>Category</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1", textAlign: "left", color: "#1e3a8a", fontWeight: 600 }}>Subject</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1", textAlign: "left", color: "#1e3a8a", fontWeight: 600 }}>Filed</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1", textAlign: "center", color: "#1e3a8a", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #cbd5e1", textAlign: "center", color: "#1e3a8a", fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleComplaints.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
                      {c.candidate?.name || "—"} <br />
                      <span style={{ fontSize: "11px", color: "#64748b" }}>{c.candidate?.cnic}</span>
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                      {CATEGORY_LABELS[c.category] || c.category}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>{c.subject}</td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                      <Chip
                        label={c.status.replace("_", " ").toUpperCase()}
                        size="small"
                        color={STATUS_COLOR[c.status] || "default"}
                      />
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>
                      <Button variant="contained" size="small" color="primary" onClick={() => openReviewDialog(c)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      )}

      {/* Review Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Review Complaint</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2">
                <strong>Candidate:</strong> {selected.candidate?.name} ({selected.candidate?.cnic})
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong> {CATEGORY_LABELS[selected.category] || selected.category}
              </Typography>
              <Typography variant="body2">
                <strong>Subject:</strong> {selected.subject}
              </Typography>
              <Typography variant="body2">
                <strong>Description:</strong> {selected.description}
              </Typography>

              <Divider />

              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={reviewStatus} label="Status" onChange={(e) => setReviewStatus(e.target.value)}>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="in_review">In Review</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth multiline rows={3}
                label="Response to candidate"
                value={reviewResponse}
                onChange={(e) => setReviewResponse(e.target.value)}
                placeholder="Shown back to the candidate on their own Complaints page..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleUpdate(selected.id, reviewStatus, reviewResponse)}
            disabled={updating}
          >
            Save Decision
          </Button>
        </DialogActions>
      </Dialog>

      {/* Empty State */}
      {visibleComplaints.length === 0 && !loading && !error && (
        <Box sx={{ textAlign: "center", py: 10, color: "text.secondary" }}>
          <MessageSquare size={48} style={{ margin: "0 auto 16px", opacity: 0.25 }} />
          <Typography variant="h6">No complaints found.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default ComplaintsReview;
