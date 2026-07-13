import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, CircularProgress,
  Divider, FormControl, Grid, IconButton, InputLabel,
  MenuItem, Paper, Select, Typography, Alert, Tab, Tabs, Chip,
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  ArrowLeft, Download, RefreshCw, Users, CheckCircle,
  XCircle, AlertCircle, Award, BarChart2, TrendingUp,
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

const BAND_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#16a34a"];

const StatCard = ({ label, value, icon: Icon, color = "primary" }) => {
  const colorMap = {
    primary: { bg: "#eff6ff", icon: "#2563eb" },
    success: { bg: "#f0fdf4", icon: "#16a34a" },
    error:   { bg: "#fef2f2", icon: "#dc2626" },
    warning: { bg: "#fffbeb", icon: "#d97706" },
    grey:    { bg: "#f1f5f9", icon: "#475569" },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, p:2 }}>
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Box>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Typography variant="h5" fontWeight={700}>{value ?? "—"}</Typography>
        </Box>
        <Box sx={{ p:1.2, borderRadius:2, bgcolor:c.bg }}>
          <Icon size={20} color={c.icon} />
        </Box>
      </Box>
    </Paper>
  );
};

const StatisticalSummary = () => {
  const navigate = useNavigate();

  // mode: "award" | "exam"
  const [mode, setMode] = useState("award");
  const [tab, setTab] = useState(0);
  const [stage, setStage] = useState("");
  const [toppers, setToppers] = useState(10);

  // Dropdown options
  const [awardLists, setAwardLists] = useState([]);
  const [jobOptions, setJobOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Selected IDs (resolved internally — never shown to user)
  const [selectedAwardListId, setSelectedAwardListId] = useState("");
  const [selectedJobPostId, setSelectedJobPostId] = useState("");

  // Data & UI state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
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
        // Flatten all job_details out of each advertisement
        const jobs = advData.flatMap(adv =>
          (adv.job_details || adv.jobDetails || []).map(job => ({
            id:    job.id,
            label: `${job.designation} — ${adv.adv_number || adv.title || ""}`.trim(),
          }))
        );
        setJobOptions(jobs);
      } catch (err) {
        toast.error("Failed to load exam/award list options");
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  // ── Fetch summary ───────────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    if (mode === "exam" && !selectedJobPostId) { toast.error("Please select an exam"); return; }
    if (mode === "award" && !selectedAwardListId) { toast.error("Please select an award list"); return; }
    setLoading(true); setError(""); setData(null); setTab(0);
    try {
      let url;
      if (mode === "exam") {
        url = `${API_BASE}/results/${selectedJobPostId}/statistical-summary?toppers=${toppers}`;
        if (stage) url += `&stage=${stage}`;
      } else {
        url = `${API_BASE}/award-lists/${selectedAwardListId}/statistical-summary?toppers=${toppers}`;
      }
      const res = await fetch(url, { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load");
      setData(json.data);
    } catch (err) {
      setError(err.message); toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, selectedJobPostId, selectedAwardListId, stage, toppers]);

  // ── Excel Export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const id = mode === "exam" ? selectedJobPostId : selectedAwardListId;
      let url = `${API_BASE}/results/statistical-summary/export?type=${mode}&id=${id}&toppers=${toppers}`;
      if (mode === "exam" && stage) url += `&stage=${stage}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `statistical_summary_${mode}_${id}.xlsx`;
      link.click(); link.remove();
      toast.success("Excel exported successfully!");
    } catch (err) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const overview    = data?.overview    || {};
  const stats       = data?.score_stats || null;
  const bands       = data?.band_distribution  || [];
  const categories  = data?.category_breakdown || [];
  const toppersList = data?.toppers || [];
  const passPercent = overview?.pass_percent ?? null;

  const examStatCards = [
    { label:"Total Registered", value:overview.total,    icon:Users,       color:"primary" },
    { label:"Appeared",         value:overview.appeared,  icon:Users,       color:"primary" },
    { label:"Passed",           value:overview.passed,    icon:CheckCircle, color:"success" },
    { label:"Failed",           value:overview.failed,    icon:XCircle,     color:"error"   },
    { label:"Absent",           value:overview.absent,    icon:AlertCircle, color:"warning" },
    { label:"UFM / RL",         value:(overview.ufm||0)+(overview.rl||0), icon:AlertCircle, color:"grey" },
  ];
  const awardStatCards = [
    { label:"Total Candidates", value:overview.total,        icon:Users,       color:"primary" },
    { label:"Selected",         value:overview.selected,     icon:CheckCircle, color:"success" },
    { label:"Provisional",      value:overview.provisional,  icon:TrendingUp,  color:"warning" },
    { label:"Absent",           value:overview.absent,       icon:AlertCircle, color:"grey"    },
    { label:"Disqualified",     value:overview.disqualified, icon:XCircle,     color:"error"   },
    { label:"Pending",          value:overview.pending,      icon:AlertCircle, color:"grey"    },
  ];
  const statCards    = mode === "exam" ? examStatCards : awardStatCards;
  const catTabIdx    = bands.length > 0 ? 1 : 0;
  const topperTabIdx = bands.length > 0 ? 2 : 1;

  const canLoad = mode === "exam" ? !!selectedJobPostId : !!selectedAwardListId;

  return (
    <Box sx={{ p:3 }}>
      {/* Header */}
      <Box sx={{ display:"flex", alignItems:"center", gap:2, mb:3 }}>
        <IconButton onClick={() => navigate("/dashboard/results")}><ArrowLeft size={20} /></IconButton>
        <Box sx={{ flex:1 }}>
          <Typography variant="h5" fontWeight={700}>Statistical Summary</Typography>
          <Typography variant="body2" color="text.secondary">
            Pass %, score distribution, toppers &amp; category breakdown
          </Typography>
        </Box>
        <Chip label="Director / Internal Only" size="small" color="warning" variant="outlined" />
      </Box>
      <Divider sx={{ mb:3 }} />

      {/* Controls */}
      <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, p:2.5, mb:3 }}>
        <Grid container spacing={2} alignItems="flex-end">

          {/* Mode */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Report Type</InputLabel>
              <Select
                value={mode}
                label="Report Type"
                onChange={e => {
                  setMode(e.target.value);
                  setData(null);
                  setSelectedAwardListId("");
                  setSelectedJobPostId("");
                }}
              >
                <MenuItem value="award">Award List (CCE Final Merit)</MenuItem>
                <MenuItem value="exam">Exam Results (Written / Screening)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Award List selector */}
          {mode === "award" && (
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" disabled={loadingOptions}>
                <InputLabel>
                  {loadingOptions ? "Loading award lists…" : "Select Award List"}
                </InputLabel>
                <Select
                  value={selectedAwardListId}
                  label={loadingOptions ? "Loading award lists…" : "Select Award List"}
                  onChange={e => { setSelectedAwardListId(e.target.value); setData(null); }}
                >
                  {awardLists.map(al => (
                    <MenuItem key={al.id} value={al.id}>
                      {al.post_title}
                      {al.department ? ` — ${al.department}` : ""}
                      {al.case_number ? ` (${al.case_number})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Exam / Job Post selector */}
          {mode === "exam" && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small" disabled={loadingOptions}>
                  <InputLabel>
                    {loadingOptions ? "Loading exams…" : "Select Exam / Post"}
                  </InputLabel>
                  <Select
                    value={selectedJobPostId}
                    label={loadingOptions ? "Loading exams…" : "Select Exam / Post"}
                    onChange={e => { setSelectedJobPostId(e.target.value); setData(null); }}
                  >
                    {jobOptions.map(j => (
                      <MenuItem key={j.id} value={j.id}>{j.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Stage</InputLabel>
                  <Select value={stage} label="Stage" onChange={e => setStage(e.target.value)}>
                    <MenuItem value="">All Stages</MenuItem>
                    <MenuItem value="screening">Screening Test (MCQ)</MenuItem>
                    <MenuItem value="written">Written Examination</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </>
          )}

          {/* Top N */}
          <Grid item xs={12} sm={6} md={1}>
            <FormControl fullWidth size="small">
              <InputLabel>Top N</InputLabel>
              <Select
                value={toppers}
                label="Top N"
                onChange={e => setToppers(e.target.value)}
              >
                {[5, 10, 15, 20, 25, 50].map(n => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Actions */}
          <Grid item xs={12} sm={12} md="auto" sx={{ display:"flex", gap:1 }}>
            <Button
              variant="contained" size="small"
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshCw size={14} />}
              onClick={fetchSummary}
              disabled={loading || !canLoad}
            >
              Load Summary
            </Button>
            {data && (
              <Button
                variant="outlined" size="small" color="success"
                startIcon={exporting ? <CircularProgress size={14} /> : <Download size={14} />}
                onClick={handleExport}
                disabled={exporting}
              >
                Export Excel
              </Button>
            )}
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb:2 }} onClose={() => setError("")}>{error}</Alert>}
      {loading && <Box sx={{ display:"flex", justifyContent:"center", py:8 }}><CircularProgress /></Box>}

      {data && !loading && (
        <>
          {/* Pass % Hero */}
          {passPercent !== null && (
            <Paper elevation={0} sx={{
              border:"2px solid",
              borderColor: passPercent>=60?"success.main":passPercent>=40?"warning.main":"error.main",
              borderRadius:3, p:2.5, mb:3,
              background: passPercent>=60?"#f0fdf4":passPercent>=40?"#fffbeb":"#fef2f2",
              display:"flex", alignItems:"center", gap:2,
            }}>
              <BarChart2 size={28} color={passPercent>=60?"#16a34a":passPercent>=40?"#d97706":"#dc2626"} />
              <Box>
                <Typography variant="h3" fontWeight={800}
                  color={passPercent>=60?"success.main":passPercent>=40?"warning.main":"error.main"}>
                  {passPercent}%
                </Typography>
                <Typography variant="body2" color="text.secondary">Overall Pass Percentage</Typography>
              </Box>
            </Paper>
          )}

          {/* Stat Cards */}
          <Grid container spacing={2} sx={{ mb:3 }}>
            {statCards.map((s,i) => (
              <Grid item xs={6} sm={4} md={2} key={i}><StatCard {...s} /></Grid>
            ))}
          </Grid>

          {/* Score Stats */}
          {stats && (
            <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, p:2.5, mb:3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb:1.5 }}>Score Statistics</Typography>
              <Grid container spacing={2}>
                {Object.entries(stats).map(([k,v]) => v !== null && (
                  <Grid item xs={6} sm={3} key={k}>
                    <Box sx={{ textAlign:"center", p:1.5, bgcolor:"action.hover", borderRadius:2 }}>
                      <Typography variant="h6" fontWeight={700}>{v}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {k.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Tabs */}
          <Tabs value={tab} onChange={(_,v) => setTab(v)} sx={{ mb:2 }}>
            {bands.length > 0 && <Tab label="Score Band Distribution" />}
            <Tab label={`Category Breakdown (${categories.length})`} />
            <Tab label={`Top ${toppers} Candidates`} icon={<Award size={14} />} iconPosition="start" />
          </Tabs>

          {/* Score Band Chart */}
          {tab === 0 && bands.length > 0 && (
            <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, p:2.5 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb:2 }}>
                Score Band Distribution (Candidate Count per Percentage Range)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bands} margin={{ top:5,right:20,left:0,bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="band" tick={{ fontSize:12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize:12 }} />
                  <RTooltip formatter={v=>[`${v} candidates`,"Count"]} />
                  <Bar dataKey="count" radius={[4,4,0,0]} maxBarSize={80}>
                    {bands.map((_,i) => <Cell key={i} fill={BAND_COLORS[i%BAND_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          )}

          {/* Category Breakdown */}
          {tab === catTabIdx && categories.length > 0 && (
            <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
              <Box sx={{ p:2, bgcolor:"#1a3a6b" }}>
                <Typography variant="subtitle2" fontWeight={600} color="white">Category / Quota-wise Breakdown</Typography>
              </Box>
              <Box sx={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                  <thead>
                    <tr style={{ background:"#f1f5f9" }}>
                      {Object.keys(categories[0]||{}).map(k => (
                        <th key={k} style={{ padding:"10px 12px", textAlign:k==="value"||k==="type"?"left":"center", borderBottom:"2px solid #e2e8f0", fontWeight:600, color:"#1e3a8a" }}>
                          {k.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((row,i) => (
                      <tr key={i} style={{ background:i%2===0?"#fff":"#f8fafc" }}>
                        {Object.entries(row).map(([k,v]) => (
                          <td key={k} style={{ padding:"8px 12px", borderBottom:"1px solid #e2e8f0", textAlign:k==="value"||k==="type"?"left":"center" }}>
                            {k==="pass_percent"?`${v}%`:(v??"-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}

          {/* Toppers */}
          {tab === topperTabIdx && toppersList.length > 0 && (
            <Paper elevation={0} sx={{ border:"1px solid", borderColor:"divider", borderRadius:2, overflow:"hidden" }}>
              <Box sx={{ p:2, display:"flex", alignItems:"center", gap:1.5, bgcolor:"#1a3a6b" }}>
                <Award size={18} color="#fbbf24" />
                <Typography variant="subtitle2" fontWeight={600} color="white">Top {toppers} Candidates by Score</Typography>
              </Box>
              <Box sx={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                  <thead>
                    <tr style={{ background:"#f1f5f9" }}>
                      {Object.keys(toppersList[0]||{}).map(k => (
                        <th key={k} style={{ padding:"10px 12px", textAlign:k==="candidate_name"?"left":"center", borderBottom:"2px solid #e2e8f0", fontWeight:600, color:"#1e3a8a" }}>
                          {k.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {toppersList.map((t,i) => (
                      <tr key={i} style={{ background:i===0?"#fefce8":i%2===0?"#fff":"#f8fafc" }}>
                        {Object.entries(t).map(([k,v]) => (
                          <td key={k} style={{ padding:"8px 12px", borderBottom:"1px solid #e2e8f0", textAlign:k==="candidate_name"?"left":"center", fontWeight:k==="rank"||k==="grand_total"||k==="obtained_marks"?700:400 }}>
                            {k==="rank"?v:(v??"-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          )}
        </>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <Box sx={{ textAlign:"center", py:10 }}>
          <BarChart2 size={48} style={{ margin:"0 auto 16px", opacity:0.25 }} />
          <Typography variant="h6" color="text.secondary">
            {loadingOptions
              ? "Loading available exams and award lists…"
              : "Select a report type and exam above, then click Load Summary"}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StatisticalSummary;