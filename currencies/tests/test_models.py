from datetime import date

from django.test import TestCase

from ..factories import RateFactory
from ..models import Rate


class TestRateModel(TestCase):
    def test_upper_currency(self):
        # given
        NAME = "AbC"
        # when
        rate = RateFactory(currency=NAME)
        # then
        self.assertEqual(rate.currency, NAME.upper())


class TestRateManager(TestCase):
    NEWEST_COUNT = 3
    NEWEST_DATE = date(2020, 6, 4)

    @classmethod
    def setUpClass(cls):
        # given
        super().setUpClass()
        RateFactory.create_batch(2, date=date(2020, 6, 2))
        RateFactory.create_batch(2, date=date(2020, 6, 3))
        RateFactory.create_batch(cls.NEWEST_COUNT, date=cls.NEWEST_DATE)

    def test_newest_count(self):
        # when
        rates = Rate.objects.newest()
        # then
        self.assertEqual(rates.count(), self.NEWEST_COUNT)

    def test_newest_date(self):
        # when
        rates = Rate.objects.newest()
        # then
        self.assertEqual(rates.first().date, self.NEWEST_DATE)

    def test_newest_dates(self):
        # when
        rates = Rate.objects.newest().values_list("date", flat=True)
        # then
        self.assertSetEqual(set(rates), {self.NEWEST_DATE})
