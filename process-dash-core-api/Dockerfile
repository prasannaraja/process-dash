FROM python:3.11-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY ./app /code/app
COPY ./migrations /code/migrations
COPY ./alembic.ini /code/alembic.ini
COPY ./start.sh /code/start.sh

EXPOSE 8000

# start.sh runs `alembic upgrade head` then starts uvicorn
CMD ["sh", "start.sh"]
