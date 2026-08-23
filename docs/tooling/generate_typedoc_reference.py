"""mkdocs build hook: regenerate the TypeDoc reference before every build.

server.md/frontend.md link into docs/reference/ (TypeDoc's static HTML
output, see docs/tooling/README.md for why we don't use mkdocstrings-typescript
inline rendering). That output has to exist *before* mkdocs scans docs_dir,
otherwise the links are left unresolved and 404 once published — running it
here means there's no separate manual step to forget.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Any

from mkdocs.exceptions import PluginError

# TypeDoc's readme rendering copies whatever repo files the root README.md links to
# (e.g. CONTRIBUTING.md) into docs/reference/media/ verbatim. Those files' own links are
# written relative to the repo root (correct there, and on GitHub) but break once mkdocs
# resolves them relative to their new home two directories deep — rewrite them here rather
# than degrading the source files' links for the sake of this generated copy.
_DOCS_LINK_RE = re.compile(r"(\]\()docs/")


def _fix_media_links(media_dir: Path) -> None:
    if not media_dir.is_dir():
        return
    for md_file in media_dir.glob("*.md"):
        original = md_file.read_text()
        fixed = _DOCS_LINK_RE.sub(r"\1../../", original)
        if fixed != original:
            md_file.write_text(fixed)


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

    _fix_media_links(repo_root / "docs" / "reference" / "media")
