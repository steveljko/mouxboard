from flask import Flask, render_template, jsonify
import subprocess
import shlex
import logging
from threading import Lock

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

def move_cursor(x: int, y: int):
    """
    Move the pointer to screen coordinates using wlrctl.

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

def click_using_cursor(type):
    """
    Performs mouse click using wlrctl. 

    Args:
        type (str): Click type - must be either 'left' or 'right'

    Returns:
        tuple: (success: bool, message: str)

    Raises:
        ValueError: If type is not 'left' or 'right'
    """
    if type not in ('left', 'right'):
        raise ValueError(f"Invalid click type '{type}'. Must be 'left' or 'right'.")

    cmd = f"wlrctl pointer click {type}"
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

def scroll_using_cursor(x):
    cmd = f"wlrctl pointer scroll {x}"
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

@app.route('/click/<type>', methods=['GET'])
def click(type):
    ok, out = click_using_cursor(type)
    if ok:
        app.logger.info("Click successful")
        return jsonify({"status": "ok"}), 200
    else:
        app.logger.info("Click failed")
        return jsonify({"status": "error", "message": out}), 500

@app.route('/scroll/<x>', methods=['GET'])
def scroll(x):
    ok, out = scroll_using_cursor(x)
    if ok:
        return jsonify({"status": "ok"}), 200
    else:
        return jsonify({"status": "error", "message": out}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
