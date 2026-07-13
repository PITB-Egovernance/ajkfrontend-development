import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, CircularProgress,
  Divider, FormControl, Grid, IconButton, InputLabel,
  MenuItem, Paper, Select, TextField, Typography, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import {
  ArrowLeft, Download, RefreshCw, Search, CheckCircle, ShieldAlert,
} from "lucide-react";
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

const ScrutinyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");

  // Resolution Dialog State
  const [selectedReq, setSelectedReq] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState("resolved");
  const [resolutionRemarks, setResolutionRemarks] = useState("");

  // ── Load Requests ──────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL(`${API_BASE}/results/scrutiny-requests`);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      if (searchText) url.searchParams.set("search", searchText);

      const res = await fetch(url.toString(), { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load scrutiny requests");
      setRequests(json.data || []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchText]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Export Excel ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      let url = `${API_BASE}/results/scrutiny-requests/export/excel?`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (searchText) url += `search=${encodeURIComponent(searchText)}&`;

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error("Excel export failed");

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `scrutiny_requests_${new Date().toISOString().slice(0,10)}.xlsx`;
      link.click(); link.remove();
      toast.success("Excel exported successfully!");
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ── Update Request Status ──────────────────────────────────────────────────
  const handleUpdateStatus = async (reqId, newStatus, remarks = "") => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/results/scrutiny-requests/${reqId}/status`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          status: newStatus,
          resolution_remarks: remarks,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to update status");
      
      toast.success("Scrutiny request updated!");
      fetchRequests();
      setDialogOpen(false);
      setSelectedReq(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const openResolutionDialog = (req) => {
    setSelectedReq(req);
    setResolutionStatus(req.status === "pending" || req.status === "under_review" ? "resolved" : req.status);
    setResolutionRemarks(req.resolution_remarks || "");
    setDialogOpen(true);
  };

  return (
    <Box sx={{ p:3 }}>
      {/* Header */}
      <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:3 }}>
        <IconButton onClick={() => navigate("/dashboard/results")}><ArrowLeft size={20} /></IconButton>
        <Box sx={{ flex:1 }}>
          <Typography variant="h5" fontWeight={700}>Scrutiny &amp; Rechecking Ledger</Typography>
          <Typography variant="body2" color="text.secondary">
            View, track, and resolve candidate marks verification and recounting requests
          </Typography>
        </Box>
        <Chip label="Result Compilation Staff" size="small" color="primary" variant="outlined" />
      </Box>

      {/* Notice Banner */}
      <Alert severity="warning" sx={{ mb:3, borderRadius: 2 }}>
        <strong>Portal Integration Notice:</strong> Candidate side appeal interface is pending final specs from the portal team. Using internal tracking records.
      </Alert>

      {/* Controls */}
      <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, p:2.5, mb:3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          {/* Status Filter */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={e => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="under_review">Under Review</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Search bar */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth size="small"
              label="Search Candidate"
              placeholder="Roll Number, Name, subject..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              InputProps={{
                endAdornment: <Search size={16} style={{ opacity: 0.5 }} />
              }}
            />
          </Grid>

          {/* Actions */}
          <Grid item xs={12} sm={12} md="auto" sx={{ display:"flex", gap:1 }}>
            <Button
              variant="contained" size="small"
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={14} />}
              onClick={fetchRequests}
              disabled={loading}
              sx={{ height: "40px" }}
            >
              Refresh
            </Button>
            {requests.length > 0 && (
              <Button
                variant="outlined" size="small" color="success"
                startIcon={exporting ? <CircularProgress size={14} /> : <Download size={14} />}
                onClick={handleExport}
                disabled={exporting}
                sx={{ height: "40px" }}
              >
                Export Excel
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {loading && <Box sx={{ display:"flex", justifyContent:"center", py:8 }}><CircularProgress /></Box>}

      {/* Requests Ledger Table */}
      {requests.length > 0 && !loading && (
        <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
          <Box sx={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
              <thead>
                <tr style={{ background:"#f1f5f9" }}>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Candidate (Roll No)</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Exam / Job Post</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Subject Challenged</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Candidate Reason</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"center", color:"#1e3a8a", fontWeight:600 }}>Status</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"center", color:"#1e3a8a", fontWeight:600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => (
                  <tr key={r.id} style={{ background: i%2===0?"#fff":"#f8fafc" }}>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", fontWeight: 600 }}>
                      {r.candidate_name} <br/>
                      <span style={{ fontSize:"11px", color:"#64748b" }}>{r.roll_number}</span>
                    </td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0" }}>{r.job_title}</td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", fontWeight:600 }}>{r.subject_name}</td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", color:"#475569" }}>{r.reason}</td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", textAlign:"center" }}>
                      <Chip
                        label={r.status.replace("_", " ").toUpperCase()}
                        size="small"
                        color={r.status === "resolved" ? "success" : r.status === "under_review" ? "warning" : r.status === "rejected" ? "error" : "default"}
                      />
                    </td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", textAlign:"center" }}>
                      {r.status === "pending" && (
                        <Button
                          variant="outlined" size="small"
                          onClick={() => handleUpdateStatus(r.id, "under_review")}
                          sx={{ mr: 1 }}
                        >
                          Start Review
                        </Button>
                      )}
                      <Button
                        variant="contained" size="small" color="primary"
                        onClick={() => openResolutionDialog(r)}
                      >
                        Action
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Paper>
      )}

      {/* Resolution Dialog Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Resolve Scrutiny Request</DialogTitle>
        <DialogContent dividers>
          {selectedReq && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body2">
                <strong>Candidate:</strong> {selectedReq.candidate_name} ({selectedReq.roll_number})
              </Typography>
              <Typography variant="body2">
                <strong>Subject Challenged:</strong> {selectedReq.subject_name}
              </Typography>
              <Typography variant="body2">
                <strong>Challenge Details:</strong> {selectedReq.reason}
              </Typography>

              <Divider />

              <FormControl fullWidth size="small">
                <InputLabel>Resolution Outcome</InputLabel>
                <Select
                  value={resolutionStatus}
                  label="Resolution Outcome"
                  onChange={e => setResolutionStatus(e.target.value)}
                >
                  <MenuItem value="resolved">Mark Resolved (Recounted/Verified)</MenuItem>
                  <MenuItem value="under_review">Under Review</MenuItem>
                  <MenuItem value="rejected">Reject Request</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth multiline rows={3}
                label="Resolution Remarks / Decision Note"
                value={resolutionRemarks}
                onChange={e => setResolutionRemarks(e.target.value)}
                placeholder="Enter details about scrutiny verification outcome..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => handleUpdateStatus(selectedReq.id, resolutionStatus, resolutionRemarks)}
            disabled={updating}
          >
            Save Decision
          </Button>
        </DialogActions>
      </Dialog>

      {/* Empty State */}
      {requests.length === 0 && !loading && !error && (
        <Box sx={{ textAlign:"center", py:10, color:"text.secondary" }}>
          <ShieldAlert size={48} style={{ margin:"0 auto 16px", opacity:0.25 }} />
          <Typography variant="h6">No scrutiny requests found.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default ScrutinyRequests;