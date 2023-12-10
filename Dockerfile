FROM python:3.11-buster
ENV PYTHONUNBUFFERED=1
RUN mkdir /code
WORKDIR /code
COPY requirements.txt /code/
RUN apt-get update \
  && apt-get install -y postgresql-client python-psycopg2 gettext
RUN pip install -r requirements.txt
COPY . /code/
