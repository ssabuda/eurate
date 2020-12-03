from django.urls import path, include

from api.v1.views import RateList

app_name = "api"
urlpatterns = [
    path("v1/rates/", RateList.as_view(), name="rates"),
]
