import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from 'pages/Dashboard';
import Login from 'pages/auth/Login/Login';
import VerifyOtp from "pages/auth/OTP/VerifyOtp";
import ProtectedRoute from 'middlewares/ProtectedRoute';
import PublicRoute from 'middlewares/PublicRoute';
import Register from 'pages/auth/Register/Register';
import DashboardLayout from 'Components/layouts/DashboardLayout';
import Profile from 'pages/profile/Profile';
import RequisitionList from 'pages/RequisitionList';
import RequisitionForm from 'pages/requisition/RequisitionForm';
import RequisitionEdit from 'pages/requisition/RequisitionEdit';
import RequisitionPreview from 'pages/requisition/RequisitionPreview';
import ApprovedRequisitions from 'pages/ApprovedRequisitions';
import AddNotes from 'pages/AddNotes';
import AdvertisementRecords from 'pages/advertisement/AdvertisementRecords';
import AdvertisementCreateForm from 'pages/advertisement/AdvertisementCreateForm';
import AnnexAList from 'pages/AnnexAList';
import AnnexADetail from 'pages/AnnexADetail';
import JobCreation from 'pages/JobCreation';
import JobCreationForm from 'pages/job-creation/JobCreationForm';
import DispatchReceived from 'pages/dispatch/DispatchRecieved';
import DispatchSent from 'pages/dispatch/DispatchSent';
import PscTable from 'pages/PscTable';
import DispatchAddNew from 'pages/dispatch/DispatchAddNew';
import DispatchSentAddNew from 'pages/dispatch/DispatchSentAddNew';
import RequisitionDetail from 'pages/RequisitionDetail';
import Settings from 'pages/settings/Settings';
import OrganizationInformation from 'pages/settings/OrganizationInformation';
import OrganizationalHierarchy from 'pages/settings/OrganizationalHierarchy';
import DistrictsManagement from 'pages/settings/Districts/DistrictsManagement';
import TehsilsManagement from 'pages/settings/TehsilsManagement';
import DesignationsManagement from 'pages/settings/Designation/DesignationsManagement';
import GradesManagement from 'pages/settings/Grades/GradesManagement';
import CompaniesManagement from 'pages/settings/Company/CompaniesManagement';
import ContractorsManagement from 'pages/settings/ContractorsManagement';



function App() {
  return (
    <Router>
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
          <Route path="advertisements/create" element={<AdvertisementCreateForm />} />
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
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
