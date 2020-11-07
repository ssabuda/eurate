from django.test import TestCase

from ..factories import RateFactory


class TestRateModel(TestCase):
    def test_upper_currency(self):
        NAME = "AbC"
        rate = RateFactory(currency=NAME)
        self.assertEqual(rate.currency, NAME.upper())
