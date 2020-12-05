from django.test import TestCase

from currencies.factories import RateFactory
from ..serializers import RateSerializer


class TestRateSerializer(TestCase):
    def test_data(self):
        rate = RateFactory()
        serializer = RateSerializer(rate)
        self.assertDictEqual(
            serializer.data,
            {"currency": rate.currency, "date": str(rate.date), "rate": str(rate.rate)},
        )
