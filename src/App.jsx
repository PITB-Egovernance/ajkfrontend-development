import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ProtectedRoute from 'middlewares/ProtectedRoute';
import PublicRoute from 'middlewares/PublicRoute';
import DashboardLayout from 'Components/layouts/DashboardLayout';

// Lazy load all page components
const Dashboard = lazy(() => import('pages/Dashboard'));
const Login = lazy(() => import('pages/auth/Login/Login'));
const VerifyOtp = lazy(() => import("pages/auth/OTP/VerifyOtp"));
const Register = lazy(() => import('pages/auth/Register/Register'));
const Profile = lazy(() => import('pages/profile/Profile'));
const RequisitionList = lazy(() => import('pages/RequisitionList'));
const RequisitionForm = lazy(() => import('pages/requisition/RequisitionForm'));
const RequisitionEdit = lazy(() => import('pages/requisition/RequisitionEdit'));
const RequisitionPreview = lazy(() => import('pages/requisition/RequisitionPreview'));
const ApprovedRequisitions = lazy(() => import('pages/ApprovedRequisitions'));
const AddNotes = lazy(() => import('pages/AddNotes'));
const AdvertisementRecords = lazy(() => import('pages/advertisement/AdvertisementRecords'));
const AdvertisementCreateForm = lazy(() => import('pages/advertisement/AdvertisementCreateForm'));
const AdvertisementEditForm = lazy(() => import('pages/advertisement/AdvertisementEditForm'));
const AnnexAList = lazy(() => import('pages/AnnexAList'));
const AnnexADetail = lazy(() => import('pages/AnnexADetail'));
const JobCreation = lazy(() => import('pages/JobCreation'));
const JobCreationForm = lazy(() => import('pages/job-creation/JobCreationForm'));
const DispatchReceived = lazy(() => import('pages/dispatch/DispatchRecieved'));
const DispatchSent = lazy(() => import('pages/dispatch/DispatchSent'));
const PscTable = lazy(() => import('pages/PscTable'));
const DispatchAddNew = lazy(() => import('pages/dispatch/DispatchAddNew'));
const DispatchSentAddNew = lazy(() => import('pages/dispatch/DispatchSentAddNew'));
const RequisitionDetail = lazy(() => import('pages/RequisitionDetail'));
const Settings = lazy(() => import('pages/settings/Settings'));
const OrganizationInformation = lazy(() => import('pages/settings/OrganizationInformation'));
const OrganizationalHierarchy = lazy(() => import('pages/settings/OrganizationalHierarchy'));
const DistrictsManagement = lazy(() => import('pages/settings/Districts/DistrictsManagement'));
const TehsilsManagement = lazy(() => import('pages/settings/TehsilsManagement'));
const DesignationsManagement = lazy(() => import('pages/settings/Designation/DesignationsManagement'));
const GradesManagement = lazy(() => import('pages/settings/Grades/GradesManagement'));
const CompaniesManagement = lazy(() => import('pages/settings/Company/CompaniesManagement'));
const ContractorsManagement = lazy(() => import('pages/settings/ContractorsManagement'));
const ExamCentersManagement = lazy(() => import('pages/settings/ExamCenters/ExamCentersManagement'));
const ExamCitiesManagement = lazy(() => import('pages/settings/ExamCities/ExamCitiesManagement'));
const DirectorApprovals = lazy(() => import('pages/approvals/DirectorApprovals'));
const SecretaryApprovals = lazy(() => import('pages/approvals/SecretaryApprovals'));
const ChairmanApprovals = lazy(() => import('pages/approvals/ChairmanApprovals'));
const AdminWorkflowTracking = lazy(() => import('pages/approvals/AdminWorkflowTracking'));

// Loading fallbacks
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public pages - redirect to dashboard if already logged in */}
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/verify-otp" element={<PublicRoute><VerifyOtp /></PublicRoute>} />

          {/* Protected dashboard route with nested pages */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="job-creation-form" element={<JobCreationForm />} />
            <Route path="requisitions" element={<RequisitionList />} />
            <Route path="requisitions/create" element={<RequisitionForm />} />
            <Route path="requisitions/edit/:id" element={<RequisitionEdit />} />
            <Route path="requisitions/preview" element={<RequisitionPreview />} />
            <Route path="requisitions/:id" element={<RequisitionDetail />} />
            <Route path="approved-requisitions" element={<ApprovedRequisitions />} />
            <Route path="add-notes" element={<AddNotes />} />
            <Route path="advertisement-records" element={<AdvertisementRecords />} />
            <Route
              path="approvals/director"
              element={
                <ProtectedRoute allowedRoles={['director']}>
                  <DirectorApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="approvals/secretary"
              element={
                <ProtectedRoute allowedRoles={['secretary']}>
                  <SecretaryApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="approvals/chairman"
              element={
                <ProtectedRoute allowedRoles={['chairman']}>
                  <ChairmanApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="workflow-tracking"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminWorkflowTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="advertisements/create"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdvertisementCreateForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="advertisements/edit/:id"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdvertisementEditForm />
                </ProtectedRoute>
              }
            />
            <Route path="annex-a" element={<AnnexAList />} />
            <Route path="annex-a/:id" element={<AnnexADetail />} />
            <Route path="job-creation" element={<JobCreation />} />
            <Route path="dispatch/received" element={<DispatchReceived />} />
            <Route path="dispatch/recieved-form" element={<DispatchAddNew />} />
            <Route path="dispatch/sent" element={<DispatchSent />} />
            <Route path="dispatch/sent/add" element={<DispatchSentAddNew />} />
            <Route path="psc-table" element={<PscTable />} />

            {/* Settings Routes */}
            <Route path="settings" element={<Settings />} />
            <Route path="settings/organization" element={<OrganizationInformation />} />
            <Route path="settings/hierarchy" element={<OrganizationalHierarchy />} />
            <Route path="settings/districts" element={<DistrictsManagement />} />
            <Route path="settings/tehsils" element={<TehsilsManagement />} />
            <Route path="settings/designations" element={<DesignationsManagement />} />
            <Route path="settings/grades" element={<GradesManagement />} />
            <Route path="settings/companies" element={<CompaniesManagement />} />
            <Route path="settings/contractors" element={<ContractorsManagement />} />
            <Route path="settings/exam-cities" element={<ExamCitiesManagement />} />
            <Route path="settings/exam-centers" element={<ExamCentersManagement />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
