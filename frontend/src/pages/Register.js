import React from 'react';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Paper,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { register } from '../redux/slices/authSlice';

const validationSchema = Yup.object({
  username: Yup.string().required('Username is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm Password is required'),
  user_type: Yup.string().required('User type is required'),
  phone_number: Yup.string().required('Phone number is required'),
  address: Yup.string().required('Address is required'),
  pincode: Yup.string().required('Pincode is required'),
  business_name: Yup.string().when('user_type', {
    is: 'owner',
    then: (schema) => schema.required('Business name is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  business_address: Yup.string().when('user_type', {
    is: 'owner',
    then: (schema) => schema.required('Business address is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  vehicle_number: Yup.string().when('user_type', {
    is: 'delivery',
    then: (schema) => schema.required('Vehicle number is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);

  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      user_type: '',
      phone_number: '',
      address: '',
      pincode: '',
      business_name: '',
      business_address: '',
      vehicle_number: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      const data = { ...values };
      delete data.confirmPassword;
      if (data.user_type !== 'owner') {
        delete data.business_name;
        delete data.business_address;
      }
      if (data.user_type !== 'delivery') {
        delete data.vehicle_number;
      }
      const result = await dispatch(register(data));
      if (!result.error) {
        navigate('/login', { state: location.state });
      }
    },
  });

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 6 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Register
        </Typography>
        <Box component="form" onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            name="username"
            value={formik.values.username}
            onChange={formik.handleChange}
            error={formik.touched.username && Boolean(formik.errors.username)}
            helperText={formik.touched.username && formik.errors.username}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            name="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            name="password"
            type="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>User Type</InputLabel>
            <Select
              name="user_type"
              value={formik.values.user_type}
              label="User Type"
              onChange={formik.handleChange}
              error={formik.touched.user_type && Boolean(formik.errors.user_type)}
            >
              <MenuItem value="customer">Customer</MenuItem>
              <MenuItem value="owner">Tiffin Owner</MenuItem>
              <MenuItem value="delivery">Delivery Boy</MenuItem>
            </Select>
          </FormControl>
          {formik.touched.user_type && formik.errors.user_type && (
            <Typography color="error" variant="body2">
              {formik.errors.user_type}
            </Typography>
          )}
          <TextField
            fullWidth
            margin="normal"
            label="Phone Number"
            name="phone_number"
            value={formik.values.phone_number}
            onChange={formik.handleChange}
            error={formik.touched.phone_number && Boolean(formik.errors.phone_number)}
            helperText={formik.touched.phone_number && formik.errors.phone_number}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Address"
            name="address"
            value={formik.values.address}
            onChange={formik.handleChange}
            error={formik.touched.address && Boolean(formik.errors.address)}
            helperText={formik.touched.address && formik.errors.address}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Pincode"
            name="pincode"
            value={formik.values.pincode}
            onChange={formik.handleChange}
            error={formik.touched.pincode && Boolean(formik.errors.pincode)}
            helperText={formik.touched.pincode && formik.errors.pincode}
          />
          {/* Owner fields */}
          {formik.values.user_type === 'owner' && (
            <>
              <TextField
                fullWidth
                margin="normal"
                label="Business Name"
                name="business_name"
                value={formik.values.business_name}
                onChange={formik.handleChange}
                error={formik.touched.business_name && Boolean(formik.errors.business_name)}
                helperText={formik.touched.business_name && formik.errors.business_name}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Business Address"
                name="business_address"
                value={formik.values.business_address}
                onChange={formik.handleChange}
                error={formik.touched.business_address && Boolean(formik.errors.business_address)}
                helperText={formik.touched.business_address && formik.errors.business_address}
              />
            </>
          )}
          {/* Delivery Boy fields */}
          {formik.values.user_type === 'delivery' && (
            <TextField
              fullWidth
              margin="normal"
              label="Vehicle Number"
              name="vehicle_number"
              value={formik.values.vehicle_number}
              onChange={formik.handleChange}
              error={formik.touched.vehicle_number && Boolean(formik.errors.vehicle_number)}
              helperText={formik.touched.vehicle_number && formik.errors.vehicle_number}
            />
          )}
          {error && (
            <Typography color="error" align="center" sx={{ mt: 2 }}>
              {typeof error === 'string' ? error : 'Registration failed'}
            </Typography>
          )}
          <Box sx={{ mt: 2, position: 'relative' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
            >
              Register
            </Button>
            {loading && (
              <CircularProgress
                size={24}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginTop: '-12px',
                  marginLeft: '-12px',
                }}
              />
            )}
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/login">
              Already have an account? Login
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register; 