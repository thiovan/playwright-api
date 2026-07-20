#!/bin/bash
export DISPLAY=:99
Xvfb :99 -screen 0 1280x720x16 &
sleep 1
x11vnc -display :99 -nopw -forever -shared -bg
websockify --web=/usr/share/novnc/ 8080 localhost:5900 &
exec "$@"
