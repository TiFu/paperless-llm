#!/bin/bash

# Script to add .js extensions to all relative imports in TypeScript files
# This is required for ES modules

echo "Adding .js extensions to TypeScript imports..."

# Find all .ts files and add .js to relative imports
find src -name "*.ts" -type f -exec sed -i "s/from '\(\.\..*\)'/from '\1.js'/g" {} \;
find src -name "*.ts" -type f -exec sed -i 's/from "\(\.\..*\)"/from "\1.js"/g' {} \;

# Remove any double .js.js extensions that might have been accidentally added
find src -name "*.ts" -type f -exec sed -i 's/\.js\.js/.js/g' {} \;

echo "Done! Extensions added to all relative imports."
