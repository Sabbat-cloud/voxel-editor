# app.py
from flask import Flask, jsonify, render_template, request, send_file
import numpy as np
import json
import os
import time

app = Flask(__name__)

# Ruta para guardar/cargar proyectos
PROJECTS_DIR = "projects" #Eliminar en prox versión ya que la carga y guardado se realizan desde el lado cliente
os.makedirs(PROJECTS_DIR, exist_ok=True)

# Variable global para el tamaño del grid (se puede cambiar)
GRID_SIZE = 16  # Valor por defecto
grid_data = np.zeros((GRID_SIZE, GRID_SIZE, GRID_SIZE), dtype=int)

# Paleta de colores prox version definir paletas por el usuario
COLOR_PALETTE = [
    0x00ff83,  # verde
    0xff5733,  # naranja
    0x5733ff,  # morado
    0xffff00,  # amarillo
    0xff0057,  # rosa
    0x33aaff,  # azul claro
    0xffd700,  # dorado
    0x8b4513,  # marrón
]

@app.route('/api/grid', methods=['GET'])
def get_grid():
    """Envía el estado actual de la cuadrícula al frontend."""
    return jsonify(grid_data.tolist())

@app.route('/api/update_voxel', methods=['POST'])
def update_voxel():
    """Recibe datos del frontend para añadir o eliminar un cubo."""
    data = request.get_json()
    x, y, z = data['x'], data['y'], data['z']
    color_index = data.get('color_index', 1)  # Por defecto, color 1 (verde)

    if 0 <= x < GRID_SIZE and 0 <= y < GRID_SIZE and 0 <= z < GRID_SIZE:
        grid_data[x, y, z] = color_index if color_index > 0 else 0
        return jsonify({
            'status': 'success',
            'x': x, 'y': y, 'z': z,
            'value': int(grid_data[x, y, z]),
            'color_index': color_index
        })

    return jsonify({'status': 'error', 'message': 'Coordinates out of bounds'}), 400

@app.route('/api/set_grid_size', methods=['POST'])
def set_grid_size():
    """Cambia el tamaño del grid y lo reinicia."""
    global grid_data, GRID_SIZE
    data = request.get_json()
    new_size = data.get('size', 16)

    if new_size not in [8, 16, 32, 64]:
        return jsonify({'status': 'error', 'message': 'Invalid grid size'}), 400

    GRID_SIZE = new_size
    grid_data = np.zeros((GRID_SIZE, GRID_SIZE, GRID_SIZE), dtype=int)
    return jsonify({'status': 'success', 'grid_size': GRID_SIZE})

@app.route('/api/save', methods=['POST'])
def save_project():
    """Guarda la cuadrícula actual como archivo JSON con nombre personalizado."""
    data = request.get_json()
    project_name = data.get('name', '').strip()
    if not project_name:
        project_name = f"project_{int(time.time())}"

    # Limpiar caracteres no seguros para nombres de archivo
    project_name = "".join(c for c in project_name if c.isalnum() or c in " _-").rstrip()
    if not project_name:
        project_name = f"project_{int(time.time())}"

    filename = f"{project_name}.json"
    filepath = os.path.join(PROJECTS_DIR, filename)

    # Evitar sobrescritura accidental
    counter = 1
    while os.path.exists(filepath):
        filename = f"{project_name}_{counter}.json"
        filepath = os.path.join(PROJECTS_DIR, filename)
        counter += 1

    project_data = {
        'grid': grid_data.tolist(),
        'grid_size': GRID_SIZE,
        'palette': COLOR_PALETTE
    }

    with open(filepath, 'w') as f:
        json.dump(project_data, f, indent=2)

    return jsonify({'status': 'success', 'filename': filename})

@app.route('/api/load/<filename>', methods=['GET'])
def load_project(filename):
    """Carga un proyecto guardado."""
    filepath = os.path.join(PROJECTS_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'status': 'error', 'message': 'File not found'}), 404

    with open(filepath, 'r') as f:
        data = json.load(f)

    global grid_data, GRID_SIZE
    GRID_SIZE = data.get('grid_size', 16)
    grid_data = np.array(data['grid'], dtype=int)

    return jsonify({
        'status': 'success',
        'grid': data['grid'],
        'grid_size': GRID_SIZE,
        'palette': data['palette']
    })

@app.route('/api/export/png', methods=['GET'])
def export_png():
    return jsonify({'status': 'info', 'message': 'Export PNG should be triggered from the client side.'})

@app.route('/')
def index():
    """Renderiza el archivo index.html que contiene la escena 3D."""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
