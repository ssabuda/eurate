![Django CI](https://github.com/ssabuda/eurate/workflows/Django%20CI/badge.svg)

# Eurate

## Euro exchange rate

This application allows you to download the Euro exchange rates. Is downloaded from
the [European Central Bank]("https://www.ecb.europa.eu/"). It allows you to download data from the entire history, or
for the last 90 days. The data can be downloaded as a CSV file in the administration panel. The data is also available
via API and in a web frontend with three screens:

- **Today's rates** – the newest ECB fixing for every currency, day-on-day change and a EUR converter
- **History** – a chart and daily fixings of one currency, with the highest and lowest rate on record
- **Records** – record high and low for every currency and where today's rate sits between them

## Installation

I recommend using Docker Compose, it is the fastest way to start the application:

- [install docker](https://docs.docker.com/engine/install/) (Compose is included as `docker compose`)
- build docker

    ```bash
    docker compose build
    ```

- start dockers

    ```bash
    docker compose up
    ```

The frontend is running on [http://localhost:5173/](http://localhost:5173/), the API and
the [admin panel](http://localhost:8000/admin/) on [http://localhost:8000/](http://localhost:8000/).

## Import currency exchange rates

- import data from the last 90 days:
    ```bash
    docker compose run --rm web python manage.py run_ecb_import
    ```
- import data from the entire history:
    ```bash
    docker compose run --rm web python manage.py run_ecb_import --historic
    ```

The *History* chart ranges longer than 3 months and the *Records* screen only make sense after the
historic import – with 90 days of data every record is from the last 90 days.

## Frontend

React + Vite in plain JavaScript, in the `frontend/` directory. It runs in the `frontend` service
(`node:26-alpine`), which installs dependencies on start (`npm ci`) and serves the Vite dev server with hot reload.
Node only runs in Docker; the container writes `frontend/` as uid/gid 1000. If your user has another id, start it with
`UID=$(id -u) GID=$(id -g) docker compose up`.

- [React Query](https://tanstack.com/query) fetches and caches API data, [React Router](https://reactrouter.com/)
  handles the pages; search, sorting and chart range live in the URL
- styles are CSS Modules with design tokens in `src/styles/tokens.css`, no UI library
- Vite proxies `/api` to the `web` service, so the frontend calls `/api/v1/...` without CORS

```text
frontend/src/
├── api/          # API client and React Query hooks
├── components/   # layout, chart, tables, shared UI
├── lib/          # formatting, currency names, rate calculations
├── pages/        # Today's rates, History, Records
└── styles/       # tokens, global styles, shared UI classes
```

## Tests

- backend:
    ```bash
    docker compose run --rm web python manage.py test
    ```
- frontend (Vitest, the API is mocked so no backend is needed):
    ```bash
    docker compose run --rm --no-deps frontend npm test
    ```
- frontend in watch mode, while `docker compose up` is running:
    ```bash
    docker compose exec frontend npm run test:watch
    ```
- frontend lint, tests and production build – the same as CI:
    ```bash
    docker compose run --rm --no-deps frontend sh -c "npm run lint && npm test && npm run build"
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

Four API endpoints are available:

- [http://localhost:8000/api/v1/rates/](http://localhost:8000/api/v1/rates/) – all rates, newest first
- [http://localhost:8000/api/v1/newest/](http://localhost:8000/api/v1/newest/) – rates of the newest fixing
- [http://localhost:8000/api/v1/topprice/](http://localhost:8000/api/v1/topprice/) – the highest rate on record for each currency
- [http://localhost:8000/api/v1/lowestprice/](http://localhost:8000/api/v1/lowestprice/) – the lowest rate on record for each currency

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

### Filters

All endpoints filter by `currency`. `rates` also filters by `date`, and by a date range with
`date__gte`, `date__lte` and `date__lt`, i.e:

```text
http://localhost:8000/api/v1/rates/?currency=USD&date=2020-12-03
http://localhost:8000/api/v1/rates/?currency=USD&date__gte=2020-01-01&date__lte=2020-12-31
```

### Pagination

Results are paginated with `limit` (default 100) and `offset`:

```text
http://localhost:8000/api/v1/rates/?currency=USD&limit=10&offset=20
```
