"""mkdocs build hook: mirror server/docs/openapi.yaml into docs_dir.

mkdocs-redoc-tag resolves <redoc src="..."/> relative to the documentation
source tree, so the spec (whose source of truth is server/docs/openapi.yaml,
served at runtime by redoc-express) needs a copy inside docs_dir at build time
rather than being duplicated by hand.
"""

from __future__ import annotations

import shutil
from pathlib import Path
from typing import Any


def on_pre_build(config: dict[str, Any], **kwargs: Any) -> None:
    repo_root = Path(config["config_file_path"]).resolve().parent
    source = repo_root / "server" / "docs" / "openapi.yaml"
    destination = Path(config["docs_dir"]) / "openapi.yaml"
    shutil.copy2(source, destination)
