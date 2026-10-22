from decimal import Decimal

from rest_framework import serializers

from currencies.constants import EUR
from currencies.models import Rate

# ECB rates have 5-6 significant digits, so a cross rate can't honestly
# carry more. Zeros pad it towards the 4 decimals stored rates have, so
# rates read alike ("4.3000", not "4.3"), but never past those digits: a
# padded zero would claim precision the rate doesn't have.
CROSS_RATE_DIGITS = 6
MIN_DECIMALS = 4


def significant(value: Decimal, digits: int) -> str:
    exponent = value.adjusted() - digits + 1
    rounded = value.quantize(Decimal(1).scaleb(exponent)).normalize()
    padded = max(-MIN_DECIMALS, exponent)
    if rounded.as_tuple().exponent > padded:
        rounded = rounded.quantize(Decimal(1).scaleb(padded))
    return format(rounded, "f")


class RateSerializer(serializers.ModelSerializer):
    # Rows from RateManager.in_base carry `code` and `value`; a plain Rate is
    # read against the euro.
    currency = serializers.SerializerMethodField()
    rate = serializers.SerializerMethodField()

    class Meta:
        model = Rate
        fields = ("currency", "date", "rate")

    def get_currency(self, obj) -> str:
        return getattr(obj, "code", obj.currency)

    def get_rate(self, obj) -> str:
        # Against the euro, and the euro's own price in another base (the
        # base's stored rate, see RateManager.in_base), are ECB fixings as
        # published; only cross rates are rounded.
        if self.context.get("base", EUR) == EUR or obj.code == EUR:
            return str(obj.rate)
        return significant(obj.value, CROSS_RATE_DIGITS)
