"""Helpers for multipart file uploads."""

from __future__ import annotations

from typing import Annotated

from fastapi import File, HTTPException, UploadFile

OptionalUploadFiles = Annotated[list[UploadFile] | None, File()]


def collect_upload_files(
    image: UploadFile | None,
    files: list[UploadFile] | None,
) -> list[UploadFile]:
    """Merge optional single `image` and repeated `files` form fields."""
    uploads: list[UploadFile] = []
    if image is not None and image.filename:
        uploads.append(image)
    if files:
        for upload in files:
            if upload.filename:
                uploads.append(upload)
    if not uploads:
        raise HTTPException(status_code=400, detail="At least one media file is required")
    return uploads
