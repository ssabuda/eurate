from django.contrib import admin

from core.admin import export_to_csv
from .models import Rate


@admin.register(Rate)
class RateAdmin(admin.ModelAdmin):
    list_display = ("created", "modified", "date", "currency", "rate")
    list_filter = ("currency", "date")
    actions = (export_to_csv,)
