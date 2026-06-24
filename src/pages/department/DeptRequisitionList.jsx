import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TooltipDataGrid from "components/ui/TooltipDataGrid";
import { Menu, MenuItem, IconButton } from "@mui/material";
import {
  FileText,
  PlusCircle,
  Search,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Send,
} from "lucide-react";
import { Card, CardContent } from "components/ui/Card";
import Button from "components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "components/ui/Dialog";
import toast from "react-hot-toast";
import confirmDelete from "components/ui/ConfirmDelete";
import DeptRequisitionApi from "api/deptRequisitionApi";
import { GRID_SX } from "utils/gridStyles";
import { useAuth } from "context/AuthContext";

const DeptRequisitionList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await DeptRequisitionApi.getAll(
        paginationModel.page + 1,
        paginationModel.pageSize,
      );
      const list = result?.data?.data ?? result?.data ?? [];

      const userDeptName =
        user?.department?.department_name ||
        user?.department?.name ||
        user?.department_name ||
        "";
      const userDeptId =
        user?.department_id ||
        user?.department?.hash_id ||
        user?.department?.id ||
        "";

      const filtered = (Array.isArray(list) ? list : []).filter((r) => {
        if (!userDeptName && !userDeptId) return true;

        let reqDeptName = "";
        let reqDeptId = "";
        if (r.department && typeof r.department === "object") {
          reqDeptName = r.department.department_name || r.department.name || "";
          reqDeptId = r.department.hash_id || r.department.id || "";
        } else if (typeof r.department === "string") {
          reqDeptName = r.department;
        }

        const reqDeptIdDirect = r.department_id || "";

        const matchId =
          userDeptId &&
          (reqDeptId === userDeptId || reqDeptIdDirect === userDeptId);
        const matchName =
          userDeptName &&
          reqDeptName.toLowerCase() === userDeptName.toLowerCase();

        return matchId || matchName;
      });

      const formatted = filtered.map((r, i) => {
        const deptName =
          r.department && typeof r.department === "object"
            ? r.department.department_name || r.department.name || "-"
            : r.department || "-";

        return {
          id: r.hash_id || r.id || `req-${i}`,
          hash_id: r.hash_id || r.id,
          job_title: r.job_title || r.designation || "Untitled",
          ref_id: r.hash_id || r.id || "-",
          department: deptName,
          designation: r.designation || "-",
          status: r.status || r.current_status || "draft",
          requisition_status: r.requisition_status || "",
          created_at: r.created_at
            ? new Date(r.created_at).toLocaleDateString()
            : "-",
        };
      });

      setRows(formatted);
      setTotal(formatted.length);
    } catch (error) {
      toast.error(error.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [paginationModel.page, paginationModel.pageSize]);

  const resolveDeleteEligibility = (row) => {
    if (!row) return { canDelete: false, reason: "" };

    const reqStatus = (row.requisition_status || "").trim().toLowerCase();
    const jobStatus = (row.status || "").trim().toLowerCase();

    const isSubmittedToAdmin =
      reqStatus.includes("received") ||
      reqStatus === "submitted" ||
      jobStatus === "submitted";

    if (isSubmittedToAdmin) {
      return {
        canDelete: false,
        reason:
          "Cannot delete a requisition that has already been submitted to admin.",
      };
    }

    const isRejected =
      reqStatus === "rejected" ||
      jobStatus === "rejected" ||
      reqStatus.includes("rejected") ||
      jobStatus.includes("rejected");

    const isPending =
      reqStatus === "pending" ||
      reqStatus === "draft" ||
      reqStatus === "" ||
      jobStatus === "draft" ||
      jobStatus === "pending";

    if (isPending || isRejected) {
      return { canDelete: true, reason: "" };
    }

    return {
      canDelete: false,
      reason: "Only pending or rejected requisitions can be deleted.",
    };
  };

  const handleDelete = async () => {
    if (!selectedRow) return;

    const { canDelete, reason } = resolveDeleteEligibility(selectedRow);

    if (!canDelete) {
      toast.error(reason);
      return;
    }

    if (
      !(await confirmDelete({
        title: "Delete Requisition",
        message: "Are you sure you want to delete this requisition?",
      }))
    )
      return;

    try {
      await DeptRequisitionApi.delete(selectedRow.hash_id);
      toast.success("Requisition deleted");
      fetchData();
    } catch (error) {
      const errorMsg =
        error.errors && typeof error.errors === "object"
          ? Object.values(error.errors).flat().join(", ")
          : error.message || "Failed to delete";
      toast.error(errorMsg);
    }
  };

  const openSubmitModal = () => {
    if (!selectedRow) return;
    setSubmitModalOpen(true);
  };

  const confirmSubmitToAdmin = async () => {
    if (!selectedRow) return;
    setSubmitting(true);
    try {
      await DeptRequisitionApi.submitToAdmin(selectedRow.hash_id);
      toast.success("Requisition submitted to admin successfully");
      setSubmitModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.ref_id?.toLowerCase().includes(term) ||
      r.department?.toLowerCase().includes(term) ||
      r.designation?.toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "approved") return "bg-emerald-100 text-emerald-700";
    if (s === "draft") return "bg-slate-100 text-slate-600";
    if (["submitted", "pending"].includes(s))
      return "bg-amber-100 text-amber-700";
    if (s.includes("received")) return "bg-emerald-100 text-emerald-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
  };

  const formatRequisitionStatus = (value) => {
    const v = (value || "").toLowerCase();
    if (v.includes("received")) return "Submit to Admin";
    if (!value) return "-";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const columns = [
    { field: "ref_id", headerName: "Ref ID", width: 160 },
    { field: "department", headerName: "Department", flex: 0.8, minWidth: 150 },
    { field: "designation", headerName: "Designation", width: 160 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(params.value)}`}
        >
          {params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
        </span>
      ),
    },
    {
      field: "requisition_status",
      headerName: "Requisition Status",
      width: 170,
      renderCell: (params) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(params.value)}`}
        >
          {formatRequisitionStatus(params.value)}
        </span>
      ),
    },
    { field: "created_at", headerName: "Created", width: 120 },
    {
      field: "actions",
      headerName: "Actions",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setAnchorEl(e.currentTarget);
            setSelectedRow(params.row);
          }}
        >
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div
        className="mx-auto space-y-6"
        style={{ width: "-webkit-fill-available" }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-xl flex items-center justify-center shadow">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                My Requisitions
              </h1>
              <p className="text-sm text-slate-500">
                Manage your department requisitions
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/department/requisitions/create")}>
            <PlusCircle size={16} className="mr-2" /> New Requisition
          </Button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by title, case number, department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <TooltipDataGrid
            rows={filteredRows}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            paginationMode="server"
            rowCount={total}
            loading={loading}
            autoHeight
            disableRowSelectionOnClick
            sx={GRID_SX}
          />
        </div>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            elevation: 0,
            sx: {
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.1))",
              mt: 1.5,
              minWidth: 200,
              "& .MuiMenuItem-root": {
                fontSize: "14px",
                display: "flex",
                gap: "8px",
                padding: "10px 16px",
              },
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          {(() => {
            const reqStatus = (selectedRow?.requisition_status || "")
              .trim()
              .toLowerCase();
            const jobStatus = (selectedRow?.status || "").trim().toLowerCase();

            const isSubmittedToAdmin =
              reqStatus.includes("received") ||
              reqStatus === "submitted" ||
              jobStatus === "submitted";

            const isRejected =
              reqStatus === "rejected" ||
              jobStatus === "rejected" ||
              reqStatus.includes("rejected") ||
              jobStatus.includes("rejected");

            const isPending =
              reqStatus === "pending" ||
              reqStatus === "draft" ||
              reqStatus === "" ||
              jobStatus === "draft" ||
              jobStatus === "pending";

            const canDelete = !isSubmittedToAdmin && (isPending || isRejected);
            const canEditOrSubmit =
              isPending && !isRejected && !isSubmittedToAdmin;

            return (
              <>
                <MenuItem
                  onClick={() => {
                    navigate(
                      `/department/requisitions/${selectedRow?.hash_id}`,
                    );
                    setAnchorEl(null);
                  }}
                >
                  <Eye size={14} /> View
                </MenuItem>
                {canEditOrSubmit && (
                  <MenuItem
                    onClick={() => {
                      navigate(
                        `/department/requisitions/edit/${selectedRow?.hash_id}`,
                      );
                      setAnchorEl(null);
                    }}
                  >
                    <Pencil size={14} /> Edit
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem
                    onClick={() => {
                      handleDelete();
                      setAnchorEl(null);
                    }}
                    sx={{ "&.MuiMenuItem-root": { color: "#dc2626" } }}
                  >
                    <Trash2 size={14} /> Delete
                  </MenuItem>
                )}
                {canEditOrSubmit && (
                  <MenuItem
                    onClick={() => {
                      openSubmitModal();
                      setAnchorEl(null);
                    }}
                    sx={{ "&.MuiMenuItem-root": { color: "#059669" } }}
                  >
                    <Send size={14} /> Submit to Admin
                  </MenuItem>
                )}
              </>
            );
          })()}
        </Menu>

        {/* Submit to Admin Modal */}
        <Dialog
          open={submitModalOpen}
          onOpenChange={(open) => {
            if (!submitting) setSubmitModalOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Send size={18} className="text-emerald-700" />
                </div>
                <DialogTitle>Submit to Admin</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                You are about to submit this requisition to the PSC admin. Once
                submitted it will be marked as{" "}
                <span className="font-semibold text-emerald-700">
                  Received from Department
                </span>{" "}
                and you will no longer be able to edit or delete it.
              </DialogDescription>
            </DialogHeader>

            {selectedRow && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Ref ID</span>
                  <span className="font-medium text-slate-800">
                    {selectedRow.ref_id}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Designation</span>
                  <span className="font-medium text-slate-800">
                    {selectedRow.designation}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-500">Department</span>
                  <span className="font-medium text-slate-800">
                    {selectedRow.department}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSubmitToAdmin}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                <Send size={14} />{" "}
                {submitting ? "Submitting..." : "Submit to Admin"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DeptRequisitionList;