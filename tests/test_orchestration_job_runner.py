"""SIGTERM drain test for job_runner.main()."""

from __future__ import annotations

import asyncio
import importlib
import signal
import sys
import time
import types
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


def test_job_runner_sigterm_drains_workers(monkeypatch):
    sb = FakeSupabase()
    stop_order: list[str] = []
    instances: dict[str, list] = {
        "feeder": [],
        "upstream": [],
        "dispatcher": [],
        "downstream": [],
        "finalizer": [],
        "metrics": [],
    }

    class _LoopingComponent:
        kind = "component"

        def __init__(self, *args, **kwargs):
            self._stopped = asyncio.Event()
            self.stop_calls = 0
            self.exited = False
            self.busy = False
            self.active = 0
            instances[self.kind].append(self)

        def stop(self):
            self.stop_calls += 1
            stop_order.append(self.kind)
            self._stopped.set()

        async def run(self):
            while not self._stopped.is_set():
                await asyncio.sleep(0.01)
            self.exited = True

    class _Feeder(_LoopingComponent):
        kind = "feeder"

    class _Upstream(_LoopingComponent):
        kind = "upstream"

    class _Dispatcher(_LoopingComponent):
        kind = "dispatcher"

    class _Downstream(_LoopingComponent):
        kind = "downstream"

    class _Finalizer(_LoopingComponent):
        kind = "finalizer"

    class _Metrics(_LoopingComponent):
        kind = "metrics"

    _install_module(monkeypatch, "dotenv", load_dotenv=lambda: None)
    _install_module(
        monkeypatch,
        "supabase",
        Client=object,
        create_client=lambda *_a, **_kw: sb,
    )
    monkeypatch.setenv("SUPABASE_URL", "https://example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setenv("POD_URL", "https://pod.invalid")
    monkeypatch.setenv("POD_AUTH_TOKEN", "token")

    _install_module(
        monkeypatch,
        "src.orchestration.recovery",
        run_recovery_pass=(lambda *args, **kwargs: asyncio.sleep(0)),
    )
    _install_module(
        monkeypatch,
        "src.orchestration.feeder",
        Feeder=_Feeder,
        make_bootstrap_callable=lambda *_a, **_kw: (lambda *_args, **_kwargs: asyncio.sleep(0)),
    )
    _install_module(
        monkeypatch,
        "src.orchestration.upstream_worker",
        UpstreamWorker=_Upstream,
    )
    _install_module(
        monkeypatch,
        "src.orchestration.video_dispatcher",
        VideoDispatcher=_Dispatcher,
    )
    _install_module(
        monkeypatch,
        "src.orchestration.downstream_worker",
        make_downstream_workers=lambda *_a, **_kw: [_Downstream(), _Downstream()],
    )
    _install_module(
        monkeypatch,
        "src.orchestration.finalizer",
        Finalizer=_Finalizer,
    )
    _install_module(
        monkeypatch,
        "src.orchestration.observability",
        MetricsReporter=_Metrics,
    )

    import job_runner

    importlib.reload(job_runner)
    job_runner.sb = sb
    job_runner._shutdown = asyncio.Event()

    original_install = job_runner._install_signal_handlers

    def _install(loop):
        original_install(loop)
        loop.call_later(0.05, lambda: signal.raise_signal(signal.SIGTERM))

    monkeypatch.setattr(job_runner, "_install_signal_handlers", _install)

    started = time.monotonic()
    _run(job_runner.main())
    elapsed = time.monotonic() - started

    assert elapsed < 5.0
    assert stop_order[0] == "feeder"
    assert stop_order.count("upstream") == 1
    assert stop_order.count("dispatcher") == 1
    assert stop_order.count("finalizer") == 1
    assert stop_order.count("metrics") == 1
    assert stop_order.count("downstream") == 2
    assert all(component.exited for group in instances.values() for component in group)
