#!/bin/sh
# Generate runtime config from environment variables
# This allows VITE_API_URL to be set at runtime (not just build time)
cat <<EOF > /usr/share/nginx/html/config.js
window.__RUNTIME_CONFIG__ = {
  VITE_API_URL: "${VITE_API_URL:-}"
};
EOF

echo "Runtime config generated with VITE_API_URL=${VITE_API_URL:-not set}"

# Start nginx
exec nginx -g 'daemon off;'
