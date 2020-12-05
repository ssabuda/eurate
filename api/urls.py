from django.urls import path

from api.v1.views import RateList, RateNewestList

app_name = "api"
urlpatterns = [
    path("v1/rates/", RateList.as_view(), name="rates"),
    path("v1/newest/", RateNewestList.as_view(), name="newest"),
]
