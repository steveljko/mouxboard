from flask import Flask, render_template, jsonify, request
import subprocess
import shlex
import logging
from threading import Lock

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

def send_pointer_move(x: int, y: int):
    """
    Move the pointer to screen coordinates using wlrctl.

    Args:
        x (int): X coordinate in pixels.
        y (int): Y coordinate in pixels.

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

def send_pointer_click(type):
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

def send_pointer_scroll(y):
    cmd = f"wlrctl pointer scroll {y}"
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

def send_key_press(key):
    """
    Types character or press special keys using wtype.
    
    Args:
        key (str): Character to type or special key name
        
    Special keys supported:
        - 'backspace' -> BackSpace
        - 'enter' -> Return
        - 'space' -> space
    """
    special_keys = {
        'backspace': 'BackSpace',
        'enter': 'Return',
        'space': 'space',
    }
    
    if key.lower() in special_keys:
        cmd = f"wtype -k {special_keys[key.lower()]}"
    else:
        cmd = f"wtype {shlex.quote(key)}"
    
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

@app.route('/move', methods=['POST'])
def move():
    data = request.get_json() or {}

    x = data.get('x')
    y = data.get('y')
    
    if x is None or y is None:
        return jsonify({"status": "error", "message": "Parameters 'x' and 'y' are required."}), 400
    
    try:
        x, y = int(x), int(y)
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Parameters 'x' and 'y' must be integers."}), 400
    
    ok, out = send_pointer_move(x, y)

    if ok:
        app.logger.info(f"Moving cursor: x={x}, y={y}")
        return jsonify({"status": "ok", "x": x, "y": y, "output": out}), 200
    else:
        app.logger.info("Moving cursor failed")
        return jsonify({"status": "error", "message": out}), 500

@app.route('/click', methods=['POST'])
def click():
    data = request.get_json() or {}

    type = data.get('type')

    if type is None:
        return jsonify({"status": "error", "message": "Parameter 'type' is required."}), 400

    if type not in ['left', 'right']:
        return jsonify({"status": "error", "message": "Parameter 'type' must be 'left' or 'right'."}), 400

    ok, out = send_pointer_click(type)

    if ok:
        app.logger.info("Click successful")
        return jsonify({"status": "ok"}), 200
    else:
        app.logger.info("Click failed")
        return jsonify({"status": "error", "message": out}), 500

@app.route('/scroll', methods=['POST'])
def scroll():
    data = request.get_json() or {}

    y = data.get('y')
    
    if y is None:
        return jsonify({"status": "error", "message": "Parameter 'y' is required."}), 400
    
    try:
        y = int(y)
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Parameter 'y' must be integer."}), 400

    ok, out = send_pointer_scroll(y)

    if ok:
        return jsonify({"status": "ok"}), 200
    else:
        return jsonify({"status": "error", "message": out}), 500

@app.route('/type', methods=['POST'])
def type():
    data = request.get_json() or {}

    key = data.get('key')

    if key is None:
        return jsonify({"status": "error", "message": "Parameter 'key' is required."}), 400

    if key.lower() in ['backspace', 'enter', 'space']:
        pass
    elif len(key) == 1:
        if not key.isprintable() and key not in [' ', '\t', '\n']:
            return jsonify({"status": "error", "message": "Parameter 'key' is invalid character."}), 400
    else:
        return jsonify({"status": "error", "message": "Parameter 'key' must be one character or special key."}), 400

    ok, out = send_key_press(key)

    if ok:
        return jsonify({"status": "ok"}), 200
    else:
        return jsonify({"status": "error", "message": out}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
