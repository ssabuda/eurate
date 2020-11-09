from datetime import datetime
from typing import Optional, Iterator
from xml.etree import ElementTree

import requests
from django.conf import settings

from core.abstract.repositories import APIRepository
from .adapters import RateEcbAdapter
from .constants import ECB_XML_NAMESPACE


class APIEcbRepository(APIRepository):
    def __init__(self, historic: Optional[bool] = False):
        self.historic = historic

    def call_api(self) -> bytes:
        url = (
            settings.ECB_HISTORIC_RATES_URL
            if self.historic
            else settings.ECB_LAST_90_DAYS_RATES_URL
        )
        return requests.get(url).content

    def get_rates(self, api_data: bytes) -> Iterator[RateEcbAdapter]:
        xml_data = ElementTree.fromstring(api_data)
        data = xml_data.findall(
            "./eurofxref:Cube/eurofxref:Cube[@time]", ECB_XML_NAMESPACE
        )
        for d in data:
            date_value = datetime.strptime(d.get("time"), "%Y-%m-%d").date()
            for element in list(d):
                yield RateEcbAdapter(date_value, element)

    def all(self) -> Iterator[RateEcbAdapter]:
        api_data = self.call_api()
        return self.get_rates(api_data)
