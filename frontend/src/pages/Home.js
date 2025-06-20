import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Box,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const Home = () => {
  const navigate = useNavigate();
  const [pincode, setPincode] = useState('');
  const [tiffins, setTiffins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch featured tiffins on component mount
    fetchFeaturedTiffins();
  }, []);

  const fetchFeaturedTiffins = async () => {
    try {
      const response = await axios.get(`${API_URL}/tiffins/`);
      setTiffins(response.data.results);
    } catch (error) {
      setError('Failed to fetch featured tiffins');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!pincode) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_URL}/tiffins/`, {
        params: { pincode },
      });
      setTiffins(response.data.results);
    } catch (error) {
      setError('Failed to fetch tiffins for the given pincode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      {/* Hero Section */}
      <Box
        sx={{
          mt: 8,
          mb: 6,
          textAlign: 'center',
          backgroundColor: 'primary.light',
          borderRadius: 4,
          p: 4,
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to Home Eats
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          Discover delicious homemade food in your area
        </Typography>

        {/* Search Bar */}
        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{
            display: 'flex',
            gap: 2,
            maxWidth: 600,
            mx: 'auto',
            mt: 4,
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter your pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            sx={{ backgroundColor: 'white' }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<SearchIcon />}
            disabled={loading}
          >
            Search
          </Button>
        </Box>
      </Box>

      {/* Featured Tiffins Section */}
      <Box sx={{ mt: 6, mb: 4 }}>
        <Typography variant="h4" component="h2" gutterBottom>
          {pincode ? 'Available Tiffins' : 'Featured Tiffins'}
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center">
            {error}
          </Typography>
        ) : (
          <Grid container spacing={4}>
            {tiffins.map((tiffin) => (
              <Grid item key={tiffin.id} xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      transition: 'transform 0.2s ease-in-out',
                    },
                  }}
                  onClick={() => navigate(`/tiffin/${tiffin.id}`)}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={tiffin.image || 'https://via.placeholder.com/300x200'}
                    alt={tiffin.name}
                  />
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="h3">
                      {tiffin.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {tiffin.description}
                    </Typography>
                    <Typography
                      variant="h6"
                      color="primary"
                      sx={{ mt: 2 }}
                    >
                      ₹{tiffin.price}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      By {tiffin.owner_name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default Home; 