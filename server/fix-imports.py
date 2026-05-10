#!/usr/bin/env python3
"""
Add .js extensions to all relative imports in TypeScript files.
Required for ES modules compatibility.
"""

import os
import re
from pathlib import Path

def fix_imports_in_file(filepath):
    """Add .js extension to relative imports in a TypeScript file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match relative imports (starting with . or ..)
    # Matches both single and double quotes
    # Don't add .js if it's already there
    patterns = [
        # Single quotes: from './path'
        (r"from\s+['\"](\./[^'\"]+?)['\"]", r"from '\1.js'"),
        (r"from\s+['\"](\.\./[^'\"]+?)['\"]", r"from '\1.js'"),
    ]
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    
    # Remove any double .js.js that might have been added
    content = content.replace('.js.js', '.js')
    
    # Only write if something changed
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    src_dir = Path('src')
    files_modified = 0
    
    for ts_file in src_dir.rglob('*.ts'):
        if fix_imports_in_file(ts_file):
            files_modified += 1
            print(f"✓ {ts_file}")
    
    print(f"\n{files_modified} files modified")

if __name__ == '__main__':
    main()
