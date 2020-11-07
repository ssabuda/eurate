from datetime import date
from decimal import Decimal

from django.test import TestCase

from ..factories import RateFactory, RateFactoryUSD, RateFactoryPLN
from ..models import Rate


class TestRateModel(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # given
        cls.currency = "AbC"
        cls.date = date(2020, 9, 8)
        cls.rate_value = Decimal("4.6")
        # when
        cls.rate = RateFactory(
            currency=cls.currency, date=cls.date, rate=cls.rate_value
        )

    def test_upper_currency(self):
        # then
        self.assertEqual(self.rate.currency, self.currency.upper())

    def test_str(self):
        self.assertEqual(
            str(self.rate), f"{self.date} - {self.currency.upper()} - {self.rate_value}"
        )


class TestRateManager(TestCase):
    NEWEST_COUNT = 3
    NEWEST_DATE = date(2020, 6, 4)
    USD_DATE = date(2020, 5, 26)
    FILTER_DATE = date(2020, 6, 2)

    @classmethod
    def setUpClass(cls):
        # given
        super().setUpClass()
        RateFactory.create_batch(2, date=cls.FILTER_DATE)
        RateFactory.create_batch(2, date=date(2020, 6, 3))
        RateFactory.create_batch(cls.NEWEST_COUNT, date=cls.NEWEST_DATE)
        cls.usd = RateFactoryUSD(date=cls.USD_DATE)
        cls.pln = RateFactoryPLN()

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

    def test_currency(self):
        rates = Rate.objects.currency("PLN").values_list("pk", flat=True)
        self.assertListEqual(list(rates), [self.pln.pk])

    def test_currency_lower(self):
        # when
        rates = Rate.objects.currency("usd").values_list("pk", flat=True)
        self.assertListEqual(list(rates), [self.usd.pk])

    def test_currency_upper(self):
        # when
        rates = Rate.objects.currency("USD").values_list("pk", flat=True)
        self.assertListEqual(list(rates), [self.usd.pk])

    def test_currency_mix(self):
        # when
        rates = Rate.objects.currency("USd").values_list("pk", flat=True)
        self.assertListEqual(list(rates), [self.usd.pk])

    def test_date_usd(self):
        rates = Rate.objects.date(self.USD_DATE).values_list("pk", flat=True)
        self.assertListEqual(list(rates), [self.usd.pk])

    def test_date(self):
        rates = Rate.objects.date(self.FILTER_DATE).values_list("date", flat=True)
        self.assertSetEqual(set(rates), {self.FILTER_DATE})
