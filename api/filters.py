import django_filters

from currencies.constants import EUR
from currencies.models import Rate


def requested_base(request) -> str:
    return request.query_params.get("base", EUR).upper() or EUR


class CurrencyFilterSet(django_filters.FilterSet):
    currency = django_filters.CharFilter(method="filter_currency")

    class Meta:
        model = Rate
        fields = []

    def filter_currency(self, queryset, name, value):
        # Filters the stored column, not the `code` annotation, so the
        # (currency, date) index is used. In another base the base's own rows
        # stand in for the euro (see RateManager.in_base).
        currency = value.upper()
        base = requested_base(self.request)
        if base != EUR:
            if currency == EUR:
                currency = base
            elif currency == base:
                return queryset.none()
        return queryset.filter(currency=currency)


class RateFilterSet(CurrencyFilterSet):
    class Meta:
        model = Rate
        fields = {"date": ["exact", "lt", "gte", "lte"]}
