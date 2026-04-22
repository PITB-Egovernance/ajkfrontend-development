import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TextField, MenuItem } from "@mui/material";
import { Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import AdvertisementApi from "../../api/advertisementApi";

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
          <div className="app-header">Edit Advertisement</div>
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
        <div className="app-header">Edit Advertisement</div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="card-body">
            <div className="row">
              <div className="col-md-12">
                <h6 className="section-title">Advertisement Information</h6>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 form-group">
                <TextField
                  fullWidth
                  label="Advertisement Date"
                  type="date"
                  value={advDate}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ readOnly: true }}
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



            {selectedIds.length > 0 && (
              <>
                <div className="row">
                  <div className="col-md-12">
                    <h6 className="section-title">Requisition Specific Details</h6>
                  </div>
                </div>
                {selectedIds.map((jobId) => {
                  const designation = jobTitles[jobId] || `Requisition ${jobId}`;
                  return (
                    <div
                      key={jobId}
                      style={{
                        marginBottom: 24,
                        padding: "16px",
                        border: "1px solid #e0e0e0",
                        borderRadius: 8,
                      }}
                    >
                      <h6
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#111827",
                          marginBottom: 16,
                        }}
                      >
                        {designation}
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
              </>
            )}

            <div className="row">
              <div className="col-md-12">
                <h6 className="section-title">Important Notes</h6>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12 form-group">
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

            <div className="row">
              <div className="col-md-12">
                <h6 className="section-title">Terms & Conditions</h6>
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
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
                        style={{ height: 56, padding: '0 16px' }}
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
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Plus size={16} />
                  Add Condition
                </button>
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
