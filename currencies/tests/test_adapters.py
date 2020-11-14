import datetime
from decimal import Decimal
from unittest import mock

from django.test import TestCase

from currencies.fixtures import ECB_RESPONSE
from currencies.repositories import APIEcbRepository


class TestEcbAdapterMixin(TestCase):
    @mock.patch.object(APIEcbRepository, "call_api")
    def setUp(self, mock_api):
        mock_api.return_value = ECB_RESPONSE
        repo = APIEcbRepository().all()
        self.adapter = next(repo)


class TestRateEcbAdapter(TestEcbAdapterMixin):
    def test_currency(self):
        self.assertEqual(self.adapter.currency, "USD")

    def test_date(self):
        self.assertEqual(self.adapter.date, datetime.date(2020, 11, 9))

    def test_rate(self):
        self.assertEqual(self.adapter.rate, Decimal("1.1883"))

    def test_to_dict(self):
        self.assertDictEqual(
            self.adapter.to_dict(),
            {
                "currency": "USD",
                "date": datetime.date(2020, 11, 9),
                "rate": Decimal("1.1883"),
            },
        )
