import datetime
from decimal import Decimal
from xml.etree.ElementTree import Element

from core.abstract.adapter import RateAdapter


class RateEcbAdapter(RateAdapter):
    def __init__(self, date_init: datetime.date, data: Element):
        self.date_init = date_init
        self.data = data

    @property
    def date(self) -> datetime.date:
        return self.date_init

    @property
    def currency(self) -> str:
        return self.data.get("currency")

    @property
    def rate(self) -> Decimal:
        return Decimal(self.data.get("rate"))

    def to_dict(self) -> dict:
        return {"currency": self.currency, "date": self.date, "rate": self.rate}
