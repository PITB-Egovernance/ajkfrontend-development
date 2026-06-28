import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Checkbox, TextField, MenuItem } from "@mui/material";
import { FileText, CheckCircle2, Plus, Trash2, Save } from "lucide-react";
import toast from "react-hot-toast";
import AdvertisementApi from "../../api/advertisementApi";
import RequisitionApi from "../../api/requisitionApi";
import Config from "../../config/baseUrl";
import AuthService from "../../services/authService";
import "../job-creation/JobCreationForm.css";

const FALLBACK_TESTS = [
  { id: "1", test_name: "MCQs", test_fees: 505 },
  { id: "2", test_name: "Written Exam", test_fees: 1010 },
];

const CCE_STAGES = [
  { value: "screening", label: "Screening" },
  { value: "written_test", label: "Written Test" },
];

const formatDateForDisplay = (value) => {
  if (!value) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";

  return `${match[3]}-${match[2]}-${match[1]}`;
};

const parseDisplayDate = (value) => {
  const digitsOnly = String(value).replace(/\D/g, "");
  if (digitsOnly.length !== 8) return "";

  const day = digitsOnly.slice(0, 2);
  const month = digitsOnly.slice(2, 4);
  const year = digitsOnly.slice(4, 8);
  const parsed = new Date(`${year}-${month}-${day}`);

  return Number.isNaN(parsed.getTime()) ? "" : `${year}-${month}-${day}`;
};

const updateDateFieldValue = (rawValue, setStoredValue, setDisplayValue) => {
  const digitsOnly = String(rawValue).replace(/\D/g, "");
  const limited = digitsOnly.slice(0, 8);

  let nextDisplay = "";
  if (limited.length <= 2) {
    nextDisplay = limited;
  } else if (limited.length <= 4) {
    nextDisplay = `${limited.slice(0, 2)}-${limited.slice(2)}`;
  } else {
    nextDisplay = `${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4, 8)}`;
  }

  setDisplayValue(nextDisplay);

  if (limited.length === 8) {
    const day = limited.slice(0, 2);
    const month = limited.slice(2, 4);
    const year = limited.slice(4, 8);
    const parsed = new Date(`${year}-${month}-${day}`);
    setStoredValue(Number.isNaN(parsed.getTime()) ? "" : `${year}-${month}-${day}`);
  } else {
    setStoredValue("");
  }
};

const AdvertisementCreateForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const initialAdvDate = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();

  const [advDate, setAdvDate] = useState(initialAdvDate);
  const [advDateInput, setAdvDateInput] = useState(formatDateForDisplay(initialAdvDate));
  const [advNumber, setAdvNumber] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [closingDateInput, setClosingDateInput] = useState("");
  const [advertisementFee, setAdvertisementFee] = useState("");
  const [note, setNote] = useState("");
  const [importantNotes, setImportantNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState([""]);
  const [jobConfigs, setJobConfigs] = useState({});
  const [jobTitles, setJobTitles] = useState({});
  const [examTests, setExamTests] = useState(FALLBACK_TESTS);
  const [testTypes, setTestTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [existingAdvNumbers, setExistingAdvNumbers] = useState([]);

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
            .filter(
              (subject) =>
                String(subject.status || "active").toLowerCase() === "active"
            )
            .filter((subject) => subject.hash_id)
            .map((subject) => ({
              hash_id: String(subject.hash_id),
              name:
                subject.name ||
                subject.subject_name ||
                subject.title ||
                "",
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

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const res = await fetch(`${Config.apiUrl}/settings/test-types/dropdown`, {
          headers: {
            Authorization: `Bearer ${AuthService.getToken()}`,
            Accept: "application/json",
            "X-API-KEY": Config.apiKey,
          },
        });

        const result = await res.json();
        if (aborted) return;

        if (res.ok && (result.success || result.status === 200)) {
          const list = result.data?.data ?? result.data ?? [];

          setTestTypes(
            list.map((t) => ({
              hash_id: t.hash_id || String(t.id),
              name: t.name || t.label || "",
            }))
          );
        }
      } catch {}
    })();

    return () => {
      aborted = true;
    };
  }, []);

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const res = await fetch(`${Config.apiUrl}/settings/tests`, {
          headers: {
            Authorization: `Bearer ${AuthService.getToken()}`,
            Accept: "application/json",
            "X-API-KEY": Config.apiKey,
          },
        });

        const result = await res.json();
        if (aborted) return;

        if (res.ok && (result.success || result.status === 200)) {
          const list = result.data?.data ?? result.data ?? [];

          const active = list
            .filter((t) => (t.status ?? "active") === "active")
            .map((t) => {
              const ttObj =
                t.test_type && typeof t.test_type === "object"
                  ? t.test_type
                  : null;

              return {
                id: t.hash_id || String(t.id),
                test_type_id: ttObj?.hash_id || t.test_type_id || "",
                test_name: ttObj?.name || t.test_type_name || t.test_name,
                test_fees: Number(t.test_fees ?? t.fees ?? 0),
              };
            });

          if (active.length) setExamTests(active);
        }
      } catch {}
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const testTypeOptions = testTypes.length
    ? testTypes
    : examTests.map((t) => ({
        hash_id: t.test_type_id || t.id,
        name: t.test_name,
      }));

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

  const getSelectedSubjectMarks = (subjectIds = []) =>
    subjects.reduce(
      (total, subject) =>
        subjectIds.includes(subject.hash_id)
          ? total + subject.total_marks
          : total,
      0
    );

  const toggleSubject = (jobId, subjectId) => {
    setJobConfigs((prev) => {
      const currentIds = prev[jobId]?.subjectIds || [];
      const isSelected = currentIds.includes(subjectId);

      return {
        ...prev,
        [jobId]: {
          ...prev[jobId],
          subjectIds: isSelected
            ? currentIds.filter((id) => id !== subjectId)
            : [...currentIds, subjectId],
        },
      };
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`subject_${jobId}`];
      return next;
    });
  };

  const selectedIds = useMemo(() => {
    const raw = searchParams.get("ids");
    if (!raw) return [];

    try {
      if (raw.startsWith("[")) return JSON.parse(raw);
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    } catch {
      return raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }, [searchParams]);

  const getNextAdvNumber = (list) => {
    const yy = String(new Date().getFullYear()).slice(-2);
    let next = 1;

    const nums = list
      .map((v) => {
        const m = v.match(/Advertisement\s+(\d+)-(\d+)/i);
        if (!m) return null;
        return { n: parseInt(m[1], 10), yy: m[2] };
      })
      .filter(Boolean)
      .filter((item) => item.yy === yy)
      .map((item) => item.n);

    if (nums.length) next = Math.max(...nums) + 1;

    return `Advertisement ${next}-${yy}`;
  };

  const fetchAdvertisementNotes = async () => {
    try {
      const result = await AdvertisementApi.getApprovedRequisitions();

      if (result?.success) {
        const payload = result.data || result;
        const notes = payload.notes || payload;

        setImportantNotes(notes.important_notes || "");

        const tc =
          Array.isArray(notes.terms_conditions) &&
          notes.terms_conditions.length
            ? notes.terms_conditions
            : [""];

        setTermsConditions(tc);
      }
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const result = await AdvertisementApi.getAll();

        if (result?.success && Array.isArray(result?.data?.data)) {
          const list = result.data.data
            .map((ad) => ad.adv_number)
            .filter(Boolean);

          setExistingAdvNumbers(list);
          setAdvNumber(getNextAdvNumber(list));
        } else {
          const yy = String(new Date().getFullYear()).slice(-2);
          setAdvNumber(`Advertisement 1-${yy}`);
        }
      } catch {
        const yy = String(new Date().getFullYear()).slice(-2);
        setAdvNumber(`Advertisement 1-${yy}`);
      }

      fetchAdvertisementNotes();
    })();
  }, []);

  useEffect(() => {
    if (!selectedIds.length) return;

    setJobConfigs((prev) => {
      const next = { ...prev };

      selectedIds.forEach((id) => {
        if (!next[id]) {
          next[id] = {
            fee: "",
            testType: "",
            subjectIds: [],
            cceStage: "",
          };
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
          const adsJobs =
            adsResult?.data?.jobs?.data || adsResult?.data?.jobs || [];
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
                if (job.designation) titlesMap[id] = job.designation;
              }
            } catch {}
          });

          await Promise.all(individualFetches);
        }

        setJobTitles((prev) => ({ ...prev, ...titlesMap }));
      } catch {}
    };

    fetchTitles();
  }, [selectedIds]);

  const addTerm = () => setTermsConditions((prev) => [...prev, ""]);

  const removeTerm = (idx) =>
    setTermsConditions((prev) => prev.filter((_, i) => i !== idx));

  const updateTerm = (idx, value) =>
    setTermsConditions((prev) =>
      prev.map((t, i) => (i === idx ? value : t))
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (
      existingAdvNumbers.some(
        (num) =>
          num.toLowerCase().trim() === advNumber.toLowerCase().trim()
      )
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        adv_number: [
          "This advertisement number already exists. Please choose a unique number.",
        ],
      }));
      toast.error("Advertisement number already exists");
      return;
    }

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

    const filteredTerms = termsConditions.filter(
      (t) => t.trim().length > 0
    );

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
      // New advertisements enter the approval flow as pending by default.
      fd.append("status", "pending");

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
          ? (config.subjectIds || [])
              .map(String)
              .filter((hashId) => validSubjectHashIds.has(hashId))
          : [];

        cceStagesPayload[jobId] = isCombinedCompetitiveExam(
          config.testType
        )
          ? config.cceStage || ""
          : "";
      });

      fd.append("job_fees", JSON.stringify(feesPayload));
      fd.append("job_test_types", JSON.stringify(testTypesPayload));
      fd.append("job_subjects", JSON.stringify(subjectsPayload));
      fd.append("job_cce_stages", JSON.stringify(cceStagesPayload));
    fd.append("status", "pending");
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
          setAdvNumber(getNextAdvNumber(existingAdvNumbers));
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
            <span>Create Advertisement</span>
          </div>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} className="card-body">
            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">
                  Advertisement Information
                </h6>
              </div>
            </div>

            <div className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
              <div className="row">
                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Advertisement Date"
                    type="text"
                    value={advDateInput}
                    InputLabelProps={{ shrink: true }}
                    onChange={(e) => updateDateFieldValue(e.target.value, setAdvDate, setAdvDateInput)}
                    inputProps={{ style: { height: 28 }, placeholder: "DD-MM-YYYY" }}
                    sx={fieldSx}
                  />
                </div>

                <div className="col-md-6 form-group">
                  <TextField
                    fullWidth
                    label="Advertisement Number"
                    value={advNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdvNumber(val);

                      if (
                        existingAdvNumbers.some(
                          (num) =>
                            num.toLowerCase().trim() ===
                            val.toLowerCase().trim()
                        )
                      ) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          adv_number: [
                            "This advertisement number already exists. Please choose a unique number.",
                          ],
                        }));
                      } else {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.adv_number;
                          return next;
                        });
                      }
                    }}
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
                      onClick={() => {
                        setAdvNumber(getNextAdvNumber(existingAdvNumbers));
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.adv_number;
                          return next;
                        });
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
                    type="text"
                    value={closingDateInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateDateFieldValue(val, setClosingDate, setClosingDateInput);

                      if (closingDate && advDate && closingDate <= advDate) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          closing_date: [
                            "Closing date must be after the advertisement date (same date not allowed)",
                          ],
                        }));
                      } else {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next.closing_date;
                          return next;
                        });
                      }
                    }}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                    inputProps={{
                      style: { height: 28 },
                      placeholder: "DD-MM-YYYY",
                    }}
                    error={
                      !!(
                        fieldErrors?.closing_date ||
                        (closingDate && advDate && closingDate <= advDate)
                      )
                    }
                    helperText={
                      closingDate && advDate && closingDate <= advDate
                        ? "Closing date must be after advertisement date (same date not allowed)"
                        : Array.isArray(fieldErrors?.closing_date)
                        ? fieldErrors.closing_date.join(", ")
                        : fieldErrors?.closing_date || ""
                    }
                  />

                  {advDate &&
                    closingDate &&
                    (() => {
                      const start = new Date(advDate);
                      const end = new Date(closingDate);
                      const days = Math.round(
                        (end - start) / (1000 * 60 * 60 * 24)
                      );

                      if (Number.isNaN(days) || days < 0) return null;

                      return (
                        <div className="total-duration-pill">
                          <span className="total-duration-label">
                            Total Duration:
                          </span>
                          <span className="total-duration-value">
                            {days} day{days === 1 ? "" : "s"}
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

            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">
                  Requisition Specific Details
                </h6>
              </div>
            </div>

            {selectedIds.map((jobId) => {
              const designation = jobTitles[jobId];

              return (
                <div
                  key={jobId}
                  className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full"
                >
                  <h6 className="text-lg font-bold text-emerald-900 mb-6 flex items-center gap-3 pb-3 border-b border-emerald-100">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shadow-inner">
                      <CheckCircle2 size={20} />
                    </div>

                    {designation ? (
                      <div className="flex flex-col">
                        <span>{designation}</span>
                        <span className="text-xs font-normal text-emerald-600 uppercase tracking-wider">
                          Designation / Job ID: {jobId}
                        </span>
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
                          const matchedFee = feeForTestType(newType);

                          setJobConfigs((prev) => {
                            const prevFee = prev[jobId]?.fee;
                            const prevType = prev[jobId]?.testType;

                            const nextFee =
                              prevFee && prevType === newType
                                ? prevFee
                                : matchedFee;

                            return {
                              ...prev,
                              [jobId]: {
                                ...prev[jobId],
                                testType: newType,
                                fee: nextFee,
                                subjectIds: isWrittenTestType(newType)
                                  ? prev[jobId]?.subjectIds || []
                                  : [],
                                cceStage: isCombinedCompetitiveExam(newType)
                                  ? prev[jobId]?.cceStage || ""
                                  : "",
                              },
                            };
                          });

                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            delete next[`test_type_${jobId}`];
                            delete next[`subject_${jobId}`];
                            delete next[`cce_stage_${jobId}`];
                            return next;
                          });
                        }}
                        sx={fieldSx}
                        error={!!fieldErrors?.[`test_type_${jobId}`]}
                        helperText={
                          fieldErrors?.[`test_type_${jobId}`]
                            ? Array.isArray(
                                fieldErrors[`test_type_${jobId}`]
                              )
                              ? fieldErrors[
                                  `test_type_${jobId}`
                                ].join(", ")
                              : fieldErrors[`test_type_${jobId}`]
                            : "Choose the test type — fee auto-fills"
                        }
                      >
                        <MenuItem value="">
                          <em>— Select Test Type —</em>
                        </MenuItem>

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
                        value={jobConfigs[jobId]?.fee ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;

                          setJobConfigs((prev) => ({
                            ...prev,
                            [jobId]: {
                              ...prev[jobId],
                              fee: v,
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
                      <div className="col-md-12 form-group">
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px] gap-4 items-stretch">
                          <div className={`rounded-xl border bg-white overflow-hidden ${
                            fieldErrors?.[`subject_${jobId}`] ? "border-red-400" : "border-slate-200"
                          }`}>
                            <div className="flex items-center justify-between gap-4 px-5 py-4 bg-slate-50 border-b border-slate-200">
                              <div>
                                <p className="text-sm font-semibold text-slate-800">Select Subjects</p>
                                <p className="mt-1 text-xs text-slate-500">Choose one or more subjects for the written exam</p>
                              </div>
                              <span className="shrink-0 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                {(jobConfigs[jobId]?.subjectIds || []).length} selected
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 max-h-80 overflow-y-auto">
                              {subjects.map((subject) => {
                                const checked = (jobConfigs[jobId]?.subjectIds || []).includes(subject.hash_id);
                                return (
                                  <label
                                    key={subject.hash_id}
                                    className={`flex items-center gap-3 min-h-12 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                                      checked
                                        ? "border-emerald-400 bg-emerald-50"
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onChange={() => toggleSubject(jobId, subject.hash_id)}
                                      size="small"
                                      sx={{ p: 0, color: "#10b981", "&.Mui-checked": { color: "#059669" } }}
                                    />
                                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-700 leading-5">
                                      {subject.name}
                                    </span>
                                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                      {subject.total_marks} marks
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex min-h-[152px] flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-6">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total Marks</p>
                            <p className="mt-2 text-4xl font-bold text-emerald-900">
                              {getSelectedSubjectMarks(jobConfigs[jobId]?.subjectIds)}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-emerald-700">
                              Sum of all selected subject marks
                            </p>
                          </div>
                        </div>

                        <p className={`mt-2 text-xs ${
                          fieldErrors?.[`subject_${jobId}`] ? "text-red-600" : "text-slate-500"
                        }`}>
                          {fieldErrors?.[`subject_${jobId}`]
                            ? Array.isArray(fieldErrors[`subject_${jobId}`])
                              ? fieldErrors[`subject_${jobId}`].join(", ")
                              : fieldErrors[`subject_${jobId}`]
                            : "Selected subject marks are added automatically."}
                        </p>
                      </div>
                    )}

                    {isCombinedCompetitiveExam(
                      jobConfigs[jobId]?.testType
                    ) && (
                      <div className="col-md-12 form-group">
                        <div className={`rounded-xl border bg-white overflow-hidden ${
                          fieldErrors?.[`cce_stage_${jobId}`] ? "border-red-400" : "border-slate-200"
                        }`}>
                          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                            <p className="text-sm font-semibold text-slate-800">Select CCE Stage</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Choose one stage for the Combined Competitive Examination
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                            {CCE_STAGES.map((stage) => {
                              const checked = jobConfigs[jobId]?.cceStage === stage.value;
                              return (
                                <label
                                  key={stage.value}
                                  className={`flex items-center gap-3 min-h-12 rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                                    checked
                                      ? "border-emerald-400 bg-emerald-50"
                                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onChange={() => {
                                      setJobConfigs((prev) => ({
                                        ...prev,
                                        [jobId]: {
                                          ...prev[jobId],
                                          cceStage: checked ? "" : stage.value,
                                        },
                                      }));
                                      setFieldErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[`cce_stage_${jobId}`];
                                        return next;
                                      });
                                    }}
                                    size="small"
                                    sx={{ p: 0, color: "#10b981", "&.Mui-checked": { color: "#059669" } }}
                                  />
                                  <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <p className={`mt-2 text-xs ${
                          fieldErrors?.[`cce_stage_${jobId}`] ? "text-red-600" : "text-slate-500"
                        }`}>
                          {fieldErrors?.[`cce_stage_${jobId}`]
                            ? Array.isArray(fieldErrors[`cce_stage_${jobId}`])
                              ? fieldErrors[`cce_stage_${jobId}`].join(", ")
                              : fieldErrors[`cce_stage_${jobId}`]
                            : "Only one CCE stage can be selected."}
                        </p>
                      </div>
                    )}
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
                <div
                  className="col-md-6 form-group"
                  style={{
                    width: "-webkit-fill-available",
                    flex: "0 !important",
                    minWidth: "-webkit-fill-available",
                  }}
                >
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
                <div
                  className="col-md-6"
                  style={{
                    width: "-webkit-fill-available",
                    flex: "0 !important",
                    minWidth: "-webkit-fill-available",
                  }}
                >
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
                    <div
                      style={{
                        marginTop: 6,
                        color: "#dc3545",
                        fontSize: 12,
                      }}
                    >
                      {Array.isArray(fieldErrors.terms_conditions)
                        ? fieldErrors.terms_conditions.join(", ")
                        : fieldErrors.terms_conditions}
                    </div>
                  )}

                  {!!fieldErrors?.job_ids && (
                    <div
                      style={{
                        marginTop: 6,
                        color: "#dc3545",
                        fontSize: 12,
                      }}
                    >
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
