#!/usr/bin/env python3
"""Run the complete Summit room in the foreground (Linux, Python standard library)."""
import argparse
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / 'paperweights/room/server.py'


def previous_servers(port):
    """Only replace this checkout's room server on this port, never unrelated apps."""
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        try:
            args = (proc / 'cmdline').read_bytes().decode().split('\0')[:-1]
            cwd = (proc / 'cwd').resolve()
            if not any((cwd / arg).resolve() == SERVER for arg in args[1:] if not arg.startswith('-')):
                continue
            old_port = 8688
            for i, arg in enumerate(args):
                if arg == '--port':
                    old_port = int(args[i + 1])
                elif arg.startswith('--port='):
                    old_port = int(arg.split('=', 1)[1])
            if old_port == port:
                yield int(proc.name)
        except (OSError, ValueError, IndexError):
            continue


def stop_previous(port):
    for pid in list(previous_servers(port)):
        print(f'Restarting Summit server {pid}', flush=True)
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            continue
    deadline = time.monotonic() + 5
    while list(previous_servers(port)):
        if time.monotonic() > deadline:
            raise RuntimeError('Previous server did not stop; refusing to start a duplicate')
        time.sleep(.1)


def addresses():
    found = [('Local', '127.0.0.1')]
    try:
        interfaces = json.loads(subprocess.check_output(['ip', '-j', '-4', 'addr', 'show'], text=True))
        for interface in interfaces:
            name = interface['ifname']
            if name.startswith(('lo', 'docker', 'br-', 'veth')):
                continue
            label = 'Tailscale' if name.startswith('tailscale') else 'Wi-Fi' if name.startswith(('wl', 'wlan')) else 'LAN'
            for address in interface.get('addr_info', []):
                if address.get('scope') == 'global':
                    found.append((label, address['local']))
    except (OSError, ValueError, subprocess.CalledProcessError):
        print('Could not detect interface addresses; use this machine’s LAN/Tailscale IP.', flush=True)
    return found


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8688)
    parser.add_argument('--bots', type=int, default=5)
    args = parser.parse_args()
    stop_previous(args.port)
    # Fail before building if another application owns the port.
    with socket.socket() as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(('0.0.0.0', args.port))
    child = subprocess.Popen([sys.executable, '-B', str(SERVER), '--port', str(args.port), '--bots', str(args.bots)], cwd=ROOT, start_new_session=True)
    def stop(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop)
    try:
        deadline = time.monotonic() + 60
        while child.poll() is None:
            try:
                with urlopen(f'http://127.0.0.1:{args.port}/api/room', timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                pass
            if time.monotonic() > deadline:
                raise RuntimeError('Summit server did not become ready within 60 seconds')
            time.sleep(.2)
        if child.poll() is not None:
            return child.returncode
        print('\nSUMMIT - Sentences / Rover / Households', flush=True)
        for label, address in addresses():
            print(f'{label}\n  Host:     http://{address}:{args.port}/\n  Audience: http://{address}:{args.port}/audience', flush=True)
        print('\nCtrl+C stops Summit. Restarting resets the live room.\n', flush=True)
        return child.wait()
    except KeyboardInterrupt:
        print('\nStopping Summit', flush=True)
        return 0
    finally:
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, RuntimeError) as exc:
        sys.exit(f'Summit: {exc}')
