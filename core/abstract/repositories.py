from abc import ABC, abstractmethod
from typing import Any, Iterable

from core.abstract.adapters import RateAdapter


class APIRepository(ABC):
    @abstractmethod
    def call_api(self):
        pass

    @abstractmethod
    def get_rates(self, data_api: Any) -> Iterable[RateAdapter]:
        pass

    @abstractmethod
    def all(self) -> Iterable[RateAdapter]:
        pass