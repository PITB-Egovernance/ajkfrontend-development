import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Checkbox, TextField, MenuItem } from "@mui/material";
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

const CCE_STAGES = [
  { value: 'screening', label: 'Screening' },
  { value: 'written_test', label: 'Written Test' },
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
  return job.department || job.department_name || "";
};

const normalizeJobOption = (job) => {
  const id = getJobKey(job);
  if (!id) return null;

  return {
    id,
    hash_id: job.hash_id || id,
    designation: job.designation || job.post_title || job.title || `Requisition ${id}`,
    department: getJobDepartmentName(job),
    scale: job.scale?.name || job.scale?.scale_name || job.scale || "",
    num_posts: Number(job.num_posts || job.pivot?.num_posts || 1) || 1,
  };
};

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
  const [subjects, setSubjects] = useState([]);
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
            .filter(
              (subject) =>
                String(subject.status || "active").toLowerCase() === "active"
            )
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

  const toggleSubject = (jobId, subject) => {
    setJobConfigs((prev) => {
      const currentIds = normalizeSubjectIds(prev[jobId]?.subjectIds);
      const aliases = [subject.hash_id, subject.id].filter(Boolean).map(String);
      const isSelected = aliases.some((id) => currentIds.includes(id));
      const withoutSubject = currentIds.filter((id) => !aliases.includes(id));

      return {
        ...prev,
        [jobId]: {
          ...prev[jobId],
          subjectIds: isSelected
            ? withoutSubject
            : [...withoutSubject, subject.hash_id],
        },
      };
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[`subject_${jobId}`];
      return next;
    });
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
                numPosts: Number(job.num_posts || job.pivot?.num_posts || 1) || 1,
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

    const feesPayload = {};
    const testTypesPayload = {};
    const subjectsPayload = {};
    const cceStagesPayload = {};
    const postCountsPayload = {};
    const removedJobIds = originalSelectedIds.filter(
      (jobId) => !selectedIds.includes(jobId)
    );
    const selectedJobDetailsPayload = selectedIds.map((jobId) => ({
      id: jobId,
      job_id: jobId,
      hash_id: jobId,
      num_posts: Math.max(1, Number(jobConfigs[jobId]?.numPosts) || 1),
    }));
    const validSubjectHashIds = new Set(
      subjects.map((subject) => String(subject.hash_id))
    );

    selectedIds.forEach((jobId) => {
      const config = jobConfigs[jobId] || {};

      feesPayload[jobId] = config.fee || "";
      testTypesPayload[jobId] = config.testType || "";
      postCountsPayload[jobId] = Math.max(1, Number(config.numPosts) || 1);

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
                  <TextField
                    select
                    fullWidth
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

            <div className="mb-8 p-6 bg-slate-50/50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 w-full">
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Jobs included in this advertisement
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Change total posts or remove a job from this advertisement.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
                  {selectedIds.reduce(
                    (total, jobId) =>
                      total + (Number(jobConfigs[jobId]?.numPosts) || 0),
                    0
                  )}{" "}
                  total posts
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_140px_56px] gap-3 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-600">
                  <span>Post</span>
                  <span>No. of Posts</span>
                  <span className="text-center">Action</span>
                </div>
                {selectedJobOptions.length ? (
                  selectedJobOptions.map((job) => {
                    const jobId = String(job.id);
                    return (
                      <div
                        key={jobId}
                        className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_56px] gap-3 items-center border-t border-slate-100 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {job.designation}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
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
                          style={{ height: 40, padding: "0 12px" }}
                        >
                          <Trash2 size={16} />
                        </button>
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
                                    {subjects.filter((subject) =>
                                      subjectMatchesSelectedIds(subject, jobConfigs[jobId]?.subjectIds || [])
                                    ).length} selected
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 max-h-80 overflow-y-auto">
                                  {subjects.map((subject) => {
                                    const checked = subjectMatchesSelectedIds(
                                      subject,
                                      jobConfigs[jobId]?.subjectIds || []
                                    );
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
                                          onChange={() => toggleSubject(jobId, subject)}
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
