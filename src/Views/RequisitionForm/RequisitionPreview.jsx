import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { InlineLoader } from 'Components/ui/Loader';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';
import toast from 'react-hot-toast';

const RequisitionPreview = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tempId = searchParams.get('temp_id');
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [previewData, setPreviewData] = useState({
    step1: {},
    step2: {},
    step3: {}
  });

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  useEffect(() => {
    if (!tempId) {
      toast.error('No temporary data found');
      navigate('/dashboard/requisitions');
      return;
    }
    loadPreviewData();
  }, [tempId]);

  const loadPreviewData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/requisition/preview/${tempId}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      
      if (result.status === 200) {
        setPreviewData(result.data);
      } else {
        toast.error(result.error || 'Failed to load preview data');
        navigate('/dashboard/requisitions');
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('Error loading preview data');
      navigate('/dashboard/requisitions');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await fetch(`${API_BASE}/requisition/confirm/${tempId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      const result = await response.json();
      
      if (result.status === 200) {
        toast.success('Requisition confirmed and saved successfully!');
        setTimeout(() => {
          navigate('/dashboard/requisitions');
        }, 1000);
      } else {
        toast.error(result.error || 'Failed to confirm requisition');
      }
    } catch (error) {
      console.error('Error confirming:', error);
      toast.error('Error confirming requisition');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <InlineLoader text="Loading preview..." variant="ring" size="lg" />
      </div>
    );
  }

  const { step1, step2, step3 } = previewData;

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
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Test Type</TableCell>
                  <TableCell>{step1.test_type || 'N/A'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Service Rules</TableCell>
                  <TableCell>
                    {step1.service_rules ? (
                      <a href={`${API_BASE.replace('/api', '')}/${step1.service_rules}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                        View PDF
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Syllabus</TableCell>
                  <TableCell>
                    {step1.syllabus ? (
                      <a href={`${API_BASE.replace('/api', '')}/${step1.syllabus}`} target="_blank" rel="noopener noreferrer" className="text-blue-600">
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
                  <TableCell>{step3.domicile || 'N/A'}</TableCell>
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
                    {step3.district && Array.isArray(step3.district) 
                      ? step3.district.join(', ') 
                      : step3.district || 'N/A'}
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
          onClick={handleConfirm}
          disabled={confirming}
          sx={{ backgroundColor: '#0B5E3C', '&:hover': { backgroundColor: '#084a2e' } }}
        >
          {confirming ? 'Confirming...' : 'Confirm & Save'}
        </Button>
      </div>
    </div>
  );
};

export default RequisitionPreview;
