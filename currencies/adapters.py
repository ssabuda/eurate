import datetime
from decimal import Decimal
from xml.etree.ElementTree import Element

from core.abstract.adapters import RateAdapter


class RateEcbAdapter(RateAdapter):
    def __init__(self, date: datetime.date, data: Element):
        self.date = date
        self.data = data

    @property
    def date_value(self) -> datetime.date:
        return self.date

    @property
    def currency(self) -> str:
        return self.data.get("currency")

    @property
    def rate(self) -> Decimal:
        return Decimal(self.data.get("rate"))

    def to_dict(self) -> dict:
        return {"currency": self.currency, "date": self.date_value, "rate": self.rate}
