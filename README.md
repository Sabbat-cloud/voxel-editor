# 3D Voxel Editor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A simple and powerful web-based 3D voxel editor built with Three.js on the frontend and a Flask backend. This tool allows you to create, save, and export 3D voxel art directly in your browser.


---

## ✨ Features

-   **3D Voxel Creation:** Easily add and remove voxels in a 3D grid.
-   **Color Palette:** Select from a predefined set of colors to paint your models.
-   **Adjustable Grid Size:** Switch between different grid sizes (8x8x8 up to 64x64x64).
-   **Client-Side Operations:** Save and load your projects as `.json` files directly on your machine.
-   **Multiple Export Formats:**
    -   Export your scene as a **`.png`** image.
    -   Export the 3D model as a binary **`.glb`** file, ready for use in game engines and 3D software.
-   **Intuitive Camera Controls:** Orbit, zoom, and pan the camera to view your creation from any angle.

---

## 🛠️ Tech Stack

-   **Frontend:**
    -   [Three.js](https://threejs.org/) for 3D rendering.
    -   JavaScript (ES Modules) managed via `importmap` (no build step needed).
    -   HTML5 & CSS3.
-   **Backend:**
    -   [Flask](https://flask.palletsprojects.com/) (Python) as a lightweight API server.
    -   [NumPy](https://numpy.org/) for efficient grid management on the server.

---

## 🚀 Getting Started

Follow these instructions to get a local copy up and running.

### Prerequisites

-   Python 3.x
-   pip (Python package installer)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/your-repository-name.git](https://github.com/your-username/your-repository-name.git)
    cd your-repository-name
    ```

2.  **Create and activate a virtual environment (recommended):**
    ```sh
    # For Windows
    python -m venv venv
    venv\Scripts\activate

    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **Install the required Python packages:**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Run the Flask application:**
    ```sh
    python app.py
    ```

5.  **Open your browser** and navigate to `http://127.0.0.1:5000` to start creating!

---

## 🕹️ How to Use

The controls are simple and are displayed on the screen:

-   **Rotate Camera:** Left Click + Drag
-   **Zoom:** Mouse Wheel
-   **Pan Camera:** Right Click + Drag
-   **Add Voxel:** `Shift` + Left Click
-   **Remove Voxel:** `Ctrl` + Left Click

---

## 🗺️ Roadmap

This project has a solid foundation. Here are some ideas for future improvements:

-   **Performance Optimization:** Implement `InstancedMesh` to drastically improve rendering performance with a large number of voxels.
-   **Advanced Tools:** Add more powerful building tools like "line", "box", and "paint bucket (fill)".
-   **Customizable Color Palette:** Allow users to add, edit, and save their own color palettes.
