from datetime import date

from django.db import models
from django.db.models.functions import window

from core.models import TimeStampedModel
from currencies.constants import Price


class RateManager(models.Manager):
    def get_top_rates(self, price: Price):
        # A record is set the first time a rate is reached, so ties (e.g. a
        # pegged currency) resolve to the earliest date, never at random.
        if price.name == Price.EXPENSIVE.name:
            order_by = [models.F("rate").desc(), models.F("date").asc()]
        else:
            order_by = [models.F("rate").asc(), models.F("date").asc()]
        # Filtering on the window runs in the database, so the whole table is
        # never loaded into Python. Filters chained later (e.g. ?currency=)
        # go into the inner query, which is safe: the window partitions by currency.
        return (
            self.annotate(
                row_number=models.Window(
                    expression=window.RowNumber(),
                    partition_by=[models.F("currency")],
                    order_by=order_by,
                )
            )
            .filter(row_number=1)
            .order_by("currency")
        )

    def get_most_expensive(self):
        return self.get_top_rates(Price.EXPENSIVE)

    def get_cheapest(self):
        return self.get_top_rates(Price.CHEAPEST)

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
        indexes = [models.Index(fields=["currency", "date"])]
        unique_together = ("currency", "date")

    def save(self, *args, **kwargs):
        self.currency = self.currency.upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.date} - {self.currency} - {self.rate}"
