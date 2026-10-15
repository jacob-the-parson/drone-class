"""The newest of everything, in one place.

The sensors and the modules publish here; the bridge reads from here and tells the
app. One lock, and a condition that wakes whoever is waiting for something new.
"""

import copy
import threading
import time


class Hub:
    def __init__(self):
        self._lock = threading.Lock()
        self._new = threading.Condition(self._lock)
        self._latest = {}
        self._seq = 0
        self._log = []

    def publish(self, kind, data):
        with self._new:
            self._seq += 1
            self._latest[kind] = {'seq': self._seq, 't': time.time(), 'data': data}
            self._new.notify_all()

    def say(self, text, level='info'):
        """A line for the app's log of what the Pi did."""
        with self._new:
            self._seq += 1
            self._log.append({'seq': self._seq, 't': time.time(), 'level': level, 'text': text})
            del self._log[:-200]
            self._new.notify_all()

    def get(self, kind, max_age_s=None):
        """The newest data of a kind, or None if there is none or it is older than max_age_s."""
        with self._lock:
            item = self._latest.get(kind)
            if item is None:
                return None
            if max_age_s is not None and time.time() - item['t'] > max_age_s:
                return None
            return item['data']

    def age(self, kind):
        with self._lock:
            item = self._latest.get(kind)
            return None if item is None else time.time() - item['t']

    def clear(self, kind):
        with self._new:
            self._latest.pop(kind, None)
            self._seq += 1
            self._new.notify_all()

    def since(self, seq):
        """Everything newer than `seq`: (newest seq, {kind: item}, [log lines])."""
        with self._lock:
            kinds = {k: copy.deepcopy(v) for k, v in self._latest.items() if v['seq'] > seq}
            log = [dict(x) for x in self._log if x['seq'] > seq]
            return self._seq, kinds, log

    def wait(self, seq, timeout):
        """Wait until something newer than `seq` is published, or the timeout."""
        with self._new:
            if self._seq <= seq:
                self._new.wait(timeout)
            return self._seq
