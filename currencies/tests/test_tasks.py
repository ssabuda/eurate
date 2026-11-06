from datetime import date
from decimal import Decimal, InvalidOperation
from unittest import mock
from xml.etree.ElementTree import Element

from django.db import DataError
from django.test import TestCase, TransactionTestCase

from ..adapter import RateEcbAdapter
from ..factories import RateFactoryUSD
from ..fixtures import ECB_RESPONSE
from ..models import Rate
from ..repository import APIEcbRepository
from ..tasks import run_import

FIXTURE_ROWS = 2048
# The first rate in ECB_RESPONSE.
USD_DATE = date(2020, 11, 9)
USD_RATE = Decimal("1.1883")


@mock.patch.object(APIEcbRepository, "call_api", return_value=ECB_RESPONSE)
class TestRunImport(TestCase):
    def test_creates_every_rate(self, mock_api):
        run_import()
        self.assertEqual(Rate.objects.count(), FIXTURE_ROWS)

    def test_saves_rate_values(self, mock_api):
        run_import()
        rate = Rate.objects.get(currency="USD", date=USD_DATE)
        self.assertEqual(rate.rate, USD_RATE)

    def test_second_run_adds_nothing(self, mock_api):
        run_import()
        run_import()
        self.assertEqual(Rate.objects.count(), FIXTURE_ROWS)

    def test_keeps_existing_rate(self, mock_api):
        existing = RateFactoryUSD(date=USD_DATE, rate=Decimal("9.9999"))
        run_import()
        existing.refresh_from_db()
        self.assertEqual(existing.rate, Decimal("9.9999"))
        self.assertEqual(Rate.objects.count(), FIXTURE_ROWS)


class TestBulkImportCommit(TransactionTestCase):
    """No wrapping test transaction, so the batch commits are real."""

    @mock.patch("currencies.models.IMPORT_BATCH_SIZE", 1)
    def test_database_error_keeps_committed_batches(self):
        good = RateEcbAdapter(
            USD_DATE, Element("Cube", {"currency": "USD", "rate": "1.1883"})
        )
        # Longer than Rate.currency allows, so PostgreSQL rejects the INSERT.
        too_long = RateEcbAdapter(
            USD_DATE, Element("Cube", {"currency": "TOOLONG", "rate": "1.0"})
        )
        with self.assertRaises(DataError):
            Rate.objects.bulk_import([good, too_long])
        self.assertEqual(Rate.objects.get().currency, "USD")


class TestBulkImport(TestCase):
    def setUp(self):
        element = Element("Cube", {"currency": "usd", "rate": "1.1883"})
        self.adapter = RateEcbAdapter(USD_DATE, element)

    def test_returns_created_count(self):
        self.assertEqual(Rate.objects.bulk_import([self.adapter]), 1)
        self.assertEqual(Rate.objects.bulk_import([self.adapter]), 0)

    def test_upper_currency(self):
        Rate.objects.bulk_import([self.adapter])
        self.assertEqual(Rate.objects.get().currency, "USD")

    @mock.patch("currencies.models.IMPORT_BATCH_SIZE", 1)
    def test_failure_keeps_earlier_batches(self):
        bad_element = Element("Cube", {"currency": "PLN", "rate": "N/A"})
        bad_adapter = RateEcbAdapter(USD_DATE, bad_element)
        with self.assertRaises(InvalidOperation):
            Rate.objects.bulk_import([self.adapter, bad_adapter])
        self.assertEqual(Rate.objects.get().currency, "USD")

    def test_sets_timestamps(self):
        Rate.objects.bulk_import([self.adapter])
        rate = Rate.objects.get()
        self.assertIsNotNone(rate.created)
        self.assertIsNotNone(rate.modified)
