from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__, static_folder='.')
CORS(app)

ARCHIVO_JSON = 'productos.json'

def leer_datos():
    if not os.path.exists(ARCHIVO_JSON):
        return {"productos": [], "historial_compras": []}
    with open(ARCHIVO_JSON, 'r', encoding='utf-8') as f:
        return json.load(f)

def guardar_datos(datos):
    with open(ARCHIVO_JSON, 'w', encoding='utf-8') as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)

# Servir la página web principal
@app.route('/')
def inicio():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def archivos_estaticos(path):
    return send_from_directory('.', path)

# Endpoint para registrar compras y actualizar métricas de autoaprendizaje
@app.route('/registrar-compra', methods=['POST'])
def registrar_compra():
    nueva_compra = request.json
    datos = leer_datos()

    # 1. Guardar la compra en el historial
    datos['historial_compras'].append(nueva_compra)

    # 2. Autoaprendizaje: incrementar el contador de ventas de cada producto comprado
    for item_comprado in nueva_compra.get('items', []):
        for prod in datos['productos']:
            if prod['id'] == item_comprado['id']:
                prod['ventas'] = prod.get('ventas', 0) + item_comprado['cantidad']

    guardar_datos(datos)
    return jsonify({"estado": "ok", "mensaje": "Compra registrada y catálogo actualizado"})

if __name__ == '__main__':
    print("Servidor iniciado en http://127.0.0.1:5000")
    app.run(debug=True, port=5000)