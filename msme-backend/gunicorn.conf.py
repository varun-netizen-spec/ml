#!/usr/bin/env python3
"""
Gunicorn configuration for production deployment
"""

import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
backlog = 2048

# Worker processes
workers = 2  # Conservative for 512MB RAM
worker_class = "sync"
worker_connections = 1000
timeout = 120  # Increased timeout for ML model loading
keepalive = 2

# Restart workers after this many requests, to help control memory usage
max_requests = 1000
max_requests_jitter = 100

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "plant-disease-api"

# Memory and performance
preload_app = True  # Load application code before forking workers
enable_stdio_inheritance = True

# Security
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8192