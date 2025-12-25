import React, { useState, useEffect } from 'react';
import { TextField, MenuItem, Button, Grid, Typography, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Plus, X, Users, MapPin } from 'lucide-react';

const Step3Eligibility = ({ data, onNext, onBack, isEdit = false }) => {
  const [formData, setFormData] = useState({
    min_age: data.min_age || 18,
    max_age: data.max_age || 40,
    age_relaxation: data.age_relaxation || '',
    relaxation_reason: data.relaxation_reason || '',
    relaxation_years: data.relaxation_years || '',
    nationality: data.nationality || '',
    domicile: data.domicile || '',
    other_conditions: data.other_conditions || '',
    gender_basis: data.gender_basis || '',
    district: data.district || [''],
    quota: data.quota || [''],
    post: data.post || [''],
  });

  const [showRelaxation, setShowRelaxation] = useState(data.age_relaxation === 'Yes');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'age_relaxation') {
      setShowRelaxation(value === 'Yes');
    }
  };

  const handleArrayChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addRow = () => {
    setFormData(prev => ({
      ...prev,
      district: [...prev.district, ''],
      quota: [...prev.quota, ''],
      post: [...prev.post, '']
    }));
  };

  const removeRow = (index) => {
    if (formData.district.length > 1) {
      setFormData(prev => ({
        ...prev,
        district: prev.district.filter((_, i) => i !== index),
        quota: prev.quota.filter((_, i) => i !== index),
        post: prev.post.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Users className="text-indigo-600" size={24} />
          </div>
          <div>
            <Typography variant="h6" className="font-semibold text-gray-800">
              Eligibility Criteria
            </Typography>
            <Typography variant="caption" className="text-gray-600">
              Define age, nationality, and domicile requirements
            </Typography>
          </div>
        </div>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            type="number"
            label="Minimum Age"
            name="min_age"
            value={formData.min_age}
            onChange={handleChange}
            inputProps={{ min: 18 }}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            type="number"
            label="Maximum Age"
            name="max_age"
            value={formData.max_age}
            onChange={handleChange}
            inputProps={{ min: formData.min_age }}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Age Relaxation"
            name="age_relaxation"
            value={formData.age_relaxation}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        </Grid>

        {showRelaxation && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Reason for Age Relaxation"
                name="relaxation_reason"
                value={formData.relaxation_reason}
                onChange={handleChange}
                size="small"
              >
                <MenuItem value="Disability">Disability</MenuItem>
                <MenuItem value="Government Employee">Government Employee</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Years of Relaxation"
                name="relaxation_years"
                value={formData.relaxation_years}
                onChange={handleChange}
                inputProps={{ min: 0 }}
                size="small"
              />
            </Grid>
          </>
        )}

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Nationality"
            name="nationality"
            value={formData.nationality}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="Pakistani/AJK">Pakistani/AJK</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            label="Domicile (Name Districts/Units)"
            name="domicile"
            value={formData.domicile}
            onChange={handleChange}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Any Other Conditions"
            name="other_conditions"
            value={formData.other_conditions}
            onChange={handleChange}
            multiline
            rows={2}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Gender"
            name="gender_basis"
            value={formData.gender_basis}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="Male">Male</MenuItem>
            <MenuItem value="Female">Female</MenuItem>
            <MenuItem value="Male/Female">Male or Female</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, mb: 2, mt: 2, backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <MapPin className="text-orange-600" size={24} />
          </div>
          <div>
            <Typography variant="h6" className="font-semibold text-gray-800">
              Quota Wise Post Distribution
            </Typography>
            <Typography variant="caption" className="text-gray-600">
              Define district-wise quota and post allocation
            </Typography>
          </div>
        </div>

        <Grid item xs={12}>
          <Typography variant="h6" className="mb-3 font-semibold" sx={{ color: '#0B5E3C' }}>
            Quota Wise Post
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#234575' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>District</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Quota (%)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Posts</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', width: '100px' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.district.map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        fullWidth
                        required
                        size="small"
                        value={formData.district[index]}
                        onChange={(e) => handleArrayChange(index, 'district', e.target.value)}
                        placeholder="Enter District"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        value={formData.quota[index]}
                        onChange={(e) => handleArrayChange(index, 'quota', e.target.value)}
                        placeholder="Quota %"
                        inputProps={{ min: 0, max: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        value={formData.post[index]}
                        onChange={(e) => handleArrayChange(index, 'post', e.target.value)}
                        placeholder="Posts"
                        inputProps={{ min: 0 }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <IconButton 
                          onClick={() => addRow()} 
                          size="small" 
                          sx={{ color: '#059669' }}
                        >
                          <Plus size={20} />
                        </IconButton>
                        {formData.district.length > 1 && (
                          <IconButton 
                            onClick={() => removeRow(index)} 
                            size="small" 
                            sx={{ color: '#dc2626' }}
                          >
                            <X size={20} />
                          </IconButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" className="block mt-2">
            Total Rows: {formData.district.length}
          </Typography>
        </Grid>
      </Paper>

      <div className="flex justify-between mt-6">
        <Button
          onClick={onBack}
          variant="outlined"
          sx={{ borderColor: '#059669', color: '#059669' }}
        >
          Previous
        </Button>
        <Button
          type="submit"
          variant="contained"
          sx={{ backgroundColor: '#059669', '&:hover': { backgroundColor: '#047857' } }}
        >
          Preview
        </Button>
      </div>
    </form>
  );
};

export default Step3Eligibility;
