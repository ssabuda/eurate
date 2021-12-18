from django.urls import path

from api.views import (
    RateList,
    RateNewestList,
    api_root,
    RateTopPriceList,
    RateLowestPriceList,
)

app_name = "api"
urlpatterns = [
    path("", api_root, name="root"),
    path("v1/rates/", RateList.as_view(), name="rates"),
    path("v1/newest/", RateNewestList.as_view(), name="newest"),
    path("v1/topprice/", RateTopPriceList.as_view(), name="topprice"),
    path("v1/lowestprice/", RateLowestPriceList.as_view(), name="lowestprice"),
]
