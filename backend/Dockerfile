FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies from pyproject.toml
COPY pyproject.toml .
RUN pip install .[dev]

# Copy app code
COPY api/ api/
COPY migrations/ migrations/
COPY contracts/ contracts/
COPY tools/ tools/
COPY tests/ tests/
COPY alembic.ini .

# Expose port (Render uses PORT env var, default 8000 for local)
EXPOSE 8000

# Command to run the app - uses PORT env var if set (for Render), else 8000
CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
