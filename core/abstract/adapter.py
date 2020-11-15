from abc import ABC, abstractmethod
import datetime
from decimal import Decimal


class RateAdapter(ABC):
    @property
    @abstractmethod
    def currency(self) -> str:
        pass

    @property
    @abstractmethod
    def date(self) -> datetime.date:
        pass

    @property
    @abstractmethod
    def rate(self) -> Decimal:
        pass

    @abstractmethod
    def to_dict(self) -> dict:
        pass
