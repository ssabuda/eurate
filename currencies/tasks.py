import logging

from .models import Rate
from .repository import APIEcbRepository

logger = logging.getLogger(__name__)


def run_import(historic: bool | None = False):
    logger.info("Start task run_import historical=%s", historic)
    created = Rate.objects.bulk_import(APIEcbRepository(historic).all())
    logger.info("End task run_import created=%s", created)
