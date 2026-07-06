import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Checkbox, TextField } from "@mui/material";
import SearchableSelect from 'components/ui/SearchableSelect';
import { FileEdit, CheckCircle2, Plus, Trash2, Save, Send, X } from "lucide-react";
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

const STATUS_OPTIONS = [
  // { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Published' },
  { value: 'temporary_closed', label: 'Temporary Closed' },
  { value: 'permanently_closed', label: 'Permanently Closed' },
  { value: 'reopen', label: 'Reopen' },
  // { value: 'extend_date', label: 'Extend Date' },
];

const formatDateForDisplay = (value) => {
  if (!value) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) return value;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";

  return `${match[3]}-${match[2]}-${match[1]}`;
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

const normalizeAdvertisementStatus = (value) => {
  if (value === "published") return "active";
  if (STATUS_OPTIONS.some((option) => option.value === value)) return value;
  return "pending";
};

const authHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: "application/json",
  "X-API-KEY": Config.apiKey,
});

const getDesignationName = (designation) => {
  if (!designation) return "";
  if (typeof designation === "object") {
    return designation.name || designation.designation_name || designation.title || "";
  }
  return String(designation);
};

const getJobKey = (job) => {
  const value =
    job?.hash_id ||
    job?.id ||
    job?.job_id ||
    job?.job_detail_id ||
    job?.requisition_id ||
    "";

  return value ? String(value) : "";
};

const getJobDepartmentName = (job) => {
  if (!job) return "";
  if (typeof job.department === "object" && job.department) {
    return job.department.name || job.department.department_name || "";
  }
  return job.department || job.department_label || job.department_name || "";
};

const getQualificationText = (job) => {
  const pivotText = job?.pivot?.qualification_text || job?.qualification_text;
  if (pivotText) return String(pivotText);

  const q = job?.qualification;
  if (!q) return "";

  return [
    q.academic_qualification,
    q.degree_equivalence ? `Degree Equivalence: ${q.degree_equivalence}` : "",
    q.any_other_qualification ? `Other Qualification: ${q.any_other_qualification}` : "",
    q.experience_length ? `Experience: ${q.experience_length} Years` : "",
    q.training_institute ? `Training Institute: ${q.training_institute}` : "",
  ].filter(Boolean).join(" | ");
};

const parseMaybeJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeDistrictPosts = (job) => {
  const overrideRows = parseMaybeJsonArray(
    job?.advertisement_district_posts || job?.pivot?.district_posts
  );
  const rows = overrideRows.length
    ? overrideRows
    : (Array.isArray(job?.multiple_posts) ? job.multiple_posts : (Array.isArray(job?.districtPosts) ? job.districtPosts : []));

  return rows.map((row, index) => ({
    id: row.id || `${getJobKey(job)}-district-${index}`,
    district: row.district || row.district_name || "",
    post: row.post || row.posts || row.num_posts || "",
    quota: row.quota || row.quota_percentage || "",
  }));
};

const getMeritType = (job) =>
  String(job?.eligibility?.merit_type || job?.merit_type || job?.pivot?.merit_type || "").toLowerCase();

const isQuotaBasedJob = (job) => {
  if (typeof job?.quotaBased === "boolean") return job.quotaBased;
  const meritType = getMeritType(job);
  if (meritType === "open_merit") return false;
  if (meritType === "quota_wise") return true;
  return normalizeDistrictPosts(job).length > 0;
};

const serializeDistrictRows = (rows = []) =>
  rows
    .filter((row) => row.district || row.post || row.quota)
    .map((row) => ({
      district: row.district || "",
      post: row.post || "",
      quota: row.quota || "",
    }));

const getDistrictPostTotal = (rows = []) =>
  rows.reduce((total, row) => total + (Number(row.post) || 0), 0);

const normalizeJobOption = (job) => {
  const id = getJobKey(job);
  if (!id) return null;
  const quotaBased = isQuotaBasedJob(job);

  return {
    id,
    hash_id: job.hash_id || id,
    designation: job.designation || job.post_title || job.title || `Requisition ${id}`,
    department: getJobDepartmentName(job),
    scale: job.scale?.name || job.scale?.scale_name || job.scale || "",
    num_posts: Number(job.num_posts || job.pivot?.num_posts || 1) || 1,
    qualificationText: getQualificationText(job),
    districtPosts: quotaBased ? normalizeDistrictPosts(job) : [],
    quotaBased,
  };
};

const stringifyDistrictPosts = (rows = []) =>
  rows
    .filter((row) => row.district || row.post || row.quota)
    .map((row) => `${row.district || "N/A"}:${row.post || "0"}:${row.quota || ""}`)
    .join(" | ");

const mergeJobOptions = (...lists) => {
  const map = new Map();

  lists.flat().forEach((job) => {
    const option = normalizeJobOption(job);
    if (!option) return;
    map.set(option.id, { ...map.get(option.id), ...option });
  });

  return Array.from(map.values());
};

const buildAdvertisementChangeLogs = (originalJobs, selectedIds, jobConfigs) => {
  const selectedSet = new Set(selectedIds.map(String));
  const logs = [];

  originalJobs.forEach((job) => {
    const jobId = String(job.id);
    const originalCount = Number(job.num_posts || 0);
    const currentCount = Number(jobConfigs[jobId]?.numPosts || 0);

    if (!selectedSet.has(jobId)) {
      logs.push({
        type: "deleted",
        field: "job_deleted",
        label: "Deleted Post",
        job_id: jobId,
        designation: job.designation,
        before: `${job.designation} (${originalCount} post${originalCount === 1 ? "" : "s"})`,
        after: "Deleted",
        message: `${job.designation} deleted from advertisement. Previous requisition posts: ${originalCount}.`,
      });
      return;
    }

    if (currentCount && originalCount !== currentCount) {
      logs.push({
        type: "count_changed",
        field: "num_posts",
        label: "No. of Posts",
        job_id: jobId,
        designation: job.designation,
        before: originalCount,
        after: currentCount,
        message: `${job.designation} posts changed from ${originalCount} to ${currentCount}.`,
      });
    }

    const originalQualification = String(job.qualificationText || "").trim();
    const currentQualification = String(jobConfigs[jobId]?.qualificationText || "").trim();
    if (originalQualification !== currentQualification) {
      logs.push({
        type: "qualification_changed",
        field: "qualification",
        label: "Qualification",
        job_id: jobId,
        designation: job.designation,
        before: originalQualification || "N/A",
        after: currentQualification || "Removed",
        message: `${job.designation} qualification changed.`,
      });
    }

    const originalDistricts = stringifyDistrictPosts(job.districtPosts);
    const currentDistricts = stringifyDistrictPosts(jobConfigs[jobId]?.districtPosts || []);
    if (job.quotaBased && originalDistricts !== currentDistricts) {
      logs.push({
        type: "districts_changed",
        field: "district_posts",
        label: "Districts",
        job_id: jobId,
        designation: job.designation,
        before: originalDistricts || "N/A",
        after: currentDistricts || "Removed",
        message: `${job.designation} districts changed.`,
      });
    }
  });

  return logs;
};

const getSecretaryName = async () => {
  const response = await fetch(`${Config.apiUrl}/settings/digital-signature?per_page=200`, {
    headers: authHeaders(),
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to load secretary");
  }

  const records = result.data?.data ?? result.data ?? [];
  const secretary = (Array.isArray(records) ? records : []).find((record) => {
    const designation = getDesignationName(
      record.designation ?? record.designation_name
    ).trim().toLowerCase();
    const recordStatus = String(record.status ?? "active").trim().toLowerCase();

    return designation === "secretary" && recordStatus === "active";
  });

  return (
    secretary?.name ||
    secretary?.employee_name ||
    secretary?.employee?.name ||
    secretary?.user?.name ||
    ""
  );
};

const AdvertisementEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  const [advDate, setAdvDate] = useState("");
  const [advDateInput, setAdvDateInput] = useState("");
  const [advNumber, setAdvNumber] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [closingDateInput, setClosingDateInput] = useState("");
  const [advertisementFee, setAdvertisementFee] = useState("");
  const [note, setNote] = useState("");
  const [importantNotes, setImportantNotes] = useState("");
  const [termsConditions, setTermsConditions] = useState([""]);
  const [jobConfigs, setJobConfigs] = useState({});
  const [examTests, setExamTests] = useState(FALLBACK_TESTS);
  const [testTypes, setTestTypes] = useState([]);
  const [status, setStatus] = useState("pending");
  const [originalStatus, setOriginalStatus] = useState("pending");
  const [extendDate, setExtendDate] = useState("");
  const [extendDateInput, setExtendDateInput] = useState("");
  const [extendDateEnabled, setExtendDateEnabled] = useState(false);
  const [existingSecretaryName, setExistingSecretaryName] = useState("");
  const [existingPublishDate, setExistingPublishDate] = useState("");
  const [availableJobs, setAvailableJobs] = useState([]);
  const [originalJobs, setOriginalJobs] = useState([]);
  const [publishModal, setPublishModal] = useState({
    open: false,
    payload: null,
    secretary_name: "",
    publish_date: "",
    publish_date_input: "",
    loading: false,
    secretaryLoading: false,
    secretaryError: "",
  });

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

  const [jobTitles, setJobTitles] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [originalSelectedIds, setOriginalSelectedIds] = useState([]);

  const selectedJobOptions = useMemo(
    () => availableJobs.filter((job) => selectedIds.includes(String(job.id))),
    [availableJobs, selectedIds]
  );

  const advertisementChangeLogs = useMemo(
    () => buildAdvertisementChangeLogs(originalJobs, selectedIds, jobConfigs),
    [originalJobs, selectedIds, jobConfigs]
  );

  const updatePostCount = (jobId, value) => {
    const numericValue = Math.max(1, Number(value) || 1);
    const districtTotal = getDistrictPostTotal(jobConfigs[jobId]?.districtPosts || []);

    if (districtTotal > numericValue) {
      setFieldErrors((prev) => ({
        ...prev,
        [`district_posts_${jobId}`]: [
          `District distribution total (${districtTotal}) cannot exceed total posts (${numericValue}).`,
        ],
      }));
      toast.error("District distribution cannot exceed total posts");
      return;
    }

    setJobConfigs((prev) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        numPosts: numericValue,
      },
    }));

    setAvailableJobs((prev) =>
      prev.map((job) =>
        String(job.id) === String(jobId)
          ? { ...job, num_posts: numericValue }
          : job
      )
    );

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`district_posts_${jobId}`];
      return next;
    });
  };

  const updateQualificationText = (jobId, value) => {
    setJobConfigs((prev) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        qualificationText: value,
      },
    }));
  };

  const updateDistrictPost = (jobId, index, field, value) => {
    const currentRows = [...(jobConfigs[jobId]?.districtPosts || [])];
    currentRows[index] = { ...currentRows[index], [field]: value };
    const totalPosts = Math.max(1, Number(jobConfigs[jobId]?.numPosts) || 1);
    const districtTotal = getDistrictPostTotal(currentRows);

    if (field === "post" && districtTotal > totalPosts) {
      setFieldErrors((errors) => ({
        ...errors,
        [`district_posts_${jobId}`]: [
          `District distribution total (${districtTotal}) cannot exceed total posts (${totalPosts}).`,
        ],
      }));
      toast.error("District distribution cannot exceed total posts");
      return;
    }

    setFieldErrors((errors) => {
      const next = { ...errors };
      delete next[`district_posts_${jobId}`];
      return next;
    });

    setJobConfigs((prev) => {
      const rows = [...(prev[jobId]?.districtPosts || [])];
      rows[index] = { ...rows[index], [field]: value };

      return {
        ...prev,
        [jobId]: {
          ...prev[jobId],
          districtPosts: rows,
        },
      };
    });
  };

  const addDistrictPost = (jobId) => {
    setJobConfigs((prev) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        districtPosts: [
          ...(prev[jobId]?.districtPosts || []),
          { id: `${jobId}-district-${Date.now()}`, district: "", post: "", quota: "" },
        ],
      },
    }));
  };

  const removeDistrictPost = (jobId, index) => {
    const nextRows = (jobConfigs[jobId]?.districtPosts || []).filter((_, rowIndex) => rowIndex !== index);
    const totalPosts = Math.max(1, Number(jobConfigs[jobId]?.numPosts) || 1);

    if (getDistrictPostTotal(nextRows) <= totalPosts) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`district_posts_${jobId}`];
        return next;
      });
    }

    setJobConfigs((prev) => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        districtPosts: (prev[jobId]?.districtPosts || []).filter((_, rowIndex) => rowIndex !== index),
      },
    }));
  };

  const removeSelectedPost = (jobId) => {
    if (selectedIds.length === 1) {
      toast.error("Advertisement must have at least one job");
      return;
    }

    setSelectedIds((prev) => prev.filter((id) => String(id) !== String(jobId)));
    setJobConfigs((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
    setJobTitles((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  };

  useEffect(() => {
    const fetchAdvertisement = async () => {
      try {
        const result = await AdvertisementApi.getById(id);
        if (result.success) {
          const data = result.data;
          setAdvDate(data.adv_date?.split("T")[0] || "");
          setAdvDateInput(formatDateForDisplay(data.adv_date?.split("T")[0] || ""));
          setAdvNumber(data.adv_number || "");
          setClosingDate(data.closing_date?.split("T")[0] || "");
          setClosingDateInput(formatDateForDisplay(data.closing_date?.split("T")[0] || ""));
          setAdvertisementFee(data.advertisement_fee || "");
          setNote(data.note || data.notes || data.ad_note || "");
          setImportantNotes(data.important_notes || "");
          const normalizedStatus = normalizeAdvertisementStatus(data.status);
          setStatus(normalizedStatus);
          setOriginalStatus(normalizedStatus);
          setExtendDate(data.extend_date?.split("T")[0] || "");
          setExtendDateInput(formatDateForDisplay(data.extend_date?.split("T")[0] || ""));
          setExtendDateEnabled(Boolean(data.extend_date));
          setExistingSecretaryName(data.secretary_name || "");
          setExistingPublishDate(
            (data.publish_date || data.published_date || "").split("T")[0]
          );

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
              const jobId = getJobKey(job);
              if (!jobId) return;
              const subjectRows = getJobSubjectRows(data, job);

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
                subjectIds: [],
                cceStage: savedCceStage,
                numPosts: Number(job.num_posts || job.pivot?.num_posts || 1) || 1,
                qualificationText: getQualificationText(job),
                districtPosts: isQuotaBasedJob(job) ? normalizeDistrictPosts(job) : [],
              };
            });
            setSelectedIds(jIds);
            setOriginalSelectedIds(jIds);
            setJobTitles(jTitles);
            setJobConfigs(jConfigs);
            const jobOptions = mergeJobOptions(data.job_details);
            setAvailableJobs(jobOptions);
            setOriginalJobs(jobOptions);
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

  const openPublishModal = async (payload) => {
    setPublishModal({
      open: true,
      payload,
      secretary_name: "",
      publish_date: new Date().toISOString().split("T")[0],
      publish_date_input: formatDateForDisplay(new Date().toISOString().split("T")[0]),
      loading: false,
      secretaryLoading: true,
      secretaryError: "",
    });

    try {
      const secretaryName = await getSecretaryName();

      if (!secretaryName) {
        throw new Error("Active secretary not found");
      }

      setPublishModal((prev) =>
        prev.open
          ? {
              ...prev,
              secretary_name: secretaryName,
              secretaryLoading: false,
              secretaryError: "",
            }
          : prev
      );
    } catch (error) {
      setPublishModal((prev) =>
        prev.open
          ? {
              ...prev,
              secretary_name: "",
              secretaryLoading: false,
              secretaryError: error.message || "Failed to load secretary",
            }
          : prev
      );
      toast.error(error.message || "Failed to load secretary");
    }
  };

  const closePublishModal = () => {
    setPublishModal((prev) => ({ ...prev, open: false, payload: null }));
  };

  const saveAdvertisement = async (payload, loadingMessage = "Saving updates...") => {
    setLoading(true);
    const loadingToast = toast.loading(loadingMessage);

    try {
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

  const handlePublish = async () => {
    if (publishModal.secretaryLoading) {
      toast.error("Please wait while secretary name is loading");
      return;
    }
    if (!publishModal.secretary_name.trim()) {
      toast.error("Secretary name is required");
      return;
    }
    if (!publishModal.publish_date) {
      toast.error("Please select a publish date");
      return;
    }

    setPublishModal((prev) => ({ ...prev, loading: true }));
    const publishDate = publishModal.publish_date;
    await saveAdvertisement(
      {
        ...publishModal.payload,
        status: "published",
        secretary_name: publishModal.secretary_name,
        publish_date: publishDate,
        published_date: publishDate,
      },
      "Publishing advertisement..."
    );
    setPublishModal((prev) => ({ ...prev, loading: false }));
  };

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

    if (!selectedIds.length) {
      setFieldErrors((prev) => ({
        ...prev,
        job_ids: ["Please keep at least one post in the advertisement"],
      }));
      toast.error("Please keep at least one post in the advertisement");
      return;
    }

    const filteredTerms = termsConditions.filter((t) => t.trim().length > 0);

    if (filteredTerms.length === 0) {
      toast.error("Please add at least one term & condition");
      return;
    }

    for (const jobId of selectedIds) {
      const jobMeta = availableJobs.find((job) => String(job.id) === String(jobId));
      if (!jobMeta?.quotaBased) continue;

      const totalPosts = Math.max(1, Number(jobConfigs[jobId]?.numPosts) || 1);
      const districtTotal = getDistrictPostTotal(jobConfigs[jobId]?.districtPosts || []);

      if (districtTotal > totalPosts) {
        setFieldErrors((prev) => ({
          ...prev,
          [`district_posts_${jobId}`]: [
            `District distribution total (${districtTotal}) cannot exceed total posts (${totalPosts}).`,
          ],
        }));
        toast.error("District distribution cannot exceed total posts");
        return;
      }
    }

    const feesPayload = {};
    const testTypesPayload = {};
    const subjectsPayload = {};
    const cceStagesPayload = {};
    const postCountsPayload = {};
    const qualificationsPayload = {};
    const districtPostsPayload = {};
    const removedJobIds = originalSelectedIds.filter(
      (jobId) => !selectedIds.includes(jobId)
    );
    const selectedJobDetailsPayload = selectedIds.map((jobId) => {
      const jobMeta = availableJobs.find((job) => String(job.id) === String(jobId));
      const quotaBased = !!jobMeta?.quotaBased;

      return {
        id: jobId,
        job_id: jobId,
        hash_id: jobId,
        num_posts: Math.max(1, Number(jobConfigs[jobId]?.numPosts) || 1),
        qualification_text: jobConfigs[jobId]?.qualificationText || "",
        quota_based: quotaBased,
        district_posts: quotaBased ? serializeDistrictRows(jobConfigs[jobId]?.districtPosts || []) : [],
      };
    });
    selectedIds.forEach((jobId) => {
      const config = jobConfigs[jobId] || {};
      const jobMeta = availableJobs.find((job) => String(job.id) === String(jobId));
      const quotaBased = !!jobMeta?.quotaBased;

      feesPayload[jobId] = config.fee || "";
      testTypesPayload[jobId] = config.testType || "";
      postCountsPayload[jobId] = Math.max(1, Number(config.numPosts) || 1);
      qualificationsPayload[jobId] = config.qualificationText || "";
      districtPostsPayload[jobId] = quotaBased ? serializeDistrictRows(config.districtPosts || []) : [];

      subjectsPayload[jobId] = [];

      cceStagesPayload[jobId] = "";
    });

    const shouldUseExtendDate = extendDateEnabled && Boolean(extendDate);

    if (status === "active" && shouldUseExtendDate && !extendDate) {
      setFieldErrors((prev) => ({
        ...prev,
        extend_date: ["Please select an extend date"],
      }));
      toast.error("Please select an extend date");
      return;
    }

    if (status === "active" && shouldUseExtendDate && new Date(extendDate) <= new Date(closingDate)) {
      setFieldErrors((prev) => ({
        ...prev,
        extend_date: ["Extend date must be after the current closing date"],
      }));
      toast.error("Extend date must be after the current closing date");
      return;
    }

    const payload = {
      closing_date: closingDate,
      advertisement_fee: advertisementFee || "",
      note: note || "",
      important_notes: importantNotes || "",
      terms_conditions: filteredTerms,
      status: status === "active" ? "published" : status,
      extend_date: shouldUseExtendDate ? extendDate : null,
      job_ids: selectedIds,
      job_ids_csv: selectedIds.join(","),
      remove_job_ids: removedJobIds,
      removed_job_ids: removedJobIds,
      deleted_job_ids: removedJobIds,
      delete_job_ids: removedJobIds,
      job_fees: JSON.stringify(feesPayload),
      job_test_types: JSON.stringify(testTypesPayload),
      job_subjects: JSON.stringify(subjectsPayload),
      job_cce_stages: JSON.stringify(cceStagesPayload),
      job_post_counts: postCountsPayload,
      job_num_posts: postCountsPayload,
      job_counts: postCountsPayload,
      post_counts: postCountsPayload,
      job_qualifications: qualificationsPayload,
      job_district_posts: districtPostsPayload,
      jobs: selectedJobDetailsPayload,
      job_details: selectedJobDetailsPayload,
      change_logs: advertisementChangeLogs,
      advertisement_change_logs: advertisementChangeLogs,
      change_logs_json: JSON.stringify(advertisementChangeLogs),
    };

    if (status === "active" && originalStatus === "active") {
      payload.secretary_name = existingSecretaryName;
      payload.publish_date = existingPublishDate;
      payload.published_date = existingPublishDate;
    }

    if (status === "active" && originalStatus !== "active") {
      openPublishModal(payload);
      return;
    }

    await saveAdvertisement(payload);
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
                    type="text"
                    value={advDateInput}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ readOnly: true, style: { height: 28 }, placeholder: "DD-MM-YYYY" }}
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
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setClosingDate(nextValue);
                      setClosingDateInput(formatDateForDisplay(nextValue));
                    }}
                    required
                    InputLabelProps={{ shrink: true }}
                    sx={fieldSx}
                    inputProps={{ style: { height: 28 } }}
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

              <div className="row">
                <div className="col-md-6 form-group">
                  <SearchableSelect
                    label="Status"
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatus(newStatus);
                      if (newStatus !== "active") {
                        setExtendDateEnabled(false);
                        setExtendDate("");
                      }
                    }}
                    error={
                      Array.isArray(fieldErrors?.status)
                        ? fieldErrors.status.join(", ")
                        : fieldErrors?.status
                    }
                    options={STATUS_OPTIONS}
                  />
                </div>
                {status === "active" && (
                  <div className="col-md-6 form-group">
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <Checkbox
                        checked={extendDateEnabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setExtendDateEnabled(checked);
                          if (!checked) {
                            setExtendDate("");
                          }
                        }}
                        color="success"
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-700">Extend Date</div>
                        <div className="text-xs text-slate-500">Keep the advertisement published and add a new closing date.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="row">
                {status === "active" && extendDateEnabled && (
                  <div className="col-md-6 form-group">
                    <TextField
                      fullWidth
                      label="Extend Date"
                      type="date"
                      value={extendDate}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        setExtendDate(nextValue);
                        setExtendDateInput(formatDateForDisplay(nextValue));
                      }}
                      InputLabelProps={{ shrink: true }}
                      sx={fieldSx}
                      inputProps={{ style: { height: 28 } }}
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
            </div>

            <div className="row" style={{ margin: 0 }}>
              <div className="col-md-12">
                <h6 className="section-title">Advertisement Posts</h6>
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
              <div className="mb-3 flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Jobs included in this advertisement
                  </p>
                  <p className="text-xs text-emerald-700">
                    Change total posts or remove a job from this advertisement.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                  {selectedIds.reduce(
                    (total, jobId) =>
                      total + (Number(jobConfigs[jobId]?.numPosts) || 0),
                    0
                  )}{" "}
                  total posts
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_120px_48px] gap-2 bg-slate-100 px-3 py-2.5 text-xs font-semibold uppercase text-slate-600">
                  <span>Post</span>
                  <span>No. of Posts</span>
                  <span className="text-center">Action</span>
                </div>
                {selectedJobOptions.length ? (
                  selectedJobOptions.map((job) => {
                    const jobId = String(job.id);
                    const districtTotal = getDistrictPostTotal(jobConfigs[jobId]?.districtPosts || []);
                    const totalPosts = Math.max(1, Number(jobConfigs[jobId]?.numPosts || job.num_posts) || 1);
                    return (
                      <div
                        key={jobId}
                        className="border-t border-slate-100 px-3 py-3"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_48px] gap-2 items-center">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {job.designation}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {[job.department, job.scale].filter(Boolean).join(" | ") || `Job ID: ${jobId}`}
                            </p>
                          </div>
                          <TextField
                            fullWidth
                            type="number"
                            value={jobConfigs[jobId]?.numPosts || job.num_posts || 1}
                            onChange={(e) => updatePostCount(jobId, e.target.value)}
                            inputProps={{ min: 1, step: 1 }}
                            size="small"
                          />
                          <button
                            type="button"
                            className="btn btn-prev flex justify-center items-center"
                            onClick={() => removeSelectedPost(jobId)}
                            title="Remove post"
                            disabled={selectedIds.length === 1}
                            style={{ height: 38, padding: "0 10px" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3">
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="Qualification"
                            value={jobConfigs[jobId]?.qualificationText || ""}
                            onChange={(e) => updateQualificationText(jobId, e.target.value)}
                            placeholder="Enter qualification text for this advertisement"
                            size="small"
                          />

                          {job.quotaBased && (
                            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                              <div className="divide-y divide-slate-200 bg-white">
                                {(jobConfigs[jobId]?.districtPosts || []).length ? (
                                  (jobConfigs[jobId]?.districtPosts || []).map((row, index) => (
                                    <div
                                      key={row.id || `${jobId}-${index}`}
                                      className="grid grid-cols-1 gap-2 px-3 py-2 md:grid-cols-[minmax(0,1fr)_150px_38px] md:items-center"
                                    >
                                      <TextField
                                        fullWidth
                                        size="small"
                                        label="District / Unit"
                                        value={row.district || ""}
                                        onChange={(e) => updateDistrictPost(jobId, index, "district", e.target.value)}
                                      />
                                      <TextField
                                        fullWidth
                                        size="small"
                                        label="Distribution"
                                        type="number"
                                        value={row.post || ""}
                                        onChange={(e) => updateDistrictPost(jobId, index, "post", e.target.value)}
                                        inputProps={{ min: 0, step: 1 }}
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-prev flex justify-center items-center"
                                        onClick={() => removeDistrictPost(jobId, index)}
                                        title="Remove district"
                                        style={{ height: 36, padding: "0 10px" }}
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-xs text-slate-500">
                                    No district rows.
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => addDistrictPost(jobId)}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 10px", whiteSpace: "nowrap" }}
                                >
                                  <Plus size={14} />
                                  <span>Add District</span>
                                </button>
                                <span className={`text-xs font-semibold ${
                                  districtTotal > totalPosts ? "text-red-600" : "text-slate-500"
                                }`}>
                                  Distribution: {districtTotal}/{totalPosts}
                                </span>
                              </div>
                              {!!fieldErrors?.[`district_posts_${jobId}`] && (
                                <div className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                                  {Array.isArray(fieldErrors[`district_posts_${jobId}`])
                                    ? fieldErrors[`district_posts_${jobId}`].join(", ")
                                    : fieldErrors[`district_posts_${jobId}`]}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No posts selected for this advertisement.
                  </div>
                )}
              </div>

              {!!fieldErrors?.job_ids && (
                <div style={{ marginTop: 8, color: "#dc3545", fontSize: 12 }}>
                  {Array.isArray(fieldErrors.job_ids)
                    ? fieldErrors.job_ids.join(", ")
                    : fieldErrors.job_ids}
                </div>
              )}

              <div className="mt-5 rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">Change Logs</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Before values are requisition posts; after values are advertisement edited posts.
                  </p>
                </div>
                {advertisementChangeLogs.length ? (
                  <div className="divide-y divide-slate-100">
                    {advertisementChangeLogs.map((log, index) => (
                      <div key={`${log.job_id}-${index}`} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_140px_140px] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {log.designation}
                          </p>
                          <p className="text-xs text-slate-500">{log.label}</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          <span className="block font-semibold">Before</span>
                          {log.before}
                        </div>
                        <div className={`rounded-lg px-3 py-2 text-xs ${
                          log.type === "deleted"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}>
                          <span className="block font-semibold">After</span>
                          {log.after}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-slate-500">
                    No post count or deleted post changes yet.
                  </div>
                )}
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
                          <SearchableSelect
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
                                  subjectIds: [],
                                  cceStage: "",
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
                            hint="Choose the test type — fee auto-fills"
                            options={[
                              { value: '', label: '— Select Test Type —' },
                              ...testTypeOptions.map((t) => ({ value: t.hash_id, label: t.name })),
                            ]}
                          />
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

      {publishModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Publish Advertisement</h2>
                  <p className="text-xs text-emerald-200">{advNumber || ""}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePublishModal}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Secretary Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={publishModal.secretary_name}
                  readOnly
                  placeholder={publishModal.secretaryLoading ? "Loading secretary name..." : "Secretary name"}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm cursor-not-allowed"
                />
                {publishModal.secretaryError && (
                  <p className="mt-1.5 text-xs text-red-600">{publishModal.secretaryError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Publish Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={publishModal.publish_date_input}
                  onChange={(e) => {
                    const rawValue = e.target.value;
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

                    setPublishModal((prev) => ({
                      ...prev,
                      publish_date: limited.length === 8 ? `${limited.slice(4, 8)}-${limited.slice(2, 4)}-${limited.slice(0, 2)}` : "",
                      publish_date_input: nextDisplay,
                    }));
                  }}
                  placeholder="DD-MM-YYYY"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={closePublishModal}
                disabled={publishModal.loading}
                className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishModal.loading || publishModal.secretaryLoading || !publishModal.secretary_name}
                className="px-5 py-2.5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 hover:from-emerald-900 hover:to-emerald-950 text-white rounded-lg font-medium text-sm shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {publishModal.loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdvertisementEditForm;
