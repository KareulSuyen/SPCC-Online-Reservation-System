from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ItemViewSet, CartViewSet, 
    ReservationViewSet, ChatRoomViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'items', ItemViewSet, basename='item')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'support', ChatRoomViewSet, basename='support')

urlpatterns = [
    path('', include(router.urls)),
]