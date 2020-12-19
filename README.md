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

## Import exchange rates

- import data from the last 90 days:
    ```bash
    ./manage.py run_ecb_import
    ```
- import data from the entire history:
    ```bash
  ./manage.py run_ecb_import --historic
    ```
