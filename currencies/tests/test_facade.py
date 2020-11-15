from currencies.exceptions import RateAlreadyExists
from currencies.facade import RateFacade
from currencies.factories import RateFactoryUSD
from currencies.models import Rate
from currencies.tests.test_adapter import TestEcbAdapterMixin


class TestRateFacade(TestEcbAdapterMixin):
    def test_create(self):
        # given
        facade = RateFacade(self.adapter)
        # when
        facade.create()
        # and
        model = Rate.objects.get(currency=self.adapter.currency, date=self.adapter.date)
        # then
        self.assertEqual(model.rate, self.adapter.rate)
        self.assertEqual(
            model.pk,
            Rate.objects.get(currency=self.adapter.currency, date=self.adapter.date).pk,
        )

    def test_already_exists(self):
        # given
        RateFactoryUSD(date=self.adapter.date)
        facade = RateFacade(self.adapter)
        # when, then
        with self.assertRaises(RateAlreadyExists):
            facade.create()
