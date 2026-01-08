import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from 'Views/Dashboard';
import Login from "Views/Auth/Login/Login";
import ProtectedRoute from "Routes/ProtectedRoute";
import PublicRoute from "Routes/PublicRoute";
import Register from "Views/Auth/Register/Register";
import DashboardLayout from 'Views/Layouts/DashboardLayout';
import RequisitionList from 'Views/Pages/RequisitionList';
import RequisitionForm from 'Views/RequisitionForm/RequisitionForm';
import RequisitionEdit from 'Views/RequisitionForm/RequisitionEdit';
import RequisitionPreview from 'Views/RequisitionForm/RequisitionPreview';
import ApprovedRequisitions from 'Views/Pages/ApprovedRequisitions';
import AddNotes from 'Views/Pages/AddNotes';
import AdvertisementRecords from 'Views/Pages/AdvertisementRecords';
import AnnexAList from 'Views/Pages/AnnexAList';
import AnnexADetail from 'Views/Pages/AnnexADetail';
import JobCreation from 'Views/Pages/JobCreation';
import JobCreationForm from 'Views/JobCreation/JobCreationForm';
import DispatchReceived from 'Views/Dispatch/DispatchRecieved';
import DispatchSent from 'Views/Dispatch/DispatchSent';
import PscTable from 'Views/Pages/PscTable';
import DispatchAddNew from "Views/Dispatch/DispatchAddNew";
import DispatchSentAddNew from "Views/Dispatch/DispatchSentAddNew";
import RequisitionDetail from "Views/Pages/RequisitionDetail";
import Settings from 'Views/Settings/Settings';
import OrganizationInformation from 'Views/Settings/OrganizationInformation';
import OrganizationalHierarchy from 'Views/Settings/OrganizationalHierarchy';
import DistrictsManagement from 'Views/Settings/DistrictsManagement';
import TehsilsManagement from 'Views/Settings/TehsilsManagement';
import DesignationsManagement from 'Views/Settings/DesignationsManagement';
import GradesManagement from 'Views/Settings/GradesManagement';
import CompaniesManagement from 'Views/Settings/CompaniesManagement';
import ContractorsManagement from 'Views/Settings/ContractorsManagement';


function App() {
  return (
    <Router>
      <Routes>
        {/* Public pages - redirect to dashboard if already logged in */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

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
          <Route path="job-creation-form" element={<JobCreationForm />} />
          <Route path="requisitions" element={<RequisitionList />} />
          <Route path="requisitions/create" element={<RequisitionForm />} />
          <Route path="requisitions/edit/:id" element={<RequisitionEdit />} />
          <Route path="requisitions/preview" element={<RequisitionPreview />} />
          <Route path="requisitions/:id" element={<RequisitionDetail />} />
          <Route path="approved-requisitions" element={<ApprovedRequisitions />} />
          <Route path="add-notes" element={<AddNotes />} />
          <Route path="advertisement-records" element={<AdvertisementRecords />} />
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
