from abc import ABC, abstractmethod
from collections.abc import Iterator
from typing import Any

from core.abstract.adapter import RateAdapter


class APIRepository(ABC):
    @abstractmethod
    def call_api(self):
        pass

    @abstractmethod
    def get_rates(self, data_api: Any) -> Iterator[RateAdapter]:
        pass

    @abstractmethod
    def all(self) -> Iterator[RateAdapter]:
        pass
