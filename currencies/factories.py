import datetime

from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyDate, FuzzyText, FuzzyDecimal

from .models import Rate


class RateFactory(DjangoModelFactory):
    class Meta:
        model = Rate
        django_get_or_create = ("currency", "date")

    currency = FuzzyText(length=3)
    date = FuzzyDate(datetime.date(2018, 1, 1), datetime.date(2021, 12, 31))
    rate = FuzzyDecimal(0.0001, 99999.9999, precision=4)


class RateFactoryPLN(RateFactory):
    currency = "PLN"


class RateFactoryUSD(RateFactory):
    currency = "USD"
