import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, CircularProgress,
  Divider, FormControl, Grid, IconButton, InputLabel,
  MenuItem, Paper, Select, TextField, Typography, Alert, Chip, Pagination,
} from "@mui/material";
import {
  ArrowLeft, Download, RefreshCw, Users, Shield, History, Search,
} from "lucide-react";
import Config from "config/baseUrl";
import AuthService from "services/authService";
import AdvertisementApi from "api/advertisementApi";
import { toast } from "react-hot-toast";

const API_BASE = Config.apiUrl;
const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-API-KEY": Config.apiKey,
});

const AuditTrailReport = () => {
  const navigate = useNavigate();

  // Scope: "award" | "exam"
  const [mode, setMode] = useState("award");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

  // Dropdown options
  const [awardLists, setAwardLists] = useState([]);
  const [jobOptions, setJobOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Selected IDs (resolved internally — never shown to user)
  const [selectedAwardListId, setSelectedAwardListId] = useState("");
  const [selectedJobPostId, setSelectedJobPostId] = useState("");

  // Audit Logs Data
  const [logs, setLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [error, setError] = useState("");

  // ── Load dropdown options on mount ─────────────────────────────────────────
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        // Load award lists
        const alRes = await fetch(`${API_BASE}/award-lists?per_page=200`, { headers: getHeaders() });
        const alJson = await alRes.json();
        const alData = alJson?.data?.data ?? alJson?.data ?? [];
        setAwardLists(alData);

        // Load advertisements (which contain job details)
        const advRes = await AdvertisementApi.getAll(1);
        const advData = advRes?.data?.data ?? advRes?.data ?? [];
        const jobs = advData.flatMap(adv =>
          (adv.job_details || adv.jobDetails || []).map(job => ({
            id:    job.id,
            label: `${job.designation} — ${adv.adv_number || adv.title || ""}`.trim(),
          }))
        );
        setJobOptions(jobs);
      } catch (err) {
        toast.error("Failed to load options");
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  // ── Fetch Audit Logs ───────────────────────────────────────────────────────
  const fetchAuditTrail = useCallback(async (pageNum = 1) => {
    const id = mode === "exam" ? selectedJobPostId : selectedAwardListId;
    if (!id) { toast.error("Please select a target scope"); return; }
    
    setLoading(true);
    setError("");
    setPage(pageNum);

    try {
      const url = new URL(`${API_BASE}/results/audit-trail`);
      url.searchParams.set("type", mode);
      url.searchParams.set("id", id);
      url.searchParams.set("page", pageNum);
      if (searchText) url.searchParams.set("search", searchText);

      const res = await fetch(url.toString(), { headers: getHeaders() });
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.message || "Failed to load audit trail");

      setLogs(json.data?.data || []);
      setTotalPages(json.data?.last_page || 1);
      setTotalRecords(json.data?.total || 0);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, selectedJobPostId, selectedAwardListId, searchText]);

  // ── Excel Export ────────────────────────────────────────────────────────────
  const handleExcelExport = async () => {
    const id = mode === "exam" ? selectedJobPostId : selectedAwardListId;
    if (!id) return;
    setExporting(true);
    try {
      let url = `${API_BASE}/results/audit-trail/export/excel?type=${mode}&id=${id}`;
      if (searchText) url += `&search=${encodeURIComponent(searchText)}`;

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error("Excel export failed");

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `audit_trail_${mode}_${id}.xlsx`;
      link.click(); link.remove();
      toast.success("Excel exported successfully!");
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const handlePdfExport = async () => {
    const id = mode === "exam" ? selectedJobPostId : selectedAwardListId;
    if (!id) return;
    setPdfExporting(true);
    try {
      let url = `${API_BASE}/results/audit-trail/export/pdf?type=${mode}&id=${id}`;
      if (searchText) url += `&search=${encodeURIComponent(searchText)}`;

      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error("PDF export failed");

      const blob = await res.blob();
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
      toast.success("PDF report generated!");
    } catch (err) {
      toast.error(err.message || "PDF generation failed");
    } finally {
      setPdfExporting(false);
    }
  };

  const canLoad = mode === "exam" ? !!selectedJobPostId : !!selectedAwardListId;

  return (
    <Box sx={{ p:3 }}>
      {/* Header */}
      <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:3 }}>
        <IconButton onClick={() => navigate("/dashboard/results")}><ArrowLeft size={20} /></IconButton>
        <Box sx={{ flex:1 }}>
          <Typography variant="h5" fontWeight={700}>Audit Trail Ledger</Typography>
          <Typography variant="body2" color="text.secondary">
            Chronological vigilance log of mark uploads, changes &amp; publication approvals
          </Typography>
        </Box>
        <Chip icon={<Shield size={14} />} label="Audit &amp; Vigilance Review Only" size="small" color="primary" variant="outlined" />
      </Box>
      <Divider sx={{ mb:3 }} />

      {/* Controls */}
      <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, p:2.5, mb:3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          {/* Mode */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Audit Scope</InputLabel>
              <Select
                value={mode}
                label="Audit Scope"
                onChange={e => {
                  setMode(e.target.value);
                  setLogs([]);
                  setSelectedAwardListId("");
                  setSelectedJobPostId("");
                  setTotalRecords(0);
                }}
              >
                <MenuItem value="award">CCE Award List</MenuItem>
                <MenuItem value="exam">Screening / Written Exams</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Award List selector */}
          {mode === "award" && (
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" disabled={loadingOptions}>
                <InputLabel>{loadingOptions ? "Loading lists…" : "Select Award List"}</InputLabel>
                <Select
                  value={selectedAwardListId}
                  label={loadingOptions ? "Loading lists…" : "Select Award List"}
                  onChange={e => { setSelectedAwardListId(e.target.value); setLogs([]); }}
                >
                  {awardLists.map(al => (
                    <MenuItem key={al.id} value={al.id}>
                      {al.post_title} {al.department ? ` — ${al.department}` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Exam / Job Post selector */}
          {mode === "exam" && (
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" disabled={loadingOptions}>
                <InputLabel>{loadingOptions ? "Loading exams…" : "Select Exam / Post"}</InputLabel>
                <Select
                  value={selectedJobPostId}
                  label={loadingOptions ? "Loading exams…" : "Select Exam / Post"}
                  onChange={e => { setSelectedJobPostId(e.target.value); setLogs([]); }}
                >
                  {jobOptions.map(j => (
                    <MenuItem key={j.id} value={j.id}>{j.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Search bar */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth size="small"
              label="Search Action / Candidate"
              placeholder="Roll No, name, action..."
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
              onClick={() => fetchAuditTrail(1)}
              disabled={loading || !canLoad}
              sx={{ height: "40px" }}
            >
              Load Audit Trail
            </Button>
            {logs.length > 0 && (
              <>
                <Button
                  variant="outlined" size="small" color="success"
                  startIcon={exporting ? <CircularProgress size={14} /> : <Download size={14} />}
                  onClick={handleExcelExport}
                  disabled={exporting}
                  sx={{ height: "40px" }}
                >
                  Excel
                </Button>
                <Button
                  variant="outlined" size="small" color="secondary"
                  startIcon={pdfExporting ? <CircularProgress size={14} /> : <Download size={14} />}
                  onClick={handlePdfExport}
                  disabled={pdfExporting}
                  sx={{ height: "40px" }}
                >
                  PDF
                </Button>
              </>
            )}
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError("")}>{error}</Alert>}
      {loading && <Box sx={{ display:"flex", justifyContent:"center", py:8 }}><CircularProgress /></Box>}

      {/* Audit ledger data view */}
      {logs.length > 0 && !loading && (
        <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
          <Box sx={{ p:2, bgcolor:"#1e3a8a", display:"flex", justifyContent:"between", alignItems:"center" }}>
            <Typography variant="subtitle2" fontWeight={600} color="white">
              Vigilance Records Ledger (Total: {totalRecords})
            </Typography>
          </Box>
          <Box sx={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
              <thead>
                <tr style={{ background:"#f1f5f9" }}>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Timestamp</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Event / Action</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>User / Actor</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Target Candidate</th>
                  <th style={{ padding:"12px", borderBottom:"2px solid #cbd5e1", textAlign:"left", color:"#1e3a8a", fontWeight:600 }}>Audit Details / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ background: i%2===0?"#fff":"#f8fafc" }}>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", whiteSpace:"nowrap" }}>
                      {new Date(log.timestamp).toLocaleString("en-US", { hour12: true })}
                    </td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0" }}>
                      <Chip label={log.action} size="small" color="primary" variant="outlined" />
                    </td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", fontWeight:600 }}>
                      {log.user}
                    </td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0" }}>
                      {log.target}
                    </td>
                    <td style={{ padding:"10px 12px", borderBottom:"1px solid #e2e8f0", color:"#475569" }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display:"flex", justifyContent:"center", py:2.5, borderTop:"1px solid", borderColor:"divider" }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => fetchAuditTrail(p)}
                color="primary"
                size="small"
              />
            </Box>
          )}
        </Paper>
      )}

      {/* Empty State */}
      {logs.length === 0 && !loading && !error && (
        <Box sx={{ textAlign:"center", py:10 }}>
          <History size={48} style={{ margin:"0 auto 16px", opacity:0.25 }} />
          <Typography variant="h6" color="text.secondary">
            Select a target scope to load the audit trail ledger.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AuditTrailReport;