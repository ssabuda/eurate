from datetime import date
from django.urls import reverse, resolve
from rest_framework import status
from rest_framework.test import APITestCase

from currencies.factories import RateFactoryUSD, RateFactoryPLN, RateFactory
from ..views import RateList, RateNewestList


class TestRateList(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        RateFactoryUSD.create_batch(2)
        RateFactoryPLN.create_batch(2)
        cls.url = reverse("api:rates")

    def test_status_code(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_count(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], 4)
        self.assertEqual(len(response.data["results"]), 4)

    def test_filter_currency(self):
        url = reverse("api:rates") + "?currency=PLN"
        response = self.client.get(url)
        self.assertEqual(response.data["count"], 2)
        self.assertSetEqual({c["currency"] for c in response.data["results"]}, {"PLN"})

    def test_url_resolves_to_view(self):
        resolver_match = resolve(self.url)
        self.assertEqual(resolver_match.func.cls, RateList)


class TestRateListDateRange(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        for day in (1, 2, 3, 4):
            RateFactoryUSD.create(date=date(2026, 10, day))
        RateFactoryPLN.create(date=date(2026, 10, 3))
        cls.url = reverse("api:rates")

    def get_dates(self, query):
        response = self.client.get(f"{self.url}?{query}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return sorted(r["date"] for r in response.data["results"])

    def test_filter_date_exact(self):
        self.assertEqual(
            self.get_dates("date=2026-10-03"), ["2026-10-03", "2026-10-03"]
        )

    def test_filter_date_gte(self):
        self.assertEqual(
            self.get_dates("currency=USD&date__gte=2026-10-03"),
            ["2026-10-03", "2026-10-04"],
        )

    def test_filter_date_lte(self):
        self.assertEqual(
            self.get_dates("currency=USD&date__lte=2026-10-02"),
            ["2026-10-01", "2026-10-02"],
        )

    def test_filter_date_lt(self):
        self.assertEqual(
            self.get_dates("currency=USD&date__lt=2026-10-02"), ["2026-10-01"]
        )

    def test_filter_date_range(self):
        self.assertEqual(
            self.get_dates("currency=USD&date__gte=2026-10-02&date__lte=2026-10-03"),
            ["2026-10-02", "2026-10-03"],
        )


class TestRateNewestList(APITestCase):
    NEWEST_COUNT = 2
    NEWEST_DATE = date(2099, 12, 31)

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        RateFactory.create_batch(cls.NEWEST_COUNT, date=cls.NEWEST_DATE)
        RateFactory.create_batch(4)
        cls.url = reverse("api:newest")

    def test_status_code(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_count(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], self.NEWEST_COUNT)
        self.assertEqual(len(response.data["results"]), self.NEWEST_COUNT)

    def test_newest_date(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data["count"], self.NEWEST_COUNT)
        self.assertSetEqual(
            {c["date"] for c in response.data["results"]}, {str(self.NEWEST_DATE)}
        )

    def test_url_resolves_to_view(self):
        resolver_match = resolve(self.url)
        self.assertEqual(resolver_match.func.cls, RateNewestList)


class TestRateTopAndLowestPrice(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        for day, rate in ((1, "1.1000"), (2, "1.5000"), (3, "1.3000")):
            RateFactoryUSD.create(date=date(2026, 10, day), rate=rate)
        for day, rate in ((1, "4.0000"), (2, "4.5000")):
            RateFactoryPLN.create(date=date(2026, 10, day), rate=rate)

    def get_results(self, name, query=""):
        response = self.client.get(f"{reverse(name)}{query}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data

    def test_topprice_one_record_per_currency(self):
        data = self.get_results("api:topprice")
        self.assertEqual(data["count"], 2)
        self.assertEqual(
            [(r["currency"], r["rate"], r["date"]) for r in data["results"]],
            [("PLN", "4.5000", "2026-10-02"), ("USD", "1.5000", "2026-10-02")],
        )

    def test_lowestprice_one_record_per_currency(self):
        data = self.get_results("api:lowestprice")
        self.assertEqual(
            [(r["currency"], r["rate"]) for r in data["results"]],
            [("PLN", "4.0000"), ("USD", "1.1000")],
        )

    def test_tie_resolves_to_first_date(self):
        RateFactory.create(currency="BGN", date=date(2026, 10, 3), rate="1.9558")
        RateFactory.create(currency="BGN", date=date(2026, 10, 1), rate="1.9558")
        RateFactory.create(currency="BGN", date=date(2026, 10, 2), rate="1.9558")
        for name in ("api:topprice", "api:lowestprice"):
            data = self.get_results(name, "?currency=BGN")
            self.assertEqual(data["results"][0]["date"], "2026-10-01")

    def test_topprice_filter_currency(self):
        data = self.get_results("api:topprice", "?currency=USD")
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["rate"], "1.5000")

    def test_lowestprice_filter_currency(self):
        data = self.get_results("api:lowestprice", "?currency=PLN")
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["rate"], "4.0000")


class TestApiRootVIew(APITestCase):
    def test_status(self):
        response = self.client.get(reverse("api:root"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_data_rates(self):
        response = self.client.get(reverse("api:root"))
        self.assertContains(response, "currency rates")

    def test_data_newest(self):
        response = self.client.get(reverse("api:root"))
        self.assertContains(response, "newest currency rates")
