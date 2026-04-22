import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { InlineLoader } from 'Components/ui/Loader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from 'Components/ui/Dialog';
import { CheckCircle2 } from 'lucide-react';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';
import RequisitionApi from 'api/requisitionApi';
import toast from 'react-hot-toast';

const RequisitionPreview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tempId = searchParams.get('temp_id');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [districtOptions, setDistrictOptions] = useState([]);
  const [previewData, setPreviewData] = useState({
    step1: {},
    step2: {},
    step3: {},
    serviceRule:{},
    syllabus:{},
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
      fetchDistricts();
    if (!tempId) {
      toast.error('No temporary data found');
      navigate('/dashboard/requisitions');
      return;
    }
    loadPreviewData();
  }, [tempId]);

  const repairBackendData = async (sanitizedStep1Data) => {
    console.log('🛠️ Repairing backend data (converting arrays to strings)...');
    try {
      const formData = new FormData();
      formData.append('step', '1');
      formData.append('temp_id', tempId);

      // Append sanitized data
      Object.keys(sanitizedStep1Data).forEach(key => {
        const value = sanitizedStep1Data[key];
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });

      await RequisitionApi.create(formData);
      console.log('✅ Backend data repaired successfully');
    } catch (err) {
      console.error('❌ Failed to repair backend data:', err);
      toast.error('Failed to repair data format. Please go back and edit Step 1.');
    }
  };


  const fetchDistricts = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/districts`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          Accept: 'application/json',
          'X-API-KEY': API_KEY,
        },
      });

      const result = await response.json();

      if (result.success) {
        // Handle both paginated and non-paginated responses
        const districtsArray = 
          Array.isArray(result.data) 
            ? result.data 
            : (result.data?.data || []);
            
        setDistrictOptions(
          districtsArray.map((d) => ({
            id: String(d.hash_id || d.id),
            name: d.name
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load districts for preview');
    }
  };


  const getDistrictName = (id) => {
    const found = districtOptions.find(d => String(d.id) === String(id));
    return found ? found.name : id;
  };

  const loadPreviewData = async () => {
    setLoading(true);
    console.log('📊 Loading preview data...');
    console.log('📋 Temp ID:', tempId);

    try {
      const result = await RequisitionApi.getPreview(tempId);
      console.log('📥 Preview Response Data:', result);

      // Handle different response formats
      if (result.status === 200 || result.success) {
        const data = result.data || result;
        console.log('✅ Preview data loaded successfully');
        console.log('Step 1 data:', data.step1_basic_info);
        console.log('Step 2 data:', data.step2_qualifications);
        console.log('Step 3 data:', data.step3_eligibility);
        console.log('Step Files:', data.step1_files);


        // Defensive: Ensure service_rules and syllabus are strings, not arrays
        const step1Data = data.step1_basic_info || {};
        const servicerule = data.step1_files.service_rules.url || {};
        const slb = data.step1_files.syllabus.url || {};
        let needsRepair = false;

        // if (data.step1_files.service_rules && Array.isArray(data.step1_files.service_rules)) {
        //   console.warn('⚠️ service_rules is an array, converting to string:', data.step1_files.service_rules);
        //   data.step1_files.service_rules = data.step1_files.service_rules.length > 0 ? data.step1_files.service_rules[0] : null;
        //   needsRepair = true;
        // }
        // if (data.step1_files.syllabus && Array.isArray(data.step1_files.syllabus)) {
        //   console.warn('⚠️ syllabus is an array, converting to string:', data.step1_files.syllabus);
        //   data.step1_files.syllabus = data.step1_files.syllabus.length > 0 ? data.step1_files.syllabus[0] : null;
        //   needsRepair = true;
        // }

        if (needsRepair) {
          repairBackendData(step1Data);
        }

        setPreviewData({
          step1: step1Data,
          step2: data.step2_qualifications || {},
          step3: {
            ...(data.step3_eligibility || {}),
            district: data.step3_district_quota?.districts || [],
            quota: data.step3_district_quota?.quotas || [],
            post: data.step3_district_quota?.posts || [],
          },
          serviceRule: servicerule || null,
          syllabus: slb || null,
        });
      } else {
        const errorMsg = result.error || result.message || 'Failed to load preview data';
        console.error('❌ Preview load failed:', errorMsg);
        toast.error(errorMsg);
        setTimeout(() => {
          navigate('/dashboard/requisitions');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error loading preview:', error);
      toast.error('Error loading preview data: ' + error.message);
      setTimeout(() => {
        navigate('/dashboard/requisitions');
      }, 2000);
    } finally {
      setLoading(false);
      console.log('🏁 Preview loading ended');
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setShowConfirmDialog(false); // Close dialog

    console.log('🚀 Starting confirmation process...');
    console.log('📋 Temp ID:', tempId);

    try {
      const result = await RequisitionApi.confirm(tempId);

      console.log('✅ API Response:', result);

      // Check for success
      if (result.success || result.status === 200) {
        const message = result.message || 'Requisition confirmed and saved successfully!';
        toast.success(message, {
          icon: <CheckCircle2 className="text-emerald-500" size={24} />,
          style: { fontWeight: '500' }
        });

        setTimeout(() => {
          console.log('🔄 Redirecting to requisitions list...');
          navigate('/dashboard/requisitions');
        }, 1500);
      } else {
        const errorMsg = result.error || result.message || 'Failed to confirm requisition';
        console.error('❌ Confirmation failed:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('❌ Exception during confirmation:', error);

      // Provide more specific error messages
      let errorMessage = 'Error confirming requisition';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (error.status === 404) {
        errorMessage = 'Requisition not found. It may have already been confirmed.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      toast.error(errorMessage);
    } finally {
      setConfirming(false);
      console.log('🏁 Confirmation process ended');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <InlineLoader text="Loading preview..." variant="ring" size="lg" />
      </div>
    );
  }

  const { step1, step2, step3, serviceRule,syllabus } = previewData;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <Typography variant="h5" className="font-semibold mb-6 text-center">
        Requisition Preview
      </Typography>

      {/* Job Details Card */}
      <Card className="mb-4">
        <CardContent>
          <Typography variant="h6" className="font-semibold mb-3" sx={{ color: '#0B5E3C' }}>
            Job Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '250px' }}>Designation</TableCell>
                  <TableCell>{step1.designation || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Scale</TableCell>
                  <TableCell>{step1.scale || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Quota Percentage</TableCell>
                  <TableCell>{step1.quota_percentage || 'N/A'}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>No. of Posts</TableCell>
                  <TableCell>{step1.num_posts || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date of Vacancy</TableCell>
                  <TableCell>{step1.vacancy_date || 'N/A'}</TableCell>
                </TableRow>
                {/* <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Test Type</TableCell>
                  <TableCell>{step1.test_type || 'N/A'}</TableCell>
                </TableRow> */}
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Service Rules</TableCell>
                  <TableCell>
                    {serviceRule ? (
                      <a href={`${serviceRule}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                        View PDF
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Syllabus</TableCell>
                  <TableCell>
                    {syllabus ? (
                      <a href={`${syllabus}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                        View PDF
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Criteria Details Card */}
      <Card className="mb-4">
        <CardContent>
          <Typography variant="h6" className="font-semibold mb-3" sx={{ color: '#0B5E3C' }}>
            Criteria Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '250px' }}>Academic Qualification</TableCell>
                  <TableCell>{step2.academic_qualification || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Equivalent Qualification</TableCell>
                  <TableCell>{step2.equivalent_qualification || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Authority Certificate</TableCell>
                  <TableCell>{step2.authority_certificate || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Degree Equivalence</TableCell>
                  <TableCell>{step2.degree_equivalence || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Any Other Qualification</TableCell>
                  <TableCell>{step2.any_other_qualification || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Training Institute</TableCell>
                  <TableCell>{step2.training_institute || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Experience Type</TableCell>
                  <TableCell>{step2.experience_type || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Experience Length</TableCell>
                  <TableCell>{step2.experience_length || 0} years</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Minimum Qualification</TableCell>
                  <TableCell>{step2.min_qualification || 'N/A'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Eligibility Details Card */}
      <Card className="mb-4">
        <CardContent>
          <Typography variant="h6" className="font-semibold mb-3" sx={{ color: '#0B5E3C' }}>
            Eligibility Details
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '250px' }}>Minimum Age</TableCell>
                  <TableCell>{step3.min_age || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Maximum Age</TableCell>
                  <TableCell>{step3.max_age || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Age Relaxation</TableCell>
                  <TableCell>{step3.age_relaxation || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Relaxation Reason</TableCell>
                  <TableCell>{step3.relaxation_reason || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Relaxation Years</TableCell>
                  <TableCell>{step3.relaxation_years || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Nationality</TableCell>
                  <TableCell>{step3.nationality || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Domicile</TableCell>
                  <TableCell>{getDistrictName(step3.domicile) || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Other Conditions</TableCell>
                  <TableCell>{step3.other_conditions || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Gender</TableCell>
                  <TableCell>{step3.gender_basis || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>District/Unit</TableCell>
                  <TableCell>
                   
                    {Array.isArray(step3.district)
                      ? step3.district.map(d => getDistrictName(d)).join(', ')
                      : getDistrictName(step3.district) || 'N/A'}
                  </TableCell>
                  
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Quota</TableCell>
                  <TableCell>
                    {step3.quota && Array.isArray(step3.quota)
                      ? step3.quota.join(', ')
                      : step3.quota || 'N/A'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Posts</TableCell>
                  <TableCell>
                    {step3.post && Array.isArray(step3.post)
                      ? step3.post.join(', ')
                      : step3.post || 'N/A'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <Button
          variant="outlined"
          onClick={() => navigate(`/dashboard/requisitions/create?temp_id=${tempId}`)}
          sx={{ borderColor: '#6b7280', color: '#6b7280' }}
        >
          Back to Edit
        </Button>
        <Button
          variant="contained"
          onClick={() => setShowConfirmDialog(true)}
          disabled={confirming}
          sx={{ backgroundColor: '#0B5E3C', '&:hover': { backgroundColor: '#084a2e' } }}
        >
          {confirming ? 'Confirming...' : 'Confirm & Save'}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-emerald-900">
              Confirm Requisition
            </DialogTitle>
            <DialogDescription className="text-base pt-4 text-gray-700">
              Are you sure you want to confirm and save this requisition? This action will finalize the requisition and it will be submitted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button
              variant="outlined"
              onClick={() => setShowConfirmDialog(false)}
              disabled={confirming}
              sx={{ borderColor: '#6b7280', color: '#6b7280' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={confirming}
              sx={{ backgroundColor: '#0B5E3C', '&:hover': { backgroundColor: '#084a2e' } }}
            >
              {confirming ? 'Confirming...' : 'Yes, Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequisitionPreview;
