from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('customer', 'Customer'),
        ('owner', 'Tiffin Owner'),
        ('delivery', 'Delivery Boy'),
    )
    
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    phone_number = models.CharField(max_length=15)
    address = models.TextField()
    pincode = models.CharField(max_length=6)
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

class TiffinOwner(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tiffin_owner')
    business_name = models.CharField(max_length=100)
    business_address = models.TextField()
    business_pincode = models.CharField(max_length=6)
    is_verified = models.BooleanField(default=False)
    
    def __str__(self):
        return self.business_name

class DeliveryBoy(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='delivery_boy')
    vehicle_number = models.CharField(max_length=20)
    is_available = models.BooleanField(default=True)
    current_location = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.vehicle_number}" 