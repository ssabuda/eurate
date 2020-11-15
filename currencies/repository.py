from datetime import datetime
from typing import Optional, Iterator
from xml.etree import ElementTree

import requests
from django.conf import settings

from core.abstract.repository import APIRepository
from .adapter import RateEcbAdapter
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
        for elements in data:
            date_value = datetime.strptime(elements.get("time"), "%Y-%m-%d").date()
            for element in elements:
                yield RateEcbAdapter(date_value, element)

    def all(self) -> Iterator[RateEcbAdapter]:
        api_data = self.call_api()
        return self.get_rates(api_data)
