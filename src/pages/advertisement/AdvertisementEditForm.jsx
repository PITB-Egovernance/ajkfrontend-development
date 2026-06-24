import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Autocomplete, Checkbox, TextField, MenuItem } from "@mui/material";
import { FileEdit, CheckCircle2, Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import AdvertisementApi from "../../api/advertisementApi";
import Config from "../../config/baseUrl";
import AuthService from "../../services/authService";
import "../job-creation/JobCreationForm.css";

// Fallback test-fee records used until the live /settings/tests endpoint responds.
const FALLBACK_TESTS = [
  { id: '1', test_type_id: '1', test_name: 'MCQs',         test_fees: 505  },
  { id: '2', test_type_id: '2', test_name: 'Written Exam', test_fees: 1010 },
];

const CCE_STAGES = [
  { value: 'screening', label: 'Screening' },
  { value: 'written_test', label: 'Written Test' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'temporary_closed', label: 'Temporary Closed' },
  { value: 'permanently_closed', label: 'Permanently Closed' },
  { value: 'reopen', label: 'Reopen' },
  { value: 'extend_date', label: 'Extend Date' },
];

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
  const [examTests, setExamTests] = useState(FALLBACK_TESTS);
  const [testTypes, setTestTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [status, setStatus] = useState("active");
  const [extendDate, setExtendDate] = useState("");
  const [isPublished, setIsPublished] = useState(false);


  // Fetch subjects for Written Exam dropdown
  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const headers = {
          Authorization: `Bearer ${AuthService.getToken()}`,
          Accept: "application/json",
          "X-API-KEY": Config.apiKey,
        };

        const fetchPage = async (page) => {
          const res = await fetch(
            `${Config.apiUrl}/settings/subjects?page=${page}&per_page=100`,
            { method: "GET", headers }
          );
          const result = await res.json();

          if (!res.ok) {
            throw new Error(result.message || "Failed to load subjects");
          }

          return result.data ?? {};
        };

        const firstPage = await fetchPage(1);
        const lastPage = Number(firstPage.last_page) || 1;
        const remainingPages = await Promise.all(
          Array.from({ length: Math.max(lastPage - 1, 0) }, (_, index) =>
            fetchPage(index + 2)
          )
        );

        if (aborted) return;

        const list = [firstPage, ...remainingPages].flatMap((page) =>
          Array.isArray(page.data) ? page.data : []
        );

        setSubjects(
          list
            .filter((subject) => subject.hash_id)
            .map((subject) => ({
              hash_id: String(subject.hash_id),
              id: subject.id ? String(subject.id) : "",
              name: subject.name || subject.subject_name || subject.title || "",
              total_marks: Number(subject.total_marks) || 0,
            }))
            .filter((subject) => subject.hash_id && subject.name)
        );
      } catch {
        setSubjects([]);
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  // Fetch the active test types for the dropdown
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${Config.apiUrl}/settings/test-types/dropdown`, {
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
          setTestTypes(list.map((t) => ({
            hash_id: t.hash_id || String(t.id),
            name:    t.name || t.label || '',
          })));
        }
      } catch { /* dropdown falls back to the test-fee records below */ }
    })();
    return () => { aborted = true; };
  }, []);

  // Fetch the test-fee records used to auto-fill the application fee
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`${Config.apiUrl}/settings/tests`, {
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
          const active = list
            .filter((t) => (t.status ?? 'active') === 'active')
            .map((t) => {
              const ttObj = t.test_type && typeof t.test_type === 'object' ? t.test_type : null;
              return {
                id:           t.hash_id || String(t.id),
                test_type_id: ttObj?.hash_id || t.test_type_id || '',
                test_name:    ttObj?.name || t.test_type_name || t.test_name,
                test_fees:    Number(t.test_fees ?? t.fees ?? 0),
              };
            });
          if (active.length) setExamTests(active);
        }
      } catch { /* keep fallback */ }
    })();
    return () => { aborted = true; };
  }, []);

  // Dropdown options — prefer the test-types endpoint, fall back to the test-fee records
  const testTypeOptions = testTypes.length
    ? testTypes
    : examTests.map((t) => ({ hash_id: t.test_type_id || t.id, name: t.test_name }));

  // The fee for a selected test type comes from its matching test-fee record
  const feeForTestType = (typeId) => {
    const rec = examTests.find((t) => (t.test_type_id || t.id) === typeId);
    return rec ? String(rec.test_fees) : "";
  };


  const getTestTypeName = (typeId) => {
    const option = testTypeOptions.find(
      (t) => String(t.hash_id) === String(typeId)
    );
    return (option?.name || "").toLowerCase().trim();
  };

  const isWrittenTestType = (typeId) => {
    const name = getTestTypeName(typeId);
    return name.includes("written") && !name.includes("combined");
  };

  const isCombinedCompetitiveExam = (typeId) => {
    const name = getTestTypeName(typeId);
    return (
      name.includes("combined") ||
      name.includes("competitive") ||
      name.includes("cce")
    );
  };

  const normalizeSubjectIds = (subjectIds = []) =>
    (Array.isArray(subjectIds) ? subjectIds : [])
      .filter((value) => value !== null && value !== undefined && value !== "")
      .map(String);

  const subjectMatchesSelectedIds = (subject, subjectIds = []) => {
    const selected = normalizeSubjectIds(subjectIds);

    return selected.some(
      (selectedId) =>
        String(subject.hash_id || "") === selectedId ||
        String(subject.id || "") === selectedId
    );
  };

  const getSelectedSubjectMarks = (subjectIds = []) =>
    subjects.reduce(
      (total, subject) =>
        subjectMatchesSelectedIds(subject, subjectIds)
          ? total + subject.total_marks
          : total,
      0
    );

  const getJobSubjectRows = (data, job) => {
    const rows = Array.isArray(data.job_subjects) ? data.job_subjects : [];
    const jobs = Array.isArray(data.job_details) ? data.job_details : [];

    /*
      Important:
      API response currently gives job_subjects with numeric job_id/subject_id,
      but job_details id is hidden because of HasHashId model hidden id.
      For a single-job advertisement, all job_subjects belong to that one job,
      so return all rows as fallback.
    */
    if (jobs.length === 1 && rows.length > 0) {
      return rows;
    }

    const jobHash = String(job.hash_id || "");
    const jobNumericId = String(
      job.id ||
        job.real_id ||
        job.numeric_id ||
        job.job_detail_id ||
        job.pivot?.job_detail_id ||
        ""
    );

    return rows.filter((row) => {
      const rowJobHash = String(
        row.job_detail?.hash_id ||
          row.job?.hash_id ||
          row.job_detail_hash_id ||
          row.job_hash_id ||
          ""
      );

      const rowJobId = String(
        row.job_detail_id ||
          row.job_id ||
          row.job?.id ||
          row.job_detail?.id ||
          ""
      );

      return (
        (jobHash && rowJobHash && rowJobHash === jobHash) ||
        (jobNumericId && rowJobId && rowJobId === jobNumericId)
      );
    });
  };

  const getSubjectIdFromRow = (row) =>
    row.subject?.hash_id ||
    row.subject_hash_id ||
    row.subjectHashId ||
    row.subject?.id ||
    row.subject_id ||
    row.hash_id ||
    "";
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
          setStatus(data.status || "active");
          setExtendDate(data.extend_date?.split("T")[0] || "");
          setIsPublished(!!data.publish_date);

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
            data.job_details.forEach((job) => {
              const jobId = String(job.hash_id || job.id);
              const subjectRows = getJobSubjectRows(data, job);
              const subjectIds = subjectRows
                .map(getSubjectIdFromRow)
                .filter(Boolean)
                .map(String);

              const savedCceStage =
                job.pivot?.cce_stage ||
                subjectRows.find((row) => row.cce_stage)?.cce_stage ||
                "";

              jIds.push(jobId);
              jTitles[jobId] = job.designation || `Job ${jobId}`;
              jConfigs[jobId] = {
                fee: job.pivot?.fee || "",
                // The saved test type may come back as a hash id, a *_id field, or a nested object
                testType:
                  job.pivot?.test_type_id ||
                  (job.pivot?.test_type && typeof job.pivot.test_type === "object"
                    ? job.pivot.test_type.hash_id || job.pivot.test_type.id
                    : job.pivot?.test_type) ||
                  "",
                subjectIds,
                cceStage: savedCceStage,
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

    if (filteredTerms.length === 0) {
      toast.error("Please add at least one term & condition");
      return;
    }

    for (const jobId of selectedIds) {
      const config = jobConfigs[jobId] || {};

      if (
        isWrittenTestType(config.testType) &&
        (!Array.isArray(config.subjectIds) || config.subjectIds.length === 0)
      ) {
        setFieldErrors((prev) => ({
          ...prev,
          [`subject_${jobId}`]: [
            "Please select at least one subject for Written Exam",
          ],
        }));
        toast.error("Please select at least one subject for Written Exam");
        return;
      }

      if (isCombinedCompetitiveExam(config.testType) && !config.cceStage) {
        setFieldErrors((prev) => ({
          ...prev,
          [`cce_stage_${jobId}`]: ["Please select CCE stage"],
        }));
        toast.error("Please select CCE stage");
        return;
      }
    }

    setLoading(true);
    const loadingToast = toast.loading("Saving updates...");

    try {
      const feesPayload = {};
      const testTypesPayload = {};
      const subjectsPayload = {};
      const cceStagesPayload = {};
      const validSubjectHashIds = new Set(
        subjects.map((subject) => String(subject.hash_id))
      );

      Object.keys(jobConfigs).forEach((jobId) => {
        const config = jobConfigs[jobId] || {};

        feesPayload[jobId] = config.fee || "";
        testTypesPayload[jobId] = config.testType || "";

        subjectsPayload[jobId] = isWrittenTestType(config.testType)
          ? subjects
              .filter((subject) =>
                subjectMatchesSelectedIds(subject, config.subjectIds || [])
              )
              .map((subject) => String(subject.hash_id))
              .filter((hashId) => validSubjectHashIds.has(hashId))
          : [];

        cceStagesPayload[jobId] = isCombinedCompetitiveExam(config.testType)
          ? config.cceStage || ""
          : "";
      });

      const payload = {
        closing_date: closingDate,
        advertisement_fee: advertisementFee || "",
        note: note || "",
        important_notes: importantNotes || "",
        terms_conditions: filteredTerms,
        status: isPublished ? status : "active",
        extend_date: status === "extend_date" ? (extendDate || null) : null,
        job_fees: JSON.stringify(feesPayload),
        job_test_types: JSON.stringify(testTypesPayload),
        job_subjects: JSON.stringify(subjectsPayload),
        job_cce_stages: JSON.stringify(cceStagesPayload),
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

  const subjectFieldSx = {
    ...fieldSx,
    width: "100%",
    minWidth: 0,
    "& .MuiOutlinedInput-root": {
      minHeight: 56,
      height: "auto",
      alignItems: "flex-start",
      flexWrap: "wrap",
      padding: "8px 40px 8px 8px !important",
    },
    "& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)": {
      height: "auto",
    },
    "& .MuiAutocomplete-tag": {
      maxWidth: "calc(100% - 8px)",
      margin: "3px",
    },
    "& .MuiChip-label": {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    "& .MuiAutocomplete-input": {
      minWidth: "140px !important",
      padding: "7px 4px !important",
    },
    "@media (max-width: 600px)": {
      "& .MuiAutocomplete-tag": {
        maxWidth: "100%",
      },
      "& .MuiAutocomplete-input": {
        width: "100% !important",
        minWidth: "100% !important",
      },
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

              {isPublished && (
              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatus(newStatus);
                      if (newStatus !== "extend_date") {
                        setExtendDate("");
                      }
                    }}
                    sx={fieldSx}
                    error={!!fieldErrors?.status}
                    helperText={
                      Array.isArray(fieldErrors?.status)
                        ? fieldErrors.status.join(", ")
                        : fieldErrors?.status
                    }
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </div>
                {status === "extend_date" && (
                  <div className="col-md-6 form-group">
                    <TextField
                      fullWidth
                      label="Extend Date"
                      type="date"
                      value={extendDate}
                      onChange={(e) => setExtendDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={fieldSx}
                      inputProps={{ min: closingDate, style: { height: 28 } }}
                      error={!!fieldErrors?.extend_date}
                      helperText={
                        Array.isArray(fieldErrors?.extend_date)
                          ? fieldErrors.extend_date.join(", ")
                          : fieldErrors?.extend_date || "Advertisement stays open until this date, beyond the closing date"
                      }
                    />
                  </div>
                )}
              </div>
              )}
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
                              const newFee = feeForTestType(newType);

                              setJobConfigs((prev) => ({
                                ...prev,
                                [jobId]: {
                                  ...prev[jobId],
                                  testType: newType,
                                  fee: newFee,
                                  subjectIds: isWrittenTestType(newType)
                                    ? prev[jobId]?.subjectIds || []
                                    : [],
                                  cceStage: isCombinedCompetitiveExam(newType)
                                    ? prev[jobId]?.cceStage || ""
                                    : "",
                                },
                              }));

                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next[`test_type_${jobId}`];
                                delete next[`subject_${jobId}`];
                                delete next[`cce_stage_${jobId}`];
                                return next;
                              });
                            }}
                            sx={fieldSx}
                            helperText="Choose the test type — fee auto-fills"
                          >
                            <MenuItem value=""><em>— Select Test Type —</em></MenuItem>
                            {testTypeOptions.map((t) => (
                              <MenuItem key={t.hash_id} value={t.hash_id}>
                                {t.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        </div>
                        <div className="col-md-6 form-group">
                          <TextField
                            fullWidth
                            label="Application Fee (PKR)"
                            type="number"
                            value={jobConfigs[jobId]?.fee || ""}
                            onChange={(e) => {
                              const value = e.target.value;

                              setJobConfigs((prev) => ({
                                ...prev,
                                [jobId]: {
                                  ...prev[jobId],
                                  fee: value,
                                },
                              }));
                            }}
                            placeholder="Auto-filled from Test Type"
                            inputProps={{ min: 0, step: "0.01" }}
                            sx={{
                              ...fieldSx,
                              "& .MuiInputBase-input": {
                                backgroundColor: "#f8fafc",
                              },
                            }}
                            error={!!fieldErrors?.[`fee_${jobId}`]}
                            helperText={
                              fieldErrors?.[`fee_${jobId}`]
                                ? Array.isArray(fieldErrors[`fee_${jobId}`])
                                  ? fieldErrors[`fee_${jobId}`].join(", ")
                                  : fieldErrors[`fee_${jobId}`]
                                : "Auto-filled from the chosen Test Type; editable if you need a different amount"
                            }
                          />
                        </div>

                        {isWrittenTestType(jobConfigs[jobId]?.testType) && (
                          <>
                            <div className="col-md-6 form-group">
                              <Autocomplete
                                multiple
                                disableCloseOnSelect
                                limitTags={2}
                                options={subjects}
                                sx={{ width: "100%", minWidth: 0 }}
                                value={subjects.filter((subject) =>
                                  subjectMatchesSelectedIds(
                                    subject,
                                    jobConfigs[jobId]?.subjectIds || []
                                  )
                                )}
                                getOptionLabel={(option) => option.name}
                                isOptionEqualToValue={(option, value) =>
                                  option.hash_id === value.hash_id
                                }
                                onChange={(_, selectedSubjects) => {
                                  setJobConfigs((prev) => ({
                                    ...prev,
                                    [jobId]: {
                                      ...prev[jobId],
                                      subjectIds: selectedSubjects.map(
                                        (subject) => subject.hash_id
                                      ),
                                    },
                                  }));

                                  setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next[`subject_${jobId}`];
                                    return next;
                                  });
                                }}
                                renderOption={(props, option, { selected }) => (
                                  <li {...props}>
                                    <Checkbox
                                      checked={selected}
                                      size="small"
                                      sx={{ mr: 1 }}
                                    />
                                    {option.name}
                                    <span className="ml-auto pl-3 text-sm text-slate-500">
                                      {option.total_marks} marks
                                    </span>
                                  </li>
                                )}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Subjects"
                                    placeholder="Search subjects..."
                                    sx={subjectFieldSx}
                                    error={!!fieldErrors?.[`subject_${jobId}`]}
                                    helperText={
                                      fieldErrors?.[`subject_${jobId}`]
                                        ? Array.isArray(
                                            fieldErrors[`subject_${jobId}`]
                                          )
                                          ? fieldErrors[`subject_${jobId}`].join(
                                              ", "
                                            )
                                          : fieldErrors[`subject_${jobId}`]
                                        : "Search and select subjects for Written Exam"
                                    }
                                  />
                                )}
                              />
                            </div>

                            <div className="col-md-6 form-group">
                              <TextField
                                fullWidth
                                label="Total Marks"
                                value={getSelectedSubjectMarks(
                                  jobConfigs[jobId]?.subjectIds
                                )}
                                InputProps={{ readOnly: true }}
                                sx={{
                                  ...fieldSx,
                                  "& .MuiOutlinedInput-input": {
                                    backgroundColor: "#f8fafc",
                                    fontWeight: 700,
                                  },
                                }}
                                helperText="Total marks of selected subjects"
                              />
                            </div>
                          </>
                        )}

                        {isCombinedCompetitiveExam(
                          jobConfigs[jobId]?.testType
                        ) && (
                          <div className="col-md-6 form-group">
                            <TextField
                              select
                              fullWidth
                              label="CCE Stage"
                              value={jobConfigs[jobId]?.cceStage || ""}
                              onChange={(e) => {
                                const value = e.target.value;

                                setJobConfigs((prev) => ({
                                  ...prev,
                                  [jobId]: {
                                    ...prev[jobId],
                                    cceStage: value,
                                  },
                                }));

                                setFieldErrors((prev) => {
                                  const next = { ...prev };
                                  delete next[`cce_stage_${jobId}`];
                                  return next;
                                });
                              }}
                              sx={fieldSx}
                              error={!!fieldErrors?.[`cce_stage_${jobId}`]}
                              helperText={
                                fieldErrors?.[`cce_stage_${jobId}`]
                                  ? Array.isArray(
                                      fieldErrors[`cce_stage_${jobId}`]
                                    )
                                    ? fieldErrors[`cce_stage_${jobId}`].join(
                                        ", "
                                      )
                                    : fieldErrors[`cce_stage_${jobId}`]
                                  : "Select CCE stage"
                              }
                            >
                              <MenuItem value="">
                                <em>— Select CCE Stage —</em>
                              </MenuItem>

                              {CCE_STAGES.map((stage) => (
                                <MenuItem key={stage.value} value={stage.value}>
                                  {stage.label}
                                </MenuItem>
                              ))}
                            </TextField>
                          </div>
                        )}
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
