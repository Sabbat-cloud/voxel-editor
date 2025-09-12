// static/js/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// --- CONFIGURACIÓN BÁSICA ---
let gridSize = 16; // Tamaño actual del grid (se actualiza desde el backend)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3b4c);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(gridSize / 2, gridSize / 2, gridSize * 2); // Ajuste dinámico

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('scene-container').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// --- LUCES ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(gridSize / 2, gridSize, gridSize / 2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// --- AYUDAS VISUALES ---
let gridHelper, axesHelper;

function createGridHelpers() {
    // Eliminar helpers anteriores si existen
    if (gridHelper) scene.remove(gridHelper);
    if (axesHelper) scene.remove(axesHelper);

    gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x888888, 0x444444);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    axesHelper = new THREE.AxesHelper(gridSize / 4);
    scene.add(axesHelper);

    // Ajustar cámara según tamaño
    camera.position.set(gridSize / 2, gridSize / 2, gridSize * 2);
    camera.lookAt(gridSize / 2, 0, gridSize / 2);
}

createGridHelpers();

// --- PALETA DE COLORES ---
const COLOR_PALETTE = [
    0x00ff83, // verde
    0xff5733, // naranja
    0x5733ff, // morado
    0xffff00, // amarillo
    0xff0057, // rosa
    0x33aaff, // azul claro
    0xffd700, // dorado
    0x8b4513, // marrón
];

const colorNames = ['Verde', 'Naranja', 'Morado', 'Amarillo', 'Rosa', 'Azul Claro', 'Dorado', 'Marrón'];

// Crear botones de paleta
const paletteDiv = document.getElementById('color-palette');
let selectedColorIndex = 0;

COLOR_PALETTE.forEach((color, index) => {
    const button = document.createElement('button');
    button.style.width = '30px';
    button.style.height = '30px';
    button.style.border = '2px solid #444';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = `#${color.toString(16).padStart(6, '0')}`;
    button.style.cursor = 'pointer';
    button.title = colorNames[index];
    button.addEventListener('click', () => {
        selectedColorIndex = index;
        document.getElementById('selected-color').textContent = colorNames[index];
        document.querySelectorAll('#color-palette button').forEach(b => b.style.border = '2px solid #444');
        button.style.border = '2px solid white';
    });
    paletteDiv.appendChild(button);
});

// Seleccionar el primero por defecto
document.querySelectorAll('#color-palette button')[0].style.border = '2px solid white';

// --- LÓGICA DE VÓXELES ---
const voxels = new Map();

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);

function getCubeMaterial(colorIndex) {
    if (colorIndex === 0) return null;
    const color = COLOR_PALETTE[colorIndex - 1];
    return new THREE.MeshLambertMaterial({ color: color });
}

function addVoxel(x, y, z, colorIndex) {
    const material = getCubeMaterial(colorIndex);
    if (!material) return;

    const voxel = new THREE.Mesh(cubeGeometry, material);
    voxel.position.set(x, y, z);
    voxel.castShadow = true;
    voxel.receiveShadow = true;
    const key = `${x},${y},${z}`;
    voxels.set(key, { mesh: voxel, colorIndex });
    scene.add(voxel);
}

function removeVoxel(x, y, z) {
    const key = `${x},${y},${z}`;
    if (voxels.has(key)) {
        const { mesh } = voxels.get(key);
        scene.remove(mesh);
        voxels.delete(key);
    }
}

async function loadInitialGrid() {
    const response = await fetch('/api/grid');
    const gridData = await response.json();

    // Limpiar escena
    voxels.clear();
    scene.children = scene.children.filter(child => !child.isMesh || child !== gridHelper && child !== axesHelper);

    // Re-crear vóxeles
    for (let x = 0; x < gridData.length; x++) {
        for (let y = 0; y < gridData[x].length; y++) {
            for (let z = 0; z < gridData[x][y].length; z++) {
                const colorIndex = gridData[x][y][z];
                if (colorIndex > 0) {
                    addVoxel(
                        x - gridSize / 2,
                        y,
                        z - gridSize / 2,
                        colorIndex
                    );
                }
            }
        }
    }
}

// --- INICIALIZAR GRID DESDE EL SERVIDOR ---
async function initializeGrid() {
    const response = await fetch('/api/grid');
    const gridData = await response.json();
    gridSize = gridData.length; // Asumimos que es cuadrado y homogéneo
    createGridHelpers();
    loadInitialGrid();
}

initializeGrid();

// --- INTERACCIÓN CON EL RATÓN ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);

window.addEventListener('mousedown', async (event) => {
    if (!event.shiftKey && !event.ctrlKey) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const action = event.shiftKey ? 'add' : (event.ctrlKey ? 'remove' : null);
    if (!action) return;

    let finalPosition;

    const intersects = raycaster.intersectObjects(Array.from(voxels.values()).map(v => v.mesh));

    if (intersects.length > 0) {
        const hit = intersects[0];
        const hitObject = hit.object;

        if (action === 'add') {
            const normal = hit.face.normal;
            finalPosition = hitObject.position.clone().add(normal);
        } else {
            finalPosition = hitObject.position;
        }
    } else if (action === 'add') {
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(plane, intersection);
        finalPosition = new THREE.Vector3(
            Math.floor(intersection.x) + 0.5,
            0,
            Math.floor(intersection.z) + 0.5
        );
    }

    if (finalPosition) {
        const backendX = Math.round(finalPosition.x + gridSize / 2 - 0.5);
        const backendY = Math.round(finalPosition.y);
        const backendZ = Math.round(finalPosition.z + gridSize / 2 - 0.5);

        const colorIndex = action === 'add' ? selectedColorIndex + 1 : 0;

        const response = await fetch('/api/update_voxel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: backendX, y: backendY, z: backendZ, color_index: colorIndex }),
        });

        const result = await response.json();

        if (result.status === 'success') {
            const displayX = result.x - gridSize / 2;
            const displayY = result.y;
            const displayZ = result.z - gridSize / 2;

            if (result.value > 0) {
                addVoxel(displayX, displayY, displayZ, result.value);
            } else {
                removeVoxel(displayX, displayY, displayZ);
            }
        }
    }
});

// --- CONTROL DE GRID SIZE ---
document.getElementById('grid-size-select').addEventListener('change', async (e) => {
    const newSize = parseInt(e.target.value);
    const response = await fetch('/api/set_grid_size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: newSize })
    });
    const result = await response.json();
    if (result.status === 'success') {
        gridSize = result.grid_size;
        createGridHelpers();
        loadInitialGrid();
    }
});

document.getElementById('reset-grid-btn').addEventListener('click', async () => {
    const currentSize = parseInt(document.getElementById('grid-size-select').value);
    const response = await fetch('/api/set_grid_size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ size: currentSize })
    });
    const result = await response.json();
    if (result.status === 'success') {
        gridSize = result.grid_size;
        createGridHelpers();
        loadInitialGrid();
    }
});

// --- GUARDAR PROYECTO DIRECTAMENTE EN EL CLIENTE (sin servidor) ---
document.getElementById('save-btn').addEventListener('click', () => {
    const projectName = document.getElementById('project-name-input').value.trim();
    if (!projectName) {
        alert("Por favor, ingresa un nombre para el proyecto.");
        return;
    }

    // Construir el objeto completo del proyecto
    const projectData = {
        grid: [],
        grid_size: gridSize,
        palette: COLOR_PALETTE
    };

    // Llenar la cuadrícula 3D desde los vóxeles visibles
    for (let x = 0; x < gridSize; x++) {
        projectData.grid[x] = [];
        for (let y = 0; y < gridSize; y++) {
            projectData.grid[x][y] = [];
            for (let z = 0; z < gridSize; z++) {
                projectData.grid[x][y][z] = 0; // inicializamos todo en 0
            }
        }
    }

    // Rellenar con los vóxeles reales
    voxels.forEach((voxel, key) => {
        const [x, y, z] = key.split(',').map(Number);
        // Convertir coordenadas de escena a índices de cuadrícula
        const gridX = Math.round(x + gridSize / 2);
        const gridY = Math.round(y);
        const gridZ = Math.round(z + gridSize / 2);

        if (
            gridX >= 0 && gridX < gridSize &&
            gridY >= 0 && gridY < gridSize &&
            gridZ >= 0 && gridZ < gridSize
        ) {
            projectData.grid[gridX][gridY][gridZ] = voxel.colorIndex;
        }
    });

    // Convertir a JSON y crear blob
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Crear enlace de descarga con nombre personalizado
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Proyecto guardado como: ${projectName}.json`);
});
document.getElementById('load-btn').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    // Esta función se ejecuta cuando el archivo se ha leído
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            // Validamos que el archivo tenga la estructura que esperamos
            if (!data.grid || typeof data.grid_size === 'undefined') {
                alert('Error: El archivo JSON no parece ser un proyecto válido.');
                return;
            }
            
            // --- USAMOS 'data' DIRECTAMENTE, SIN LLAMAR AL SERVIDOR ---

            // 1. Actualizar el tamaño global y los helpers visuales
            gridSize = data.grid_size;
            document.getElementById('grid-size-select').value = gridSize; // Actualiza el selector en la UI
            createGridHelpers();

            // 2. Limpiar la escena de los vóxeles anteriores de forma segura
            voxels.forEach(({ mesh }) => scene.remove(mesh));
            voxels.clear();

            // 3. Recrear los vóxeles desde los datos del archivo cargado
            const gridData = data.grid;
            for (let x = 0; x < gridData.length; x++) {
                for (let y = 0; y < gridData[x].length; y++) {
                    for (let z = 0; z < gridData[x][y].length; z++) {
                        const colorIndex = gridData[x][y][z];
                        if (colorIndex > 0) {
                            addVoxel(
                                x - gridSize / 2, // Ajuste de coordenadas al centro de la escena
                                y,
                                z - gridSize / 2, // Ajuste de coordenadas al centro de la escena
                                colorIndex
                            );
                        }
                    }
                }
            }
            
            alert('Proyecto cargado correctamente.');

        } catch (error) {
            console.error("Error al procesar el archivo JSON:", error);
            alert('Hubo un error al leer o interpretar el archivo JSON.');
        } finally {
            // Resetea el input para poder cargar el mismo archivo de nuevo si es necesario
            e.target.value = '';
        }
    };

    // Leemos el archivo como texto
    reader.readAsText(file);
});
// --- EXPORTAR A GLB/GLTF ---
document.getElementById('export-gltf-btn').addEventListener('click', () => {
    // 1. Crear una instancia del exportador
    const exporter = new GLTFExporter();

    // 2. Opciones de exportación. 'binary: true' genera un único archivo .glb
    const options = {
        binary: true // Genera .glb en lugar de .gltf + .bin
    };

    // 3. Para no exportar los helpers (grid, ejes), creamos un grupo
    // temporal que contenga únicamente los vóxeles.
    const exportGroup = new THREE.Group();
    voxels.forEach(({ mesh }) => {
        // Clonamos para no afectar a los objetos de la escena principal
        exportGroup.add(mesh.clone()); 
    });

    // 4. Iniciar el proceso de parseo
    exporter.parse(
        exportGroup, // El objeto a exportar
        (result) => { // Función callback que se ejecuta al terminar
            if (result instanceof ArrayBuffer) {
                // Si es binario (glb), guardamos el ArrayBuffer
                saveArrayBuffer(result, 'escena-voxel.glb');
            } else {
                // Si no fuera binario, guardamos el JSON (gltf)
                const output = JSON.stringify(result, null, 2);
                saveString(output, 'escena-voxel.gltf');
            }
        },
        (error) => { // Función callback para errores
            console.error('Ocurrió un error durante la exportación a GLTF:', error);
            alert('No se pudo exportar el modelo.');
        },
        options
    );
});

// --- Funciones auxiliares para guardar los archivos ---

function saveString(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function saveArrayBuffer(buffer, filename) {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

// --- EXPORTAR A PNG ---
document.getElementById('export-btn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'voxel-editor.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
});

// --- CICLO DE ANIMACIÓN Y RESIZE ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
