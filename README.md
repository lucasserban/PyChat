# PyChat
web application that helps users communicate and share files easily with each other.

## Docker

Build the container image from the project root:

```bash
docker build -t pychat:latest .
```

Run the container and publish port 5000:

```bash
docker run -p 5000:5000 \
	-e SMTP_HOST="$SMTP_HOST" -e SMTP_PORT="$SMTP_PORT" -e SMTP_USER="$SMTP_USER" -e SMTP_PASS="$SMTP_PASS" -e EMAIL_FROM="$EMAIL_FROM" \
	pychat:latest
```

Notes:
- The app listens on port `5000` inside the container.
- If your app sends registration emails, configure SMTP using the environment variables shown above before running the container.
- Consider using `docker-compose` for local development if you need to set multiple environment variables or add a database service.

