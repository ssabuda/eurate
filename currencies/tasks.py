import logging
from typing import Optional

from .adapter import RateEcbAdapter
from .facade import RateFacade
from .models import Rate
from .repository import APIEcbRepository

logger = logging.getLogger(__name__)


def run_import(historic: Optional[bool] = False):
    logger.info("Start task run_import historical=%s", historic)
    for adapter in APIEcbRepository(historic).all():
        create_rate(adapter)
    logger.info("End task run_import")


def create_rate(adapter: RateEcbAdapter):
    if Rate.objects.is_exists(adapter.date, adapter.currency):
        logger.debug(
            "Skipped exists Rate currency=%s date=%s", adapter.currency, adapter.date
        )
        return
    RateFacade(adapter).create()
    logger.info("Rate created currency=%s date=%s", adapter.currency, adapter.date)
