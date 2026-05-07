# -*- coding: utf-8 -*-
"""
Pony Poll — persistent Splunk REST handler.
Handles writing poll answer events to a Splunk index.
Exposed under /services/ponypoll/v1/* via Splunk Web proxy.
"""
from __future__ import print_function

import json
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse

_APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
_LIB = os.path.join(_APP_ROOT, "lib")
if _LIB not in sys.path:
    sys.path.insert(0, _LIB)

import splunklib.client as client  # noqa: E402
from splunk.persistconn.application import PersistentServerConnectionApplication  # noqa: E402


def _splunk_connect(session_key):
    uri = os.environ.get("SPLUNKD_URI", "https://127.0.0.1:8089")
    u = urlparse(uri)
    scheme = u.scheme or "https"
    host = u.hostname or "127.0.0.1"
    port = u.port or 8089
    return client.connect(
        scheme=scheme,
        host=host,
        port=port,
        splunkToken=session_key,
    )


def _json_response(payload, status=200):
    return {"payload": json.dumps(payload), "status": status}


def _err(msg, status=400):
    return _json_response({"ok": False, "error": msg}, status)


def _parse_body(req):
    for key in ("payload", "rawPayload", "raw_payload", "body"):
        blob = req.get(key)
        if not blob:
            continue
        if isinstance(blob, (dict, list)):
            return blob
        if isinstance(blob, (bytes, bytearray)):
            blob = blob.decode("utf-8", errors="replace")
        try:
            return json.loads(blob)
        except Exception:
            return None
    return None


def _request_tail(req):
    """Return the path segment after /ponypoll/v1."""
    for key in ("path_info", "path", "fullPath"):
        val = req.get(key)
        if val:
            val = str(val)
            idx = val.find("/v1")
            if idx >= 0:
                return val[idx + 3:].lstrip("/") or ""
    u = urlparse(req.get("url") or "")
    if u.path:
        idx = u.path.find("/v1")
        if idx >= 0:
            return u.path[idx + 3:].lstrip("/") or ""
    return ""


class PonyPollRest(PersistentServerConnectionApplication):
    def __init__(self, command_line=None, command_arg=None):
        super().__init__(command_line, command_arg)

    def handle(self, in_string):
        try:
            req = json.loads(in_string)
            method = req.get("method", "GET").upper()
            tail = _request_tail(req)
            session_key = req.get("session", {}).get("authtoken") or req.get("authtoken", "")

            if tail == "health" or tail == "":
                return _json_response({"ok": True, "app": "ponypollapp"})

            if tail == "answer" and method == "POST":
                return self._handle_answer(req, session_key)

            return _err(f"Unknown endpoint: /{tail}", 404)
        except Exception as exc:
            return _err(f"Internal error: {exc}", 500)

    def _handle_answer(self, req, session_key):
        """Accept a poll answer event and write it to the configured Splunk index."""
        body = _parse_body(req)
        if not body:
            return _err("Missing or invalid JSON body")

        target_index = body.get("index", "ponypoll")
        if not target_index or not isinstance(target_index, str):
            return _err("'index' field is required")

        # Build the event payload — all fields from the body except 'index'
        event_data = {k: v for k, v in body.items() if k != "index"}
        event_data.setdefault("_time", datetime.now(timezone.utc).isoformat())

        try:
            svc = _splunk_connect(session_key)
            idx = svc.indexes[target_index]
            idx.submit(
                json.dumps(event_data),
                sourcetype="ponypoll_answer",
                source="ponypoll_app",
            )
            return _json_response({"ok": True, "index": target_index})
        except KeyError:
            return _err(f"Index '{target_index}' not found", 400)
        except Exception as exc:
            return _err(f"Failed to write event: {exc}", 500)
