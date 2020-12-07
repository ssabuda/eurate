from datetime import date
from django.db import models

from core.models import TimeStampedModel


class RateManager(models.Manager):
    def newest(self, **kwargs):
        try:
            newest_date = self.latest("date").date
        except Rate.DoesNotExist:
            return self.filter()
        return self.filter(date=newest_date)

    def currency(self, currency: str, **kwargs):
        return self.filter(currency__iexact=currency)

    def date(self, date_value: date, **kwargs):
        return self.filter(date=date_value)

    def is_exists(self, date_value: date, currency: str, **kwargs) -> bool:
        currency = self.currency(currency)
        return currency.filter(date=date_value).exists()


class Rate(TimeStampedModel):
    currency = models.CharField(max_length=3, null=False, blank=False, db_index=True)
    date = models.DateField()
    rate = models.DecimalField(max_digits=12, decimal_places=4, blank=False, null=False)

    objects = RateManager()

    class Meta:
        verbose_name = "Currency rate"
        verbose_name_plural = "Currency rates"
        ordering = ("-date", "currency")
        index_together = ("currency", "date")
        unique_together = ("currency", "date")

    def save(self, *args, **kwargs):
        self.currency = self.currency.upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.date} - {self.currency} - {self.rate}"
