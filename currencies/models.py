from datetime import date

from django.db import models
from django.db.models.functions import window

from core.models import TimeStampedModel
from currencies.constants import EUR, Price

# Cross rates keep more decimals than the 4 stored; the API rounds them.
CROSS_RATE_FIELD = models.DecimalField(max_digits=30, decimal_places=12)


class RateManager(models.Manager):
    def in_base(self, base: str = EUR):
        """
        Rates against `base`, on the same date; `code` is the other currency.

        For the euro, `value` is what the ECB publishes: how much of the
        currency one euro buys. For any other base it is the price of one unit
        of the currency in `base` (1 USD = 3.90 PLN), the way rates are quoted
        in most countries: base rate / rate, as only rates against the euro
        are stored.

        The base's own row would be 1 and is not listed; it stands in for the
        euro instead (its stored rate is the euro's price in the base), so EUR
        gets one row per date without a UNION, which filters and windows can't
        use. Dates the base wasn't fixed on are left out.
        """
        if base == EUR:
            return self.annotate(code=models.F("currency"), value=models.F("rate"))
        base_fixings = self.model.objects.filter(currency=base)
        base_rate = models.Subquery(
            base_fixings.filter(date=models.OuterRef("date")).values("rate")[:1]
        )
        # A semi-join on the base's dates, not a filter on `base_rate`, which
        # would repeat the subquery in WHERE for every row.
        return (
            self.filter(date__in=base_fixings.values("date"))
            .annotate(base_rate=base_rate)
            .annotate(
                code=models.Case(
                    models.When(currency=base, then=models.Value(EUR)),
                    default=models.F("currency"),
                    output_field=models.CharField(),
                ),
                value=models.Case(
                    models.When(currency=base, then=models.F("rate")),
                    default=models.F("base_rate") / models.F("rate"),
                    output_field=CROSS_RATE_FIELD,
                ),
            )
            .order_by("-date", "code")
        )

    def get_top_rates(self, price: Price, base: str = EUR):
        # A record is set the first time a rate is reached, so ties (e.g. a
        # pegged currency) resolve to the earliest date, never at random.
        if price.name == Price.EXPENSIVE.name:
            order_by = [models.F("value").desc(), models.F("date").asc()]
        else:
            order_by = [models.F("value").asc(), models.F("date").asc()]
        # Filtering on the window runs in the database, so the whole table is
        # never loaded into Python. Filters chained later (e.g. ?currency=)
        # go into the inner query, which is safe: the window partitions by
        # currency. The stored column, not `code`: the groups are the same
        # (one maps to the other one to one), and partitioning needn't
        # evaluate a CASE. Ordering by `value` still does in another base.
        return (
            self.in_base(base)
            .annotate(
                row_number=models.Window(
                    expression=window.RowNumber(),
                    partition_by=[models.F("currency")],
                    order_by=order_by,
                )
            )
            .filter(row_number=1)
            .order_by("code")
        )

    def get_most_expensive(self, base: str = EUR):
        return self.get_top_rates(Price.EXPENSIVE, base)

    def get_cheapest(self, base: str = EUR):
        return self.get_top_rates(Price.CHEAPEST, base)

    def newest(self, base: str = EUR, **kwargs):
        # The newest date the base was fixed on, so a discontinued base still
        # shows its last fixing.
        fixings = self.all() if base == EUR else self.filter(currency=base)
        try:
            newest_date = fixings.latest("date").date
        except Rate.DoesNotExist:
            return self.in_base(base).none()
        return self.in_base(base).filter(date=newest_date)

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
