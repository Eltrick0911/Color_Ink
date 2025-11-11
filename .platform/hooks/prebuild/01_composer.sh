#!/bin/bash -xe
# Ensure composer dependencies are installed on the EB instance
if command -v composer >/dev/null 2>&1; then
  composer install --no-interaction --prefer-dist --no-dev -o || true
else
  # Fallback: download composer locally for install
  php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
  php composer-setup.php --install-dir=/usr/local/bin --filename=composer || true
  rm -f composer-setup.php || true
  composer install --no-interaction --prefer-dist --no-dev -o || true
fi
