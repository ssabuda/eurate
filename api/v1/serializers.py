from rest_framework import serializers

from currencies.models import Rate


class RateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rate
        fields = ("currency", "date", "rate")
