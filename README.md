# Mouxboard

## Overview

As a former KDE user, I missed KDE Connect's remote input features. Mouxboard is my solution — a lightweight, web-based tool that provides mouse and keyboard control for Wayland desktops directly from the browser, with no additional client required.

## Features

- **Browser-based control** – No client installation required
- **Real-time input** – Low-latency mouse and keyboard events

## Tech Stack

- **Backend:** Python (Flask)
- **Frontend:** HTML/CSS/JS

## Requirements

- Wayland-based window manager
- `wlrctl` – Wayland compositor control utility
- `wtype` – Wayland keyboard input tool
- Python 3.x
