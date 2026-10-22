from decimal import Decimal

from django.test import TestCase

from currencies.factories import RateFactory
from ..serializers import RateSerializer, significant


class TestRateSerializer(TestCase):
    def test_data(self):
        rate = RateFactory()
        serializer = RateSerializer(rate)
        self.assertDictEqual(
            serializer.data,
            {"currency": rate.currency, "date": str(rate.date), "rate": str(rate.rate)},
        )


class TestSignificant(TestCase):
    def test_rounds_to_significant_digits(self):
        cases = (
            ("0.2325581395", "0.232558"),
            ("0.000056789123", "0.0000567891"),
            ("37.767441860", "37.7674"),
            ("3.981481481", "3.98148"),
            ("3912345.6", "3912350"),
            ("1234.5", "1234.50"),
            ("0.25000000", "0.2500"),
            ("4.4", "4.4000"),
            ("4", "4.0000"),
            ("0", "0.0000"),
        )
        for value, expected in cases:
            with self.subTest(value=value):
                self.assertEqual(significant(Decimal(value), 6), expected)
