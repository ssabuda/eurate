from unittest import mock

from django.core.management import call_command
from django.test import TestCase


class TestCommandRunEcbImport(TestCase):
    @mock.patch("currencies.management.commands.run_ecb_import.run_import")
    def test_run_command_default(self, mock_run):
        call_command("run_ecb_import")
        mock_run.assert_called_once_with()

    @mock.patch("currencies.management.commands.run_ecb_import.run_import")
    def test_run_command_historic(self, mock_run):
        call_command("run_ecb_import", "--historic")
        mock_run.assert_called_once_with(True)
