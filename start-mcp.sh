#!/bin/bash
# Start Oracle MCP Server (stdio transport)
# Used by Claude Code's MCP client config

cd "$(dirname "$0")"
exec "$HOME/.bun/bin/bun" src/index.ts "$@"
