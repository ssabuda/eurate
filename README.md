![Django CI](https://github.com/ssabuda/eurate/workflows/Django%20CI/badge.svg)

# Eurate

## Euro exchange rate

This application allows you to download the Euro exchange rate. Is downloaded from
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
