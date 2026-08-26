FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY django_backend/requirements.txt ./django_backend/requirements.txt
RUN pip install --no-cache-dir -r django_backend/requirements.txt
COPY django_backend/ ./django_backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
# Static collection does not access the database, but Django requires a database
# setting while loading its configuration during the image build.
RUN DATABASE_URL=postgresql://postgres:placeholder@localhost:5432/postgres python django_backend/manage.py collectstatic --no-input

CMD python django_backend/manage.py migrate --no-input && gunicorn --chdir django_backend --bind 0.0.0.0:${PORT:-10000} ecoconnect_core.wsgi:application
