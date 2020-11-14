from core.abstract.adapters import RateAdapter
from .exceptions import RateAlreadyExists
from .models import Rate


class RateFacade:
    def __init__(self, adapter: RateAdapter):
        self.adapter = adapter

    def create(self) -> Rate:
        if Rate.objects.is_exists(self.adapter.date, self.adapter.currency):
            raise RateAlreadyExists()
        # unpack adapter dict to Rate Instance
        rate = Rate(**self.adapter.to_dict())
        rate.save()
        return rate
