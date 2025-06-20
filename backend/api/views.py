from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters import rest_framework as filters
from users.models import User, TiffinOwner, DeliveryBoy
from .models import Tiffin, Order, Delivery
from .serializers import (
    UserSerializer, TiffinOwnerSerializer, DeliveryBoySerializer,
    TiffinSerializer, OrderSerializer, DeliverySerializer
)
from rest_framework.permissions import AllowAny
from django.db import models
from rest_framework.exceptions import PermissionDenied

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner.user == request.user

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'me']:
            return [AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        if self.request.user.user_type == 'owner':
            return User.objects.filter(id=self.request.user.id)
        return User.objects.all()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class TiffinOwnerViewSet(viewsets.ModelViewSet):
    queryset = TiffinOwner.objects.all()
    serializer_class = TiffinOwnerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.user_type == 'owner':
            return TiffinOwner.objects.filter(user=self.request.user)
        return TiffinOwner.objects.all()

class DeliveryBoyViewSet(viewsets.ModelViewSet):
    queryset = DeliveryBoy.objects.all()
    serializer_class = DeliveryBoySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.user_type == 'delivery':
            return DeliveryBoy.objects.filter(user=self.request.user)
        return DeliveryBoy.objects.all()

class TiffinFilter(filters.FilterSet):
    min_price = filters.NumberFilter(field_name="price", lookup_expr='gte')
    max_price = filters.NumberFilter(field_name="price", lookup_expr='lte')
    pincode = filters.CharFilter(field_name="owner__business_pincode")
    search = filters.CharFilter(method='filter_by_name_or_description')

    class Meta:
        model = Tiffin
        fields = ['is_available', 'owner', 'pincode', 'min_price', 'max_price']

    def filter_by_name_or_description(self, queryset, name, value):
        return queryset.filter(
            models.Q(name__icontains=value) | models.Q(description__icontains=value)
        )

class TiffinViewSet(viewsets.ModelViewSet):
    queryset = Tiffin.objects.all()
    serializer_class = TiffinSerializer
    filterset_class = TiffinFilter

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [permissions.IsAuthenticated(), IsOwnerOrReadOnly()]

    def get_queryset(self):
        user = self.request.user
        queryset = Tiffin.objects.all()

        if user.is_authenticated:
            if user.user_type == 'owner':
                # Owners only see their own tiffins.
                # No need for other filters like pincode or search for them.
                print(f"Filtering tiffins for owner: {user.username}")  # Debug log
                return queryset.filter(owner__user=user)

        # For anonymous users, customers, and delivery boys,
        # filters (pincode and search) will be applied by the filterset_class
        # based on the query parameters sent from the frontend.
        # We also want to ensure only available tiffins are shown.
        if not user.is_authenticated or (user.is_authenticated and user.user_type != 'owner'):
            queryset = queryset.filter(is_available=True)

        # The filterset_class will automatically apply filters based on
        # query parameters like 'pincode' and 'search'.
        # So we just return the base queryset (potentially filtered by is_available).
        return queryset

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'tiffin_owner'):
            raise PermissionDenied("User is not a tiffin owner")
        serializer.save(owner=self.request.user.tiffin_owner)

class OrderFilter(filters.FilterSet):
    status = filters.CharFilter(field_name="status")
    pincode = filters.CharFilter(field_name="delivery_pincode")

    class Meta:
        model = Order
        fields = ['status', 'customer', 'tiffin', 'delivery_boy', 'pincode']

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = OrderFilter

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.all()
        
        if user.user_type == 'customer':
            return queryset.filter(customer=user)
        elif user.user_type == 'owner':
            return queryset.filter(tiffin__owner__user=user)
        elif user.user_type == 'delivery':
            # For delivery boys, only show orders in their pincode
            return queryset.filter(
                delivery_pincode=user.pincode,
                status__in=['ready_for_delivery', 'picked_up']
            )
        
        # Filter by pincode if provided
        pincode = self.request.query_params.get('pincode', None)
        if pincode:
            queryset = queryset.filter(delivery_pincode=pincode)
        
        return queryset

    def perform_create(self, serializer):
        tiffin = serializer.validated_data['tiffin']
        quantity = serializer.validated_data['quantity']
        total_price = tiffin.price * quantity
        serializer.save(customer=self.request.user, total_price=total_price)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Order.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = new_status
        order.save()

        if new_status == 'ready_for_delivery':
            # Create a new Delivery record
            Delivery.objects.create(
                order=order,
                pickup_address=order.tiffin.owner.business_address,
                delivery_address=order.delivery_address,
                status='pending', # Initial status for the delivery
                delivery_boy=None # Delivery boy will be assigned later
            )

        return Response(OrderSerializer(order).data)

class DeliveryFilter(filters.FilterSet):
    status = filters.CharFilter(field_name="status")
    pincode = filters.CharFilter(field_name="order__delivery_pincode")
    delivery_boy_is_null = filters.BooleanFilter(field_name="delivery_boy", lookup_expr='isnull')

    class Meta:
        model = Delivery
        fields = ['status', 'delivery_boy', 'pincode', 'delivery_boy_is_null']

class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = DeliveryFilter

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'delivery':
            # Delivery boys see deliveries in their pincode, either assigned or unassigned
            # For unassigned deliveries, check if the delivery_boy field is null and in their pincode
            # For assigned deliveries, ensure it's assigned to them
            return Delivery.objects.filter(
                models.Q(delivery_boy__user=user) |
                models.Q(delivery_boy__isnull=True, order__delivery_pincode=user.pincode)
            )
        elif user.user_type == 'owner':
            return Delivery.objects.filter(order__tiffin__owner__user=user)
        elif user.user_type == 'customer':
            return Delivery.objects.filter(order__customer=user)
        return Delivery.objects.none()

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        delivery = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Delivery.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        delivery.status = new_status
        delivery.save()
        return Response(DeliverySerializer(delivery).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        delivery = self.get_object()
        user = self.request.user

        if user.user_type != 'delivery':
            return Response({'error': 'Only delivery boys can accept deliveries.'}, status=status.HTTP_403_FORBIDDEN)

        if delivery.status != 'pending':
            return Response({'error': 'Delivery is not in pending status.'}, status=status.HTTP_400_BAD_REQUEST)

        if delivery.delivery_boy is not None:
            return Response({'error': 'Delivery already assigned.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            delivery_boy_profile = DeliveryBoy.objects.get(user=user)
            delivery.delivery_boy = delivery_boy_profile
            delivery.status = 'accepted'
            delivery.save()
            return Response(DeliverySerializer(delivery).data)
        except DeliveryBoy.DoesNotExist:
            return Response({'error': 'Delivery boy profile not found.'}, status=status.HTTP_404_NOT_FOUND) 