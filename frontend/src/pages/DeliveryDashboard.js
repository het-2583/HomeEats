import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  LocalShipping,
  CheckCircle,
  Pending,
  Cancel,
  LocationOn,
} from '@mui/icons-material';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const DeliveryStatus = ({ status, onStatusChange }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'info';
      case 'picked_up':
        return 'info';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Pending />;
      case 'accepted':
        return <CheckCircle />;
      case 'picked_up':
        return <LocalShipping />;
      case 'delivered':
        return <CheckCircle />;
      case 'cancelled':
        return <Cancel />;
      default:
        return null;
    }
  };

  const getNextStatus = () => {
    switch (status) {
      case 'accepted':
        return 'picked_up';
      case 'picked_up':
        return 'delivered';
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={getStatusIcon()}
        label={status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        color={getStatusColor()}
        variant="outlined"
      />
      {nextStatus && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onStatusChange(nextStatus)}
        >
          Mark as {nextStatus.replace('_', ' ')}
        </Button>
      )}
    </Box>
  );
};

const DeliveryDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    if (user && user.pincode) {
      fetchDeliveries(user.pincode);
      const interval = setInterval(() => fetchDeliveries(user.pincode), 5000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
      setError('User pincode not available. Please log in as a Delivery Boy.');
    }
  }, [user]);

  const fetchDeliveries = async (pincode) => {
    try {
      const token = localStorage.getItem('access_token');
      let allDeliveries = [];
      let nextUrl = `${API_URL}/deliveries/?pincode=${pincode}`;
      while (nextUrl) {
        const response = await axios.get(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Deliveries API response:', response.data.results); // Debug log
        allDeliveries = allDeliveries.concat(response.data.results);
        nextUrl = response.data.next;
      }
      setDeliveries(allDeliveries);
    } catch (error) {
      setError('Failed to fetch deliveries');
      toast.error('Failed to fetch deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAcceptDelivery = async (deliveryId) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}/deliveries/${deliveryId}/accept/`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success('Delivery accepted!');
      fetchDeliveries(user.pincode);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept delivery');
    }
  };

  const handleRejectDelivery = async (deliveryId) => {
    // For now, simply remove from the list, or we could add a 'rejected' status later
    setDeliveries((prevDeliveries) =>
      prevDeliveries.filter((delivery) => delivery.id !== deliveryId)
    );
    toast.info('Delivery rejected.');
    // Optionally, send a reject status to the backend if a 'reject' action is added
  };

  const handleStatusChange = async (deliveryId, newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}/deliveries/${deliveryId}/update_status/`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(`Delivery marked as ${newStatus.replace('_', ' ')}!`);
      fetchDeliveries(user.pincode);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update delivery status');
    }
  };

  const newDeliveries = deliveries.filter(
    (delivery) => delivery.status === 'pending' && delivery.delivery_boy === null
  );
  const activeDeliveries = deliveries.filter(
    (delivery) => ['accepted', 'picked_up'].includes(delivery.status) && delivery.delivery_boy !== null
  );
  const deliveryHistory = deliveries.filter(
    (delivery) => ['delivered', 'cancelled'].includes(delivery.status)
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Typography color="error" align="center" sx={{ mt: 4 }}>
          {error}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Delivery Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="New Deliveries" />
          <Tab label="Active Deliveries" />
          <Tab label="Delivery History" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {newDeliveries.length === 0 ? (
            <Grid item xs={12}>
              <Typography align="center" color="text.secondary">
                No new deliveries available.
              </Typography>
            </Grid>
          ) : (
            newDeliveries.map((delivery) => (
              <Grid item xs={12} key={delivery.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      New Delivery for Order #{delivery.order_details.id}
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      Tiffin: {delivery.order_details.tiffin_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Customer: {delivery.order_details.customer_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Quantity: {delivery.order_details.quantity}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Price: ₹{delivery.order_details.total_price}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="primary">
                        Pickup Location:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {delivery.pickup_address}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" color="primary">
                        Delivery Location:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {delivery.delivery_address}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleAcceptDelivery(delivery.id)}
                      >
                        Accept Delivery
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleRejectDelivery(delivery.id)}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {activeDeliveries.length === 0 ? (
            <Grid item xs={12}>
              <Typography align="center" color="text.secondary">
                No active deliveries found.
              </Typography>
            </Grid>
          ) : (
            activeDeliveries.map((delivery) => (
              <Grid item xs={12} key={delivery.id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="h6" gutterBottom>
                          Order #{delivery.order_details.id}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          {delivery.order_details.tiffin_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Customer: {delivery.order_details.customer_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Quantity: {delivery.order_details.quantity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total: ₹{delivery.order_details.total_price}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: { xs: 'flex-start', sm: 'flex-end' },
                            gap: 1,
                          }}
                        >
                          <DeliveryStatus
                            status={delivery.status}
                            onStatusChange={(newStatus) =>
                              handleStatusChange(delivery.id, newStatus)
                            }
                          />
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="primary">
                              Pickup Location:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {delivery.pickup_address}
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="primary">
                              Delivery Location:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {delivery.delivery_address}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Created: {new Date(delivery.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          {deliveryHistory.length === 0 ? (
            <Grid item xs={12}>
              <Typography align="center" color="text.secondary">
                No delivery history found.
              </Typography>
            </Grid>
          ) : (
            deliveryHistory.map((delivery) => (
              <Grid item xs={12} key={delivery.id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="h6" gutterBottom>
                          Order #{delivery.order_details.id}
                        </Typography>
                        <Typography color="text.secondary" gutterBottom>
                          {delivery.order_details.tiffin_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Customer: {delivery.order_details.customer_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Quantity: {delivery.order_details.quantity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total: ₹{delivery.order_details.total_price}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: { xs: 'flex-start', sm: 'flex-end' },
                            gap: 1,
                          }}
                        >
                          <DeliveryStatus status={delivery.status} />
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="primary">
                              Pickup Location:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {delivery.pickup_address}
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="primary">
                              Delivery Location:
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {delivery.delivery_address}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            Created: {new Date(delivery.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Container>
  );
};

export default DeliveryDashboard; 