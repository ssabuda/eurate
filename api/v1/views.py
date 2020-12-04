from rest_framework.generics import ListAPIView

from currencies.models import Rate
from .serializers import RateSerializer


class RateList(ListAPIView):
    queryset = Rate.objects.all()
    serializer_class = RateSerializer
    filterset_fields = ["currency", "date"]


class RateLatestList(ListAPIView):
    queryset = Rate.objects.newest()
    serializer_class = RateSerializer
    filterset_fields = [
        "currency",
    ]
