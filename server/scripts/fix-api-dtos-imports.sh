#!/bin/bash
# Fix import/export paths in all .ts files in api-dtos to use .js extension

set -e

TARGET_DIR="$(dirname "$0")/../src/web/dtos"

find "$TARGET_DIR" -type f -name '*.ts' | while read -r file; do
  # Replace import/export paths that don't already end with .js
  sed -i -E "s/(from ['\"][^'\"]+)(['\"])/\1.js\2/g" "$file"
done
