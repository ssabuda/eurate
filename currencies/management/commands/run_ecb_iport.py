from django.core.management import BaseCommand

from currencies.tasks import run_import


class Command(BaseCommand):
    def add_arguments(self, parser):
        super(Command, self).add_arguments(parser)
        parser.add_argument("--historic", action="store_true")

    def handle(self, *args, **options):
        if options.get("historic"):
            run_import(True)
        else:
            run_import()
