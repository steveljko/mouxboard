from flask import Flask, render_template, jsonify
import subprocess
import shlex
import logging
from threading import Lock

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

def move_cursor(x: int, y: int):
    """
    Move the pointer to screen coordinates using the wlrctl.

    Args:
        x (int): Target X coordinate in pixels.
        y (int): Target Y coordinate in pixels.

    Returns:
        tuple[bool, str]: (success, output)

    Notes:
        - Requires `wlrctl` available on PATH and permissions to move the pointer.
        - Uses a 5-second timeout for the subprocess.
    """
    cmd = f"wlrctl pointer move {int(x)} {int(y)}"
    args = shlex.split(cmd)
    try:
        completed = subprocess.run(
            args,
            check=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        return True, completed.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip() or e.stdout.strip()
    except Exception as e:
        return False, str(e)

def click_using_cursor():
    """
    asd
    """
    cmd = f"wlrctl pointer click"
    args = shlex.split(cmd)
    try:
        completed = subprocess.run(
            args,
            check=True,
            capture_output=True,
            text=True,
            timeout=5
        )
        return True, completed.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip() or e.stdout.strip()
    except Exception as e:
        return False, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/move/<x>/<y>', methods=['GET'])
def move(x, y):
    ok, out = move_cursor(x, y)
    if ok:
        app.logger.info(f"Moving cursor: x={x}, y={y}")
        return jsonify({"status": "ok", "x": x, "y": y, "output": out}), 200
    else:
        app.logger.info("Moving cursor failed")
        return jsonify({"status": "error", "message": out}), 500

@app.route('/click', methods=['GET'])
def click():
    ok, out = click_using_cursor()
    if ok:
        app.logger.info("Click successful")
        return jsonify({"status": "ok"}), 200
    else:
        app.logger.info("Click failed")
        return jsonify({"status": "error", "message": out}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
