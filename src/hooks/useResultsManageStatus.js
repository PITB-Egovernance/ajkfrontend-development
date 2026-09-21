import { useEffect, useState } from 'react';
import ResultsApi from 'api/resultsApi';

/**
 * Whether results can be managed yet for the given post(s). Managing is blocked while a post's
 * Roll Number Slips are unpublished AND its examination date has not passed; the backend
 * enforces the same rule on the downloads, this just lets the screen warn up front.
 *
 * Uploading / entering results is a stricter rule: it is blocked for as long as the examination date
 * (from the Roll Number Slips) is still ahead, published slips or not.
 *
 * A failed check never blocks (the backend still decides).
 * Returns { blocked, message, uploadBlocked, uploadMessage, examDate, checking }.
 */
const EMPTY = { blocked: false, message: null, uploadBlocked: false, uploadMessage: null, examDate: null, checking: false };

const useResultsManageStatus = (jobPostIds) => {
  const key = [...new Set((jobPostIds || []).filter(Boolean).map(String))].sort().join(',');
  const [state, setState] = useState(EMPTY);

  useEffect(() => {
    if (!key) {
      setState(EMPTY);
      return undefined;
    }

    let alive = true;
    setState((prev) => ({ ...prev, checking: true }));

    Promise.all(key.split(',').map((id) => ResultsApi.managementStatus(id).catch(() => null))).then((statuses) => {
      if (!alive) return;
      const blockedStatus = statuses.find((s) => s && s.can_manage === false);
      const uploadStatus = statuses.find((s) => s && s.can_upload === false);
      setState({
        blocked: Boolean(blockedStatus),
        message: blockedStatus?.message || null,
        uploadBlocked: Boolean(uploadStatus),
        uploadMessage: uploadStatus?.upload_message || null,
        examDate: uploadStatus?.exam_date || null,
        checking: false,
      });
    });

    return () => { alive = false; };
  }, [key]);

  return state;
};

export default useResultsManageStatus;
