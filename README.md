![Django CI](https://github.com/ssabuda/eurate/workflows/Django%20CI/badge.svg)

# Eurate

## Euro exchange rate

This application allows you to download the Euro exchange rates. Is downloaded from
the [European Central Bank]("https://www.ecb.europa.eu/"). It allows you to download data from the entire history, or
for the last 90 days. The data can be downloaded as a CSV file in the administration panel. The data is also available
via API.

## Installation

I recommend using docker-compose, it is the fastest way to start the application:

- [install docker](https://docs.docker.com/engine/install/)
- [install docker-compose](https://docs.docker.com/compose/install/)
- build docker

    ```bash
    docker-compose build
    ```

- start dockers

    ```bash
    docker-compose up
    ```

- run bash in a running container

    ```bash
    docker-compose exec web bash
    ```

- run migrations

    ```bash
    ./manage migrate
    ```

App is running on [http://localhost:8000/](http://localhost:8000/)

## Create admin account

If you want to use the admin panel, you must first create a super user account. Run command:

```bash
./manage.py createsuperuser
```

next follow the instructions. Now you can access into [admin panel](http://localhost:8000/admin/)

## Import currency exchange rates

- import data from the last 90 days:
    ```bash
    ./manage.py run_ecb_import
    ```
- import data from the entire history:
    ```bash
  ./manage.py run_ecb_import --historic
    ```

## Download currency exchange rates as CSV file

- Go to [http://localhost:8000/admin/currencies/rate/](http://localhost:8000/admin/currencies/rate/)
- select rows
- select `Export CSV` from `Action` list
- click `Go`

example data:

```text
ID,created,modified,currency,date,rate
2161,2020-12-19 10:14,2020-12-19 10:14,AUD,2020-12-18,1.6107
2147,2020-12-19 10:14,2020-12-19 10:14,BGN,2020-12-18,1.9558
2162,2020-12-19 10:14,2020-12-19 10:14,BRL,2020-12-18,6.2668
2163,2020-12-19 10:14,2020-12-19 10:14,CAD,2020-12-18,1.5638
2155,2020-12-19 10:14,2020-12-19 10:14,CHF,2020-12-18,1.0845
```

## API

Two API endpoints are available:

- [http://localhost:8000/api/v1/rates/](http://localhost:8000/api/v1/rates/)
- [http://localhost:8000/api/v1/newest/](http://localhost:8000/api/v1/newest/)

example data:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "currency": "USD",
      "date": "2020-12-18",
      "rate": "1.2259"
    }
  ]
}
```

### Pagination

page size is set to `100`

### Filters

Two filters for `date` and `currency` are available i.e:

```text
http://localhost:8000/api/v1/rates/?currency=USD&date=2020-12-03
```
