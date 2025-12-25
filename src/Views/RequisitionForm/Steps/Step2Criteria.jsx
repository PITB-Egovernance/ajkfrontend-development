import React, { useState } from 'react';
import { TextField, MenuItem, Button, Grid, Typography, Paper } from '@mui/material';
import { GraduationCap, Award } from 'lucide-react';

const Step2Criteria = ({ data, onNext, onBack }) => {
  const [formData, setFormData] = useState({
    academic_qualification: data.academic_qualification || '',
    equivalent_qualification: data.equivalent_qualification || '',
    authority_certificate: data.authority_certificate || '',
    degree_equivalence: data.degree_equivalence || '',
    any_other_qualification: data.any_other_qualification || '',
    training_institute: data.training_institute || '',
    experience_type: data.experience_type || '',
    experience_length: data.experience_length || 0,
    min_qualification: data.min_qualification || '',
  });

  const [showAuthority, setShowAuthority] = useState(data.equivalent_qualification === 'Yes');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'equivalent_qualification') {
      setShowAuthority(value === 'Yes');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext(formData);
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }}>
      <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <GraduationCap className="text-blue-600" size={24} />
        </div>
        <div>
          <Typography variant="h6" className="font-semibold text-gray-800">
            Qualification Required
          </Typography>
          <Typography variant="caption" className="text-gray-600">
            Specify academic and professional requirements
          </Typography>
        </div>
      </div>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Academic Qualification"
            name="academic_qualification"
            value={formData.academic_qualification}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="Matric">Matric</MenuItem>
            <MenuItem value="Intermediate">Intermediate</MenuItem>
            <MenuItem value="Bachelor">Bachelor</MenuItem>
            <MenuItem value="Master">Master</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Equivalent Qualification"
            name="equivalent_qualification"
            value={formData.equivalent_qualification}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="Yes">Yes</MenuItem>
            <MenuItem value="No">No</MenuItem>
          </TextField>
        </Grid>

        {showAuthority && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Authority for Equivalent Certificate"
              name="authority_certificate"
              value={formData.authority_certificate}
              onChange={handleChange}
              size="small"
            />
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            select
            label="Name Degree of Equivalence"
            name="degree_equivalence"
            value={formData.degree_equivalence}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="B.Sc">B.Sc</MenuItem>
            <MenuItem value="B.A">B.A</MenuItem>
            <MenuItem value="B.Com">B.Com</MenuItem>
            <MenuItem value="BBA">BBA</MenuItem>
            <MenuItem value="BS Computer Science">BS Computer Science</MenuItem>
            <MenuItem value="BS Information Technology">BS Information Technology</MenuItem>
            <MenuItem value="M.Sc">M.Sc</MenuItem>
            <MenuItem value="M.A">M.A</MenuItem>
            <MenuItem value="M.Com">M.Com</MenuItem>
            <MenuItem value="MBA">MBA</MenuItem>
            <MenuItem value="MS Computer Science">MS Computer Science</MenuItem>
            <MenuItem value="M.Phil">M.Phil</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Any Other Qualification under Rules"
            name="any_other_qualification"
            value={formData.any_other_qualification}
            onChange={handleChange}
            size="small"
          />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, mb: 3, mt: 4, backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Award className="text-purple-600" size={24} />
          </div>
          <div>
            <Typography variant="h6" className="font-semibold text-gray-800">
              Experience Required
            </Typography>
            <Typography variant="caption" className="text-gray-600">
              Define experience and training requirements
            </Typography>
          </div>
        </div>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Training with the name of Training Institute"
              name="training_institute"
              value={formData.training_institute}
              onChange={handleChange}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" className="mt-6 mb-4 font-semibold" sx={{ color: '#0B5E3C' }}>
        Experience Required
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Type of Experience Required"
            name="experience_type"
            value={formData.experience_type}
            onChange={handleChange}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Length of Experience (in years)"
            name="experience_length"
            value={formData.experience_length}
            onChange={handleChange}
            inputProps={{ min: 0 }}
            size="small"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            select
            label="Minimum Qualification"
            name="min_qualification"
            value={formData.min_qualification}
            onChange={handleChange}
            size="small"
          >
            <MenuItem value="Bachelor">Bachelor</MenuItem>
            <MenuItem value="Master">Master</MenuItem>
            <MenuItem value="PhD">PhD</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      <Typography variant="caption" className="block mt-4 text-gray-600">
        Note: Only those experience certificates shall be accepted which are in accordance with rule notification #AJKPSC/1-2017/1077-10AJKPSC.
      </Typography>

      <div className="flex justify-between mt-6">
        <Button
          onClick={onBack}
          variant="outlined"
          size="large"
          sx={{ 
            borderColor: '#059669', 
            color: '#059669',
            paddingX: 4,
            paddingY: 1.5,
            fontSize: '1rem',
            fontWeight: 600
          }}
        >
          Previous
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={{ 
            backgroundColor: '#059669', 
            '&:hover': { backgroundColor: '#047857' },
            paddingX: 4,
            paddingY: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            boxShadow: 3
          }}
        >
          Save & Continue
        </Button>
      </div>
    </form>
  </Paper>
  );
};

export default Step2Criteria;
