from django.test import TestCase

from api.v1.serializers import RateSerializer
from currencies.factories import RateFactory


class TestRateSerializer(TestCase):
    def test_data(self):
        rate = RateFactory()
        serializer = RateSerializer(rate)
        self.assertEqual(
            serializer.data,
            {"currency": rate.currency, "date": str(rate.date), "rate": str(rate.rate)},
        )
