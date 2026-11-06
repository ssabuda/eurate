from unittest import mock

import requests
from django.conf import settings
from django.test import TestCase

from ..adapter import RateEcbAdapter
from ..fixtures import ECB_RESPONSE
from ..repository import REQUEST_TIMEOUT_SECONDS, APIEcbRepository


class TestAPIEcbRepository(TestCase):
    @mock.patch.object(requests, "get")
    def test_call_api(self, mock_get):
        APIEcbRepository().call_api()
        mock_get.assert_called_once_with(
            settings.ECB_LAST_90_DAYS_RATES_URL, timeout=REQUEST_TIMEOUT_SECONDS
        )

    @mock.patch.object(requests, "get")
    def test_call_api_historic(self, mock_get):
        APIEcbRepository(True).call_api()
        mock_get.assert_called_once_with(
            settings.ECB_HISTORIC_RATES_URL, timeout=REQUEST_TIMEOUT_SECONDS
        )

    @mock.patch.object(requests, "get")
    def test_call_api_http_error(self, mock_get):
        mock_get.return_value.raise_for_status.side_effect = requests.HTTPError
        with self.assertRaises(requests.HTTPError):
            APIEcbRepository().call_api()

    def test_get_rates(self):
        rates = APIEcbRepository().get_rates(ECB_RESPONSE)
        rate = next(rates)
        self.assertIsInstance(rate, RateEcbAdapter)

    @mock.patch.object(APIEcbRepository, "call_api")
    def test_all_count(self, mock_api):
        mock_api.return_value = ECB_RESPONSE

        count = 0
        rates = APIEcbRepository().all()
        for _ in rates:
            count += 1
        self.assertEqual(count, 2048)
