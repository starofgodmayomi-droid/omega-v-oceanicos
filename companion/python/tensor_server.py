#!/usr/bin/env python3
"""FastAPI NumPy companion for the bounded 4D DAV tensor contract."""
from __future__ import annotations

import os

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

SUPPORTED_SIZES = {4, 6, 8}
app = FastAPI(title="Oceanicos Python Tensor Daemon", version="1.0")


def tensor_payload(size: int) -> dict[str, object]:
    if size not in SUPPORTED_SIZES:
        raise ValueError("size must be one of 4, 6, 8")
    indices = np.indices((size, size, size, size), dtype=np.int64)
    tensor = indices.sum(axis=0)
    matrix = tensor.reshape(size * size, size * size)
    return {
        "size": size,
        "shape_4d": list(tensor.shape),
        "shape_2d": list(matrix.shape),
        "min_val": int(tensor.min()),
        "max_val": int(tensor.max()),
        "checksum": int(tensor.sum()),
        "matrix_2d": matrix.tolist(),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "OBSERVED", "service": "python-tensor-daemon"}


@app.get("/tensor/{size}", response_model=None)
def tensor(size: int) -> dict[str, object] | JSONResponse:
    if size not in SUPPORTED_SIZES:
        return JSONResponse(
            status_code=400,
            content={"status": "DIVERGENT", "error": "TENSOR_SIZE_UNSUPPORTED", "supportedSizes": sorted(SUPPORTED_SIZES)},
        )
    return tensor_payload(size)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "tensor_server:app",
        host=os.getenv("OCEANICOS_PYTHON_HOST", "127.0.0.1"),
        port=int(os.getenv("OCEANICOS_PYTHON_PORT", "8088")),
        reload=False,
    )
