from __future__ import annotations

import json
import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))


def test_poll_task_fail_path_preserves_raw_failure_body(monkeypatch):
    from cloud_engines.image_engine import kie_common

    raw_body = {
        "code": 200,
        "data": {
            "taskId": "task-kie-123",
            "state": "fail",
            "failCode": "400",
            "failMsg": "Prompt rejected",
            "requestId": "req-kie-456",
            "resultJson": None,
        },
    }

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return raw_body

    class FakeClient:
        def __init__(self, **_kwargs):
            return None

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def get(self, *_args, **_kwargs):
            return FakeResponse()

    monkeypatch.setattr(kie_common.httpx, "Client", FakeClient)

    result = kie_common._poll_task(
        "task-kie-123",
        {"Authorization": "Bearer test-key"},
    )

    assert result["success"] is False
    assert result["fail_code"] == "400"
    assert "400" in result["error_message"]
    assert "Prompt rejected" in result["error_message"]
    assert result["request_id"] == "task-kie-123"
    assert json.loads(result["response_body"]) == raw_body
