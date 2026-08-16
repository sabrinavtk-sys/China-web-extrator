#!/bin/sh
exec gunicorn app:app --bind 0.0.0.0:${PORT:-8000}
