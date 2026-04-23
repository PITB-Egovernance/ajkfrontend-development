import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TextField, MenuItem } from "@mui/material";
import { FileText, CheckCircle2, Plus, Trash2, Save, StickyNote, FileCheck } from "lucide-react";
import toast from "react-hot-toast";
import AdvertisementApi from "../../api/advertisementApi";
import RequisitionApi from "../../api/requisitionApi";
import "../job-creation/JobCreationForm.css";

const AdvertisementCreateForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [advDate, setAdvDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [advNumber, setAdvNumber] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [advertisementFee, setAdvertisementFee] = useState("");
  const [note, setNote] = useState("");
  const [importantNotes, setImportantNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState([""]);
  const [jobConfigs, setJobConfigs] = useState({});
  const [jobTitles, setJobTitles] = useState({});

  const selectedIds = useMemo(() => {
    const raw = searchParams.get("ids");
    if (!raw) return [];
    try {
      if (raw.startsWith("[")) {
        return JSON.parse(raw);
      }
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }, [searchParams]);

  const computeNextAdvNumber = async () => {
    try {
      const result = await AdvertisementApi.getAll();
      const yy = String(new Date().getFullYear()).slice(-2);
      let next = 1;
      if (result?.success && Array.isArray(result?.data?.data)) {
        const nums = result.data.data
          .map((ad) => ad.adv_number)
          .filter((v) => typeof v === "string")
          .map((v) => {
            const m = v.match(/Advertisement\s+(\d+)-(\d+)/i);
            if (!m) return null;
            return { n: parseInt(m[1], 10), yy: m[2] };
          })
          .filter(Boolean)
          .filter((item) => item.yy === yy)
          .map((item) => item.n);
        if (nums.length) {
          next = Math.max(...nums) + 1;
        }
      }
      return `Advertisement ${next}-${yy}`;
    } catch {
      const yy = String(new Date().getFullYear()).slice(-2);
      return `Advertisement 1-${yy}`;
    }
  };

  const fetchAdvertisementNotes = async () => {
    try {
      const result = await AdvertisementApi.getNotes();
      if (result.success) {
        setImportantNotes(result.important_notes || "");
        const tc = Array.isArray(result.terms_conditions) && result.terms_conditions.length
            ? result.terms_conditions
            : [""];
        setTermsConditions(tc);
      }
    } catch (err) {
        console.error("Error fetching notes:", err);
    }
  };

  useEffect(() => {
    (async () => {
      const n = await computeNextAdvNumber();
      setAdvNumber(n);
      fetchAdvertisementNotes();
    })();
  }, []);

  useEffect(() => {
    if (!selectedIds.length) return;

    setJobConfigs((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => {
        if (!next[id]) {
          next[id] = { fee: "", testType: "" };
        }
      });
      return next;
    });

    const fetchTitles = async () => {
      try {
        const adsResult = await AdvertisementApi.getApprovedRequisitions();
        const allResult = await RequisitionApi.getAll(1, 100);

        let allJobs = [];
        if (adsResult?.success) {
          const adsJobs = adsResult?.data?.jobs?.data || adsResult?.data?.jobs || [];
          if (Array.isArray(adsJobs)) allJobs = [...allJobs, ...adsJobs];
        }
        if (allResult?.success) {
          const moreJobs = allResult?.data?.data || allResult?.data || [];
          if (Array.isArray(moreJobs)) allJobs = [...allJobs, ...moreJobs];
        }

        const titlesMap = {};
        allJobs.forEach((j) => {
          const id = j.hash_id || j.id;
          if (id && selectedIds.includes(String(id))) {
            titlesMap[String(id)] = j.designation;
          }
        });

        const missingIds = selectedIds.filter((id) => !titlesMap[id]);
        if (missingIds.length > 0) {
          const individualFetches = missingIds.map(async (id) => {
            try {
              const result = await RequisitionApi.getById(id);
              if (result?.success) {
                const job = result.data || result;
                if (job.designation) {
                  titlesMap[id] = job.designation;
                }
              }
            } catch (err) {}
          });
          await Promise.all(individualFetches);
        }

        setJobTitles((prev) => ({ ...prev, ...titlesMap }));
      } catch (err) {
        console.error("Error fetching job titles:", err);
      }
    };
    fetchTitles();
  }, [selectedIds]);

  const addTerm = () => setTermsConditions((prev) => [...prev, ""]);
  const removeTerm = (idx) =>
    setTermsConditions((prev) => prev.filter((_, i) => i !== idx));
  const updateTerm = (idx, value) =>
    setTermsConditions((prev) => prev.map((t, i) => (i === idx ? value : t)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    if (!closingDate) {
      toast.error("Closing date is required");
      return;
    }
    if (new Date(closingDate) <= new Date(advDate)) {
      setFieldErrors((prev) => ({
        ...prev,
        closing_date: ["Closing date must be after the advertisement date"],
      }));
      toast.error("Closing date must be after the advertisement date");
      return;
    }
    if (!selectedIds || selectedIds.length === 0) {
      toast.error("Please select at least one requisition");
      return;
    }
    const filteredTerms = termsConditions.filter((t) => t.trim().length > 0);
    if (filteredTerms.length === 0) {
      toast.error("Please add at least one term & condition");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Saving advertisement...");
    
    try {
      const fd = new FormData();
      fd.append("job_ids", (selectedIds || []).join(","));
      fd.append("adv_date", advDate);
      fd.append("adv_number", advNumber);
      fd.append("closing_date", closingDate);
      fd.append("advertisement_fee", advertisementFee || "");
      fd.append("note", note || "");
      fd.append("important_notes", importantNotes || "");

      const feesPayload = {};
      const testTypesPayload = {};
      Object.keys(jobConfigs).forEach((jobId) => {
        feesPayload[jobId] = jobConfigs[jobId].fee || "";
        testTypesPayload[jobId] = jobConfigs[jobId].testType || "";
      });

      fd.append("job_fees", JSON.stringify(feesPayload));
      fd.append("job_test_types", JSON.stringify(testTypesPayload));
      filteredTerms.forEach((t) => fd.append("terms_conditions[]", t));

      const result = await AdvertisementApi.create(fd);

      if (result.success) {
        toast.success("Advertisement created", { id: loadingToast });
        navigate("/dashboard/advertisement-records", {
          state: { created: advNumber, note },
        });
      }
    } catch (err) {
      if (err.errors) {
          setFieldErrors(err.errors);
          if (err.errors.adv_number) {
              const nextAdv = await computeNextAdvNumber();
              setAdvNumber(nextAdv);
          }
      }
      toast.error(err.message || "Failed to create advertisement", {
        id: loadingToast,
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      minHeight: 56,
    },
    "& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)": {
      height: 56,
    },
    "& .MuiOutlinedInput-input": {
      padding: "14px",
    },
    "& .MuiOutlinedInput-inputMultiline": {
      padding: "14px",
    },
  };

  return (
    <div className="job-creation-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8" />
            <span>Create New Advertisement</span>
          </div>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="card-body">
            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Advertisement Information</h6>
              </div>
            </div>
            
            <div className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Advertisement Date"
                    type="date"
                    value={advDate}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ readOnly: true }}
                    sx={fieldSx}
                  />
                </div>
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Advertisement Number"
                    value={advNumber}
                    sx={fieldSx}
                    error={!!fieldErrors?.adv_number}
                    helperText={
                      Array.isArray(fieldErrors?.adv_number)
                        ? fieldErrors.adv_number.join(", ")
                        : fieldErrors?.adv_number
                    }
                  />
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn btn-prev"
                      onClick={async () => {
                        const n = await computeNextAdvNumber();
                        setAdvNumber(n);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Regenerate Number
                    </button>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Closing Date"
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                    inputProps={{ min: advDate }}
                    error={!!fieldErrors?.closing_date}
                    helperText={
                      Array.isArray(fieldErrors?.closing_date)
                        ? fieldErrors.closing_date.join(", ")
                        : fieldErrors?.closing_date
                    }
                  />
                </div>
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note"
                    sx={fieldSx}
                    error={!!fieldErrors?.note}
                    helperText={
                      Array.isArray(fieldErrors?.note)
                        ? fieldErrors.note.join(", ")
                        : fieldErrors?.note
                    }
                  />
                </div>
              </div>
            </div>

            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Requisition Specific Details</h6>
              </div>
            </div>
            {selectedIds.map((jobId) => {
              const designation = jobTitles[jobId];
              return (
                <div
                  key={jobId}
                  className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full"
                >
                  <h6
                    className="text-lg font-bold text-emerald-900 mb-6 flex items-center gap-3 pb-3 border-b border-emerald-100"
                  >
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shadow-inner">
                      <CheckCircle2 size={20} />
                    </div>
                    {designation ? (
                      <div className="flex flex-col">
                        <span>{designation}</span>
                        <span className="text-xs font-normal text-emerald-600 uppercase tracking-wider">Designation / Job ID: {jobId}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-medium italic animate-pulse">
                        Loading designation for {jobId}...
                      </span>
                    )}
                  </h6>
                  <div className="row">
                    <div className="col-md-6 form-group">
                      <TextField
                        select
                        fullWidth
                        label="Test Type"
                        value={jobConfigs[jobId]?.testType || ""}
                        onChange={(e) => {
                          const newType = e.target.value;
                          let newFee = "";
                          if (newType === "1") newFee = "505";
                          else if (newType === "2") newFee = "1010";
                          
                          setJobConfigs((prev) => ({
                            ...prev,
                            [jobId]: {
                              ...prev[jobId],
                              testType: newType,
                              fee: newFee
                            },
                          }));
                        }}
                        sx={fieldSx}
                      >
                        <MenuItem value="1">MCQs</MenuItem>
                        <MenuItem value="2">Written Exam</MenuItem>
                      </TextField>
                    </div>
                    <div className="col-md-6 form-group">
                      <TextField
                        fullWidth
                        label="Application Fee"
                        type="number"
                        value={jobConfigs[jobId]?.fee || ""}
                        InputProps={{
                          readOnly: true,
                        }}
                        placeholder="Fee auto-filled"
                        sx={{
                          ...fieldSx,
                          "& .MuiInputBase-input": {
                            backgroundColor: "#f8fafc",
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Important Notes</h6>
              </div>
            </div>

            <div className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
              <div className="row" style={{ width: "-webkit-fill-available" }}>
                <div className="col-md-6 form-group" style={{
                  width: "-webkit-fill-available",
                  flex: "0 !important",
                  minWidth: "-webkit-fill-available"
                }}>
                  <TextField
                    fullWidth
                    label="Important Notes"
                    value={importantNotes}
                    onChange={(e) => setImportantNotes(e.target.value)}
                    sx={fieldSx}
                    error={!!fieldErrors?.important_notes}
                    helperText={
                      Array.isArray(fieldErrors?.important_notes)
                        ? fieldErrors.important_notes.join(", ")
                        : fieldErrors?.important_notes
                    }
                  />
                </div>
              </div>
            </div>

            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Terms & Conditions</h6>
              </div>
            </div>

            <div className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
              <div className="row" style={{ width: "-webkit-fill-available" }}>
                <div className="col-md-6" style={{
                  width: "-webkit-fill-available",
                  flex: "0 !important",
                  minWidth: "-webkit-fill-available"
                }}>
                  {termsConditions.map((term, idx) => (
                    <div
                      key={idx}
                      className="form-group"
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                      }}
                    >
                      <TextField
                        fullWidth
                        label={`Term ${idx + 1}`}
                        value={term}
                        onChange={(e) => updateTerm(idx, e.target.value)}
                        sx={fieldSx}
                      />
                      {termsConditions.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-prev flex justify-center items-center"
                          onClick={() => removeTerm(idx)}
                          title="Remove"
                          style={{ height: 56, padding: "0 16px" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={addTerm}
                    style={{
                      marginTop: 16,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Plus size={18} />
                    <span>Add Term & Condition</span>
                  </button>
                  {!!fieldErrors?.terms_conditions && (
                    <div style={{ marginTop: 6, color: "#dc3545", fontSize: 12 }}>
                      {Array.isArray(fieldErrors.terms_conditions)
                        ? fieldErrors.terms_conditions.join(", ")
                        : fieldErrors.terms_conditions}
                    </div>
                  )}
                  {!!fieldErrors?.job_ids && (
                    <div style={{ marginTop: 6, color: "#dc3545", fontSize: 12 }}>
                      {Array.isArray(fieldErrors.job_ids)
                        ? fieldErrors.job_ids.join(", ")
                        : fieldErrors.job_ids}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="navigation-buttons">
              <button
                type="button"
                className="btn btn-prev"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? (
                  "Saving..."
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Advertisement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdvertisementCreateForm;
