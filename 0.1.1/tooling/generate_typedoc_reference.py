"""mkdocs build hook: regenerate the TypeDoc reference before every build.

server.md/frontend.md link into docs/reference/ (TypeDoc's static HTML
output, see docs/tooling/README.md for why we don't use mkdocstrings-typescript
inline rendering). That output has to exist *before* mkdocs scans docs_dir,
otherwise the links are left unresolved and 404 once published — running it
here means there's no separate manual step to forget.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from mkdocs.exceptions import PluginError


def on_pre_build(config: dict[str, Any], **kwargs: Any) -> None:
    repo_root = Path(config["config_file_path"]).resolve().parent
    typedoc_bin = repo_root / "node_modules" / ".bin" / "typedoc"
    if not typedoc_bin.exists():
        raise PluginError(
            f"{typedoc_bin} not found — run `npm install` at the repo root first."
        )

    result = subprocess.run(
        [str(typedoc_bin)],
        cwd=repo_root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise PluginError(
            "TypeDoc reference generation failed:\n"
            f"{result.stdout}\n{result.stderr}"
        )
