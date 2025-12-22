import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Typography, Grid, Paper, Button, CircularProgress, Chip } from '@mui/material';
import Config from '../../Config/Baseurl';
import AuthService from '../../Services/AuthService';

const RequisitionDetail = () => {
  const { id } = useParams();
  const [requisition, setRequisition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = Config.apiUrl;
  const TOKEN = AuthService.getToken();
  const API_KEY = Config.apiKey;

  const fetchRequisition = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/requisition/${id}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-API-KEY': API_KEY,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch requisition details');
      const result = await response.json();
      if (result.status === 200) {
        setRequisition(result.data);
      } else {
        throw new Error(result.message || 'Invalid response');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequisition();
  }, [id]);

  const renderFileLink = (label, path) => {
    if (!path) return null;
    const fullUrl = `${API_BASE.replace('/api', '')}/${path}`;
    return (
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          View File
        </a>
      </Grid>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center py-8">
        Error: {error}
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="text-center py-8">
        No requisition found.
      </div>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 900, mx: 'auto', my: 4 }}>
      <Typography variant="h5" gutterBottom>
        Requisition Details - ID: {requisition.id}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Designation</Typography>
          <Typography>{requisition.designation || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Scale</Typography>
          <Typography>{requisition.scale || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Department</Typography>
          <Typography>{requisition.department?.name || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Quota</Typography>
          <Typography>{requisition.quota_percentage?.name || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Number of Posts</Typography>
          <Typography>{requisition.num_posts || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Vacancy Date</Typography>
          <Typography>{requisition.vacancy_date || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Test Type</Typography>
          <Typography>{requisition.test_type || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Status</Typography>
          <Chip
            label={requisition.status.toUpperCase()}
            color={requisition.status === 'approved' ? 'success' : requisition.status === 'rejected' ? 'error' : 'warning'}
          />
        </Grid>

        {renderFileLink('Service Rules', requisition.service_rules)}
        {renderFileLink('Syllabus', requisition.syllabus)}
        {renderFileLink('Requisition Form', requisition.requisition_form)}
        {renderFileLink('Annex A Form', requisition.annex_a_form)}
        {renderFileLink('Other Attachment', requisition.other_attachment)}

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Qualification</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Academic Qualification</Typography>
          <Typography>{requisition.qualification?.academic_qualification || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Equivalent Qualification</Typography>
          <Typography>{requisition.qualification?.equivalent_qualification || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Experience Length</Typography>
          <Typography>{requisition.qualification?.experience_length || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Min Qualification</Typography>
          <Typography>{requisition.qualification?.min_qualification || 'N/A'}</Typography>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Eligibility</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Min Age</Typography>
          <Typography>{requisition.eligibility?.min_age || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Max Age</Typography>
          <Typography>{requisition.eligibility?.max_age || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Nationality</Typography>
          <Typography>{requisition.eligibility?.nationality || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Domicile</Typography>
          <Typography>{requisition.eligibility?.domicile || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle2" color="text.secondary">Gender Basis</Typography>
          <Typography>{requisition.eligibility?.gender_basis || 'N/A'}</Typography>
        </Grid>
      </Grid>

      <div className="mt-6 text-right">
        <Link to="/requisitions">
          <Button variant="outlined">Back to List</Button>
        </Link>
      </div>
    </Paper>
  );
};

export default RequisitionDetail;