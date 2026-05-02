#!/bin/bash

# Note: This script is deprecated. Use the separate scripts instead:
#   ./dev-server-start.sh   - Start backend in one terminal
#   ./dev-frontend-start.sh - Start frontend in another terminal
#
# This allows better output visibility and avoids process management issues.

echo "⚠️  This script is deprecated."
echo ""
echo "Please use the separate scripts instead:"
echo ""
echo "  Terminal 1: ./dev-server-start.sh"
echo "  Terminal 2: ./dev-frontend-start.sh"
echo ""
echo "This gives you:"
echo "  ✅ Cleaner output (no interleaved logs)"
echo "  ✅ Better control (stop/restart services independently)"
echo "  ✅ No process management issues with Vite"
echo ""
exit 1
