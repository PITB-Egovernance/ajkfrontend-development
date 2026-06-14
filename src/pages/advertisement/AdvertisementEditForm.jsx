import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TextField, MenuItem } from "@mui/material";
import { FileEdit, CheckCircle2, Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import AdvertisementApi from "../../api/advertisementApi";
import Config from "../../config/baseUrl";
import AuthService from "../../services/authService";
import "../job-creation/JobCreationForm.css";

const TEST_TYPE_CODE_TO_NAME = { '1': 'MCQs', '2': 'Written Exam' };
const FALLBACK_EXAM_FEES = { 'MCQs': 505, 'Written Exam': 1010 };

const AdvertisementEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  const [advDate, setAdvDate] = useState("");
  const [advNumber, setAdvNumber] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [advertisementFee, setAdvertisementFee] = useState("");
  const [note, setNote] = useState("");
  const [importantNotes, setImportantNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState([""]);
  const [jobConfigs, setJobConfigs] = useState({});
  const [examFees, setExamFees] = useState(FALLBACK_EXAM_FEES);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${Config.apiUrl}/settings/exam-fees`, {
          headers: {
            Authorization: `Bearer ${AuthService.getToken()}`,
            Accept:        'application/json',
            'X-API-KEY':   Config.apiKey,
          },
        });
        const result = await res.json();
        if (aborted) return;
        if (res.ok && (result.success || result.status === 200)) {
          const list = result.data?.data ?? result.data ?? [];
          const byType = {};
          list
            .filter((f) => (f.status ?? 'active') === 'active')
            .forEach((f) => {
              if (f.test_type && byType[f.test_type] === undefined) {
                byType[f.test_type] = Number(f.amount);
              }
            });
          if (Object.keys(byType).length) {
            setExamFees((prev) => ({ ...prev, ...byType }));
          }
        }
      } catch { /* keep fallback */ }
    })();
    return () => { aborted = true; };
  }, []);
  const [jobTitles, setJobTitles] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    const fetchAdvertisement = async () => {
      try {
        const result = await AdvertisementApi.getById(id);
        if (result.success) {
          const data = result.data;
          setAdvDate(data.adv_date?.split("T")[0] || "");
          setAdvNumber(data.adv_number || "");
          setClosingDate(data.closing_date?.split("T")[0] || "");
          setAdvertisementFee(data.advertisement_fee || "");
          setNote(data.note || data.notes || data.ad_note || "");
          setImportantNotes(data.important_notes || "");

          let terms = [""];
          if (data.terms_conditions) {
            try {
              const parsed = typeof data.terms_conditions === "string" ? JSON.parse(data.terms_conditions) : data.terms_conditions;
              if (Array.isArray(parsed) && parsed.length) {
                terms = parsed;
              }
            } catch {}
          }
          setTermsConditions(terms);

          if (data.job_details && Array.isArray(data.job_details)) {
            const jIds = [];
            const jTitles = {};
            const jConfigs = {};
            data.job_details.forEach(job => {
              const jobId = job.hash_id || job.id;
              jIds.push(jobId);
              jTitles[jobId] = job.designation || `Job ${jobId}`;
              jConfigs[jobId] = {
                fee: job.pivot?.fee || "",
                testType: job.pivot?.test_type || ""
              };
            });
            setSelectedIds(jIds);
            setJobTitles(jTitles);
            setJobConfigs(jConfigs);
          }
        } else {
          toast.error("Failed to load advertisement details");
          navigate(-1);
        }
      } catch (error) {
        toast.error("Error loading advertisement");
        navigate(-1);
      } finally {
        setFetching(false);
      }
    };

    fetchAdvertisement();
  }, [id, navigate]);

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

    const filteredTerms = termsConditions.filter((t) => t.trim().length > 0);

    setLoading(true);
    const loadingToast = toast.loading("Saving updates...");

    try {
      const feesPayload = {};
      const testTypesPayload = {};
      Object.keys(jobConfigs).forEach((jobId) => {
        feesPayload[jobId] = jobConfigs[jobId].fee || "";
        testTypesPayload[jobId] = jobConfigs[jobId].testType || "";
      });

      const payload = {
        closing_date: closingDate,
        advertisement_fee: advertisementFee || "",
        note: note || "",
        important_notes: importantNotes || "",
        terms_conditions: filteredTerms,
        job_fees: JSON.stringify(feesPayload),
        job_test_types: JSON.stringify(testTypesPayload)
      };

      const result = await AdvertisementApi.update(id, payload);

      if (result.success) {
        toast.success("Advertisement updated successfully", { id: loadingToast });
        navigate("/dashboard/advertisement-records");
      }
    } catch (err) {
      if (err.errors) {
          setFieldErrors(err.errors);
      }
      toast.error(err.message || "Failed to update advertisement", {
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

  if (fetching) {
    return (
      <div className="job-creation-container">
        <div className="container">
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
            <div className="flex items-center justify-center gap-3">
              <FileEdit className="w-8 h-8" />
              <span>Edit Advertisement</span>
            </div>
          </div>
          <div className="form-container" style={{ padding: 40, textAlign: "center" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="job-creation-container">
      <div className="container">
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white py-4 px-6 rounded-t-xl text-center text-2xl font-bold shadow-lg mb-6">
          <div className="flex items-center justify-center gap-3">
            <FileEdit className="w-8 h-8" />
            <span>Edit Advertisement</span>
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
                    inputProps={{ readOnly: true, style: { height: 28 } }}
                    disabled
                    sx={fieldSx}
                  />
                </div>
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Advertisement Number"
                    value={advNumber}
                    disabled
                    sx={fieldSx}
                  />
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
                    inputProps={{ min: advDate, style: { height: 28 } }}
                    error={!!fieldErrors?.closing_date}
                    helperText={
                      Array.isArray(fieldErrors?.closing_date)
                        ? fieldErrors.closing_date.join(", ")
                        : fieldErrors?.closing_date
                    }
                  />
                  {advDate && closingDate && (() => {
                    const start = new Date(advDate);
                    const end   = new Date(closingDate);
                    const days  = Math.round((end - start) / (1000 * 60 * 60 * 24));
                    if (Number.isNaN(days) || days < 0) return null;
                    return (
                      <div className="total-duration-pill">
                        <span className="total-duration-label">Total Duration:</span>
                        <span className="total-duration-value">
                          {days} day{days === 1 ? '' : 's'}
                        </span>
                      </div>
                    );
                  })()}
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

            {selectedIds.length > 0 && (
              <>
                <div className="row" style={{ margin: 0 }}>
                  <div className="col-md-12">
                    <h6 className="section-title">Requisition Specific Details</h6>
                  </div>
                </div>
                {selectedIds.map((jobId) => {
                  const designation = jobTitles[jobId] || `Requisition ${jobId}`;
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
                        <div className="flex flex-col">
                          <span>{designation}</span>
                          <span className="text-xs font-normal text-emerald-600 uppercase tracking-wider">Designation / Job ID: {jobId}</span>
                        </div>
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
                              const typeName = TEST_TYPE_CODE_TO_NAME[newType];
                              const newFee = typeName && examFees[typeName] !== undefined
                                ? String(examFees[typeName])
                                : "";

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
                            helperText="Choose the test type — fee auto-fills"
                          >
                            <MenuItem value="1">MCQs</MenuItem>
                            <MenuItem value="2">Written Exam</MenuItem>
                          </TextField>
                        </div>
                        <div className="col-md-6 form-group">
                          <TextField
                            fullWidth
                            label="Application Fee (PKR)"
                            type="number"
                            value={jobConfigs[jobId]?.fee || ""}
                            InputProps={{
                              readOnly: true,
                            }}
                            placeholder="Auto-filled from Test Type"
                            sx={{
                              ...fieldSx,
                              "& .MuiInputBase-input": {
                                backgroundColor: "#f8fafc",
                              }
                            }}
                            helperText="Auto-filled from the chosen Test Type"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

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
                    multiline
                    maxRows={12}
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
                        multiline
                        maxRows={12}
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
                  "Updating..."
                ) : (
                  <>
                    <Save size={16} />
                    <span>Update Advertisement</span>
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

export default AdvertisementEditForm;
