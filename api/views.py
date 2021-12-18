from rest_framework.decorators import api_view
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.reverse import reverse

from currencies.models import Rate
from .serializers import RateSerializer


class RateList(ListAPIView):
    queryset = Rate.objects.all()
    serializer_class = RateSerializer
    filterset_fields = ["currency", "date"]


class RateNewestList(ListAPIView):
    model = Rate
    serializer_class = RateSerializer
    filterset_fields = [
        "currency",
    ]

    def get_queryset(self):
        return self.model.objects.newest()


class RateTopPriceList(ListAPIView):
    model = Rate
    serializer_class = RateSerializer
    filterset_fields = [
        "currency",
    ]

    def get_queryset(self):
        return self.model.objects.get_most_expensive()


class RateLowestPriceList(ListAPIView):
    model = Rate
    serializer_class = RateSerializer
    filterset_fields = [
        "currency",
    ]

    def get_queryset(self):
        return self.model.objects.get_cheapest()


@api_view(["GET"])
def api_root(request, format=None):
    return Response(
        {
            "currency rates": reverse("api:rates", request=request, format=format),
            "newest currency rates": reverse(
                "api:newest", request=request, format=format
            ),
            "top price rates": reverse("api:topprice", request=request, format=format),
            "lowest price rates": reverse(
                "api:lowestprice", request=request, format=format
            ),
        }
    )
