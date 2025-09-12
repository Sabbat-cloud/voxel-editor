# Editor de Vóxeles 3D

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Un editor de vóxeles 3D basado en web, simple y potente, construido con Three.js en el frontend y un backend de Flask. Esta herramienta te permite crear, guardar y exportar arte con vóxeles directamente en tu navegador.


---

## ✨ Características

-   **Creación 3D de Vóxeles:** Añade y elimina vóxeles fácilmente en una parrilla tridimensional.
-   **Paleta de Colores:** Selecciona colores de un conjunto predefinido para pintar tus modelos.
-   **Tamaño de Grid Ajustable:** Cambia entre diferentes tamaños de parrilla (desde 8x8x8 hasta 64x64x64).
-   **Operaciones en el Cliente:** Guarda y carga tus proyectos como archivos `.json` directamente en tu máquina.
-   **Múltiples Formatos de Exportación:**
    -   Exporta tu escena como una imagen **`.png`**.
    -   Exporta el modelo 3D como un archivo binario **`.glb`**, listo para usar en motores de videojuegos y software 3D.
-   **Controles de Cámara Intuitivos:** Orbita, haz zoom y desplaza la cámara para ver tu creación desde cualquier ángulo.

---

## 🛠️ Tecnologías Utilizadas

-   **Frontend:**
    -   [Three.js](https://threejs.org/) para el renderizado 3D.
    -   JavaScript (ES Modules) gestionado con `importmap` (sin necesidad de un paso de compilación).
    -   HTML5 y CSS3.
-   **Backend:**
    -   [Flask](https://flask.palletsprojects.com/) (Python) como un servidor de API ligero.
    -   [NumPy](https://numpy.org/) para la gestión eficiente de la parrilla en el servidor.

---

## 🚀 Cómo Empezar

Sigue estas instrucciones para tener una copia local funcionando.

### Prerrequisitos

-   Python 3.x
-   pip (instalador de paquetes de Python)

### Instalación

1.  **Clona el repositorio:**
    ```sh
    git clone [https://github.com/tu-usuario/tu-repositorio.git](https://github.com/tu-usuario/tu-repositorio.git)
    cd tu-repositorio
    ```

2.  **Crea y activa un entorno virtual (recomendado):**
    ```sh
    # Para Windows
    python -m venv venv
    venv\Scripts\activate

    # Para macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Instala los paquetes de Python requeridos:**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Ejecuta la aplicación Flask:**
    ```sh
    python app.py
    ```

5.  **Abre tu navegador** y visita `http://127.0.0.1:5000` para empezar a crear.

---

## 🕹️ Cómo Usar

Los controles son sencillos y se muestran en la pantalla:

-   **Rotar Cámara:** Click Izquierdo + Arrastrar
-   **Zoom:** Rueda del Ratón
-   **Mover Cámara:** Click Derecho + Arrastrar
-   **Añadir Cubo:** `Shift` + Click Izquierdo
-   **Eliminar Cubo:** `Ctrl` + Click Izquierdo

---

## 🗺️ Hoja de Ruta (Roadmap)

Este proyecto tiene una base muy sólida. Aquí hay algunas ideas para futuras mejoras:

-   **Optimización de Rendimiento:** Implementar `InstancedMesh` para mejorar drásticamente el rendimiento del renderizado con un gran número de vóxeles.
-   **Herramientas Avanzadas:** Añadir herramientas de construcción más potentes como "línea", "caja" y "bote de pintura (relleno)".
-   **Paleta de Colores Personalizable:** Permitir a los usuarios añadir, editar y guardar sus propias paletas de colores.
-   **Mejoras de UI/UX:** Pulir la interfaz de usuario para una experiencia más profesional.

---

## 📜 Licencia

Este proyecto está distribuido bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.
