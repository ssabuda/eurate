from functools import cached_property

from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.reverse import reverse

from currencies.constants import EUR
from currencies.models import Rate
from .filters import CurrencyFilterSet, RateFilterSet, requested_base
from .serializers import RateSerializer


class BaseCurrencyMixin:
    """Rates against `?base=` (EUR when left out) instead of the euro."""

    model = Rate
    serializer_class = RateSerializer
    filterset_class = CurrencyFilterSet

    @cached_property
    def base(self) -> str:
        base = requested_base(self.request)
        if base != EUR and not self.model.objects.filter(currency=base).exists():
            raise ValidationError({"base": f"No rates stored for {base}."})
        return base

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "base": self.base}


class RateList(BaseCurrencyMixin, ListAPIView):
    filterset_class = RateFilterSet

    def get_queryset(self):
        return self.model.objects.in_base(self.base)


class RateNewestList(BaseCurrencyMixin, ListAPIView):
    def get_queryset(self):
        return self.model.objects.newest(self.base)


class RateTopPriceList(BaseCurrencyMixin, ListAPIView):
    def get_queryset(self):
        return self.model.objects.get_most_expensive(self.base)


class RateLowestPriceList(BaseCurrencyMixin, ListAPIView):
    def get_queryset(self):
        return self.model.objects.get_cheapest(self.base)


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
