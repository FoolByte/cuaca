"""Simple retry with exponential backoff — no extra dependency."""

import logging
import time
from typing import Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Default delay between any two successful calls (rate-limit guard)
_DEFAULT_CALL_DELAY: float = 0.6  # seconds — BMKG ~1 req/s safe margin


def retry_with_backoff(
    fn: Callable[..., T],
    *args,
    max_retries: int = 5,
    base_delay: float = 2.0,
    is_rate_limit: Callable[[Exception], bool] | None = None,
    **kwargs,
) -> T:
    """Call *fn* up to max_retries times with exponential backoff.

    On rate-limit (429) errors the back-off uses a longer base (5×).

    Raises the last exception if all retries are exhausted.
    """
    last_exc: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            result = fn(*args, **kwargs)
            # Enforce a small gap so we don't hammer the API
            time.sleep(_DEFAULT_CALL_DELAY)
            return result
        except Exception as exc:
            last_exc = exc
            rate_limited = (
                is_rate_limit(exc) if is_rate_limit else _is_429(exc)
            )
            extra = 5.0 if rate_limited else 1.0
            if attempt < max_retries:
                delay = base_delay * extra * (2 ** (attempt - 1))
                logger.warning(
                    "Attempt %d/%d failed: %s — retrying in %.1fs",
                    attempt,
                    max_retries,
                    exc,
                    delay,
                )
                time.sleep(delay)
            else:
                logger.error(
                    "Attempt %d/%d failed: %s — giving up",
                    attempt,
                    max_retries,
                    exc,
                )
    raise last_exc  # type: ignore[misc]


def _is_429(exc: Exception) -> bool:
    """Check if exception is an HTTP 429."""
    import requests
    if isinstance(exc, requests.exceptions.HTTPError):
        return exc.response is not None and exc.response.status_code == 429
    return False
