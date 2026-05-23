from django.urls import path
from . import views

urlpatterns = [
    path('api/school-status/', views.get_school_status, name='school_status'),
]