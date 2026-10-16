
import logging

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import Request

from app.routes.api import router


logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="GazeGuide TV Backend",
    description=(
        "Educational scene metadata and grounded explanations "
        "for the GazeGuide TV application."
    ),
    version="1.0.0",
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request,
    exc: RequestValidationError,
):
    return JSONResponse(
        status_code=422,
        content={
            "error_code": "INVALID_REQUEST",
            "message": "Please check the request fields and try again.",
            "fallback": True,
        },
    )


app.include_router(router)
