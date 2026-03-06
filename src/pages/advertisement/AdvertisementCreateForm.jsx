import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TextField } from "@mui/material";
import { FileText, CheckCircle2, Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import Config from "Config/Baseurl";
import AuthService from "Services/AuthService";
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
  const [note, setNote] = useState("");
  const [importantNotes, setImportantNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState([""]);

  const selectedIds = useMemo(() => {
    const raw = searchParams.get("ids");
    if (!raw) return [];
    try {
      if (raw.startsWith("[")) {
        return JSON.parse(raw);
      }
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }, [searchParams]);

  const computeNextAdvNumber = async () => {
    try {
      const resp = await fetch(`${Config.apiUrl}/advertisements`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${AuthService.getToken()}`,
          "X-API-KEY": Config.apiKey,
        },
      });
      const result = await resp.json();
      const yy = String(new Date().getFullYear()).slice(-2);
      let next = 1;
      if (resp.ok && result?.success && Array.isArray(result?.data?.data)) {
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
      const response = await fetch(`${Config.apiUrl}/advertisements/notes`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${AuthService.getToken()}`,
          "X-API-KEY": Config.apiKey,
        },
      });
      const result = await response.json();
      if (response.ok) {
        setImportantNotes(result.important_notes || "");
        const tc =
          result.terms_conditions &&
          Array.isArray(result.terms_conditions) &&
          result.terms_conditions.length
            ? result.terms_conditions
            : [""];
        setTermsConditions(tc);
      }
    } catch {
      // keep defaults
    }
  };

  useEffect(() => {
    (async () => {
      const n = await computeNextAdvNumber();
      setAdvNumber(n);
    })();
  }, []);

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
      setFieldErrors((prev) => ({
        ...prev,
        job_ids: ["Please select at least one requisition"],
      }));
      toast.error("Please select at least one requisition");
      return;
    }
    const filteredTerms = termsConditions.filter((t) => t.trim().length > 0);
    if (filteredTerms.length === 0) {
      setFieldErrors((prev) => ({
        ...prev,
        terms_conditions: ["Please add at least one term & condition"],
      }));
      toast.error("Please add at least one term & condition");
      return;
    }
    setLoading(true);
    const loadingToast = toast.loading("Saving advertisement...");
    const verifyAndNavigate = async (advNum) => {
      try {
        const verify = await fetch(`${Config.apiUrl}/advertisements`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${AuthService.getToken()}`,
            "X-API-KEY": Config.apiKey,
          },
        });
        const verifyResult = await verify.json().catch(() => ({}));
        const createdExists = Array.isArray(verifyResult?.data?.data)
          ? verifyResult.data.data.some((ad) => ad?.adv_number === advNum)
          : false;
        if (createdExists) {
          try {
            const raw = localStorage.getItem("advertised_job_ids");
            const prev = raw ? JSON.parse(raw) : [];
            const merged = Array.from(
              new Set([...(prev || []), ...selectedIds])
            );
            localStorage.setItem("advertised_job_ids", JSON.stringify(merged));

            const notesRaw = localStorage.getItem("advertisement_notes_cache");
            const notesCache = notesRaw ? JSON.parse(notesRaw) : {};
            if ((note || "").trim().length > 0) {
              notesCache[advNum] = note.trim();
              localStorage.setItem(
                "advertisement_notes_cache",
                JSON.stringify(notesCache)
              );
            }
          } catch {}
          toast.success("Advertisement created", { id: loadingToast });
          navigate("/dashboard/advertisement-records", {
            state: { created: advNum, note },
          });
          return true;
        }
      } catch {
        // ignore
      }
      return false;
    };
    try {
      const fd = new FormData();
      fd.append("job_ids", (selectedIds || []).join(","));
      fd.append("adv_date", advDate);
      fd.append("adv_number", advNumber);
      fd.append("closing_date", closingDate);
      fd.append("note", note || "");
      fd.append("important_notes", importantNotes || "");
      filteredTerms.forEach((t) => fd.append("terms_conditions[]", t));

      const resp = await fetch(`${Config.apiUrl}/advertisements/store`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${AuthService.getToken()}`,
          "X-API-KEY": Config.apiKey,
        },
        body: fd,
      });
      const result = await resp.json().catch(() => ({}));

      if (resp.ok && result?.success !== false) {
        const ok = await verifyAndNavigate(advNumber);
        if (ok) return;
      }

      if (resp.status === 422 && result?.errors?.adv_number) {
        setFieldErrors(result.errors);
        const nextAdv = await computeNextAdvNumber();
        setAdvNumber(nextAdv);
        const fd2 = new FormData();
        fd2.append("job_ids", (selectedIds || []).join(","));
        fd2.append("adv_date", advDate);
        fd2.append("adv_number", String(nextAdv).trim());
        fd2.append("closing_date", closingDate);
        fd2.append("note", note || "");
        fd2.append("important_notes", importantNotes || "");
        filteredTerms.forEach((t) => fd2.append("terms_conditions[]", t));
        const resp2 = await fetch(`${Config.apiUrl}/advertisements/store`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${AuthService.getToken()}`,
            "X-API-KEY": Config.apiKey,
          },
          body: fd2,
        });
        const result2 = await resp2.json().catch(() => ({}));
        if (resp2.ok && result2?.success !== false) {
          const ok2 = await verifyAndNavigate(nextAdv);
          if (ok2) return;
        }
        setFieldErrors(result2.errors || {});
        throw new Error(result2?.message || "Failed to create advertisement");
      }

      // Fallback: Even on non-422 errors (e.g., 500), verify if created and proceed
      const okFallback = await verifyAndNavigate(advNumber);
      if (okFallback) return;

      setFieldErrors(result?.errors || {});
      throw new Error(result?.message || "Failed to create advertisement");
    } catch (err) {
      toast.error(err.message || "Failed to create advertisement", {
        id: loadingToast,
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
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
        <div className="app-header">Create Advertisement</div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="card-body">
            <h6 className="section-title">Advertisement Information</h6>

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

            <h6 className="section-title">Important Notes</h6>
            <div className="row">
              <div className="col-md-6 form-group">
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
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

            <h6 className="section-title">Terms & Conditions</h6>
            <div className="row">
              <div className="col-md-6">
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
                      minRows={3}
                      maxRows={12}
                      label={`Term ${idx + 1}`}
                      value={term}
                      onChange={(e) => updateTerm(idx, e.target.value)}
                      sx={fieldSx}
                    />
                    {termsConditions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-prev"
                        onClick={() => removeTerm(idx)}
                        title="Remove"
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
