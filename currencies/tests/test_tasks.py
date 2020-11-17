from unittest import mock
from django.test import TestCase

from ..fixtures import ECB_RESPONSE
from ..repository import APIEcbRepository
from ..tasks import create_rate, run_import


class TestRunImport(TestCase):
    @mock.patch("currencies.tasks.create_rate")
    @mock.patch.object(APIEcbRepository, "call_api")
    def test_run(self, mock_api, mock_create):
        mock_api.return_value = ECB_RESPONSE
        run_import()
        self.assertEqual(mock_create.call_count, 2048)
