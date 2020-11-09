from unittest import mock

import requests
from django.conf import settings
from django.test import TestCase

from ..fixtures import ECB_RESPONSE
from ..repositories import APIEcbRepository


class TestAPIEcbRepository(TestCase):
    @mock.patch.object(requests, "get")
    def test_call_api(self, mock_get):
        APIEcbRepository().call_api()
        mock_get.assert_called_once_with(settings.ECB_LAST_90_DAYS_RATES_URL)

    @mock.patch.object(requests, "get")
    def test_call_api_historic(self, mock_get):
        APIEcbRepository(True).call_api()
        mock_get.assert_called_once_with(settings.ECB_HISTORIC_RATES_URL)
