from unittest import mock
from django.test import TestCase

from .test_adapter import TestEcbAdapterMixin
from ..facade import RateFacade
from ..factories import RateFactoryUSD
from ..fixtures import ECB_RESPONSE
from ..models import Rate
from ..repository import APIEcbRepository
from ..tasks import create_rate, run_import


class TestRunImport(TestCase):
    @mock.patch("currencies.tasks.create_rate")
    @mock.patch.object(APIEcbRepository, "call_api")
    def test_run(self, mock_api, mock_create):
        mock_api.return_value = ECB_RESPONSE
        run_import()
        self.assertEqual(mock_create.call_count, 2048)


class TestCreateRate(TestEcbAdapterMixin):
    def test_create(self):
        create_rate(self.adapter)
        model = Rate.objects.get(currency=self.adapter.currency, date=self.adapter.date)
        # then
        self.assertEqual(model.rate, self.adapter.rate)
        self.assertEqual(
            model.pk,
            Rate.objects.get(currency=self.adapter.currency, date=self.adapter.date).pk,
        )

    @mock.patch.object(RateFacade, "create")
    def test_create_exists(self, mock_create):
        RateFactoryUSD(date=self.adapter.date)
        create_rate(self.adapter)
        mock_create.assert_not_called()
