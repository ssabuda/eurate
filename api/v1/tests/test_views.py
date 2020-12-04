from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from currencies.factories import RateFactory, RateFactoryUSD, RateFactoryPLN


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
