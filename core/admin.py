import csv
import datetime

from django.contrib import admin
from django.http import HttpResponse, HttpRequest


def export_to_csv(
    modeladmin: admin.ModelAdmin, request: HttpRequest, queryset
) -> HttpResponse:
    opts = modeladmin.model._meta
    response = HttpResponse(content_type="text/csv")
    response[
        "Content-Disposition"
    ] = "attachment; \
        filename={}.csv".format(
        opts.verbose_name
    )
    writer = csv.writer(response)

    fields = [
        field
        for field in opts.get_fields()
        if not field.many_to_many and not field.one_to_many
    ]
    # Save first row with columnn name.
    writer.writerow([field.verbose_name for field in fields])
    # Save record sets.
    for obj in queryset:
        data_row = []
        for field in fields:
            value = getattr(obj, field.name)
            if isinstance(value, datetime.datetime):
                value = value.strftime("%Y-%m-%d %H:%M")
            data_row.append(value)
        writer.writerow(data_row)
    return response


export_to_csv.short_description = "Export CSV"
