from enum import Enum

ECB_XML_NAMESPACE = {
    "gesmes": "http://www.gesmes.org/xml/2002-08-01",
    "eurofxref": "http://www.ecb.int/vocabulary/2002-08-01/eurofxref",
}


class Price(Enum):
    CHEAPEST = "cheapest"
    EXPENSIVE = "expensive"

# Every ECB rate is quoted against the euro, so it is the default base.
EUR = "EUR"
