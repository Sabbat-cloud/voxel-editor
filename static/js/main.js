// static/js/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// --- CONFIGURACIÓN BÁSICA ---
let gridSize = 16;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3b4c);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(gridSize / 2, gridSize / 2, gridSize * 2);

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
    if (gridHelper) scene.remove(gridHelper);
    if (axesHelper) scene.remove(axesHelper);

    gridHelper = new THREE.GridHelper(gridSize, gridSize, 0x888888, 0x444444);
    gridHelper.position.y = -0.5;
    scene.add(gridHelper);

    axesHelper = new THREE.AxesHelper(gridSize / 4);
    scene.add(axesHelper);

    camera.position.set(gridSize / 2, gridSize / 2, gridSize * 2);
    camera.lookAt(gridSize / 2, 0, gridSize / 2);
}

// --- NUEVO: LÓGICA DEL CUBO FANTASMA (PREVISUALIZACIÓN) ---
let ghostCube;

function createGhostCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
    });
    ghostCube = new THREE.Mesh(geometry, material);
    ghostCube.visible = false; // Empezará siendo invisible
    scene.add(ghostCube);
}

// --- PALETA DE COLORES ---
const COLOR_PALETTE = [
    0x00ff83, 0xff5733, 0x5733ff, 0xffff00, 0xff0057, 0x33aaff, 0xffd700, 0x8b4513,
];
const colorNames = ['Verde', 'Naranja', 'Morado', 'Amarillo', 'Rosa', 'Azul Claro', 'Dorado', 'Marrón'];
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
    voxels.forEach(({ mesh }) => scene.remove(mesh));
    voxels.clear();
    for (let x = 0; x < gridData.length; x++) {
        for (let y = 0; y < gridData[x].length; y++) {
            for (let z = 0; z < gridData[x][y].length; z++) {
                const colorIndex = gridData[x][y][z];
                if (colorIndex > 0) {
                    addVoxel(x - gridSize / 2, y, z - gridSize / 2, colorIndex);
                }
            }
        }
    }
}

async function initializeGrid() {
    const response = await fetch('/api/grid');
    const gridData = await response.json();
    gridSize = gridData.length;
    createGridHelpers();
    createGhostCube(); // <-- Llamamos a la función de creación
    loadInitialGrid();
}

initializeGrid();

// --- INTERACCIÓN CON EL RATÓN ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);

function getVoxelPosition(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(Array.from(voxels.values()).map(v => v.mesh));

    if (intersects.length > 0) {
        const hit = intersects[0];
        const normal = hit.face.normal;
        return hit.object.position.clone().add(normal);
    } else {
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
            return new THREE.Vector3(
                Math.round(intersection.x - 0.5) + 0.5,
                0,
                Math.round(intersection.z - 0.5) + 0.5
            );
        }
    }
    return null;
}

// --- NUEVO: EVENTOS DE RATÓN Y TECLADO ACTUALIZADOS ---

// Evento para mover el ratón (actualiza el cubo fantasma)
window.addEventListener('mousemove', (event) => {
    if (!ghostCube) return;

    if (event.shiftKey) { // Solo mostrar si Shift está presionado
        const finalPosition = getVoxelPosition(event);
        if (finalPosition) {
            // Centramos la posición del cubo fantasma al grid
             ghostCube.position.set(
                Math.floor(finalPosition.x) + 0.5,
                Math.floor(finalPosition.y),
                Math.floor(finalPosition.z) + 0.5
            );
            ghostCube.visible = true;
        } else {
            ghostCube.visible = false;
        }
    } else {
        ghostCube.visible = false;
    }
});

// Evento para cuando se deja de pulsar una tecla (para ocultar el fantasma si se suelta Shift)
window.addEventListener('keyup', (event) => {
    if (event.key === 'Shift') {
        if (ghostCube) ghostCube.visible = false;
    }
});


// Evento para el clic del ratón (añadir/eliminar)
window.addEventListener('mousedown', async (event) => {
    if (!event.shiftKey && !event.ctrlKey) return;

    const action = event.shiftKey ? 'add' : 'remove';
    let finalPosition;

    // Lógica para eliminar
    if (action === 'remove') {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Array.from(voxels.values()).map(v => v.mesh));
        if (intersects.length > 0) {
            finalPosition = intersects[0].object.position;
        }
    } else { // Lógica para añadir
        finalPosition = ghostCube.position; // Usamos la posición ya calculada del cubo fantasma
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

// --- GUARDAR Y CARGAR ---
document.getElementById('save-btn').addEventListener('click', () => {
    const projectName = document.getElementById('project-name-input').value.trim();
    if (!projectName) {
        alert("Por favor, ingresa un nombre para el proyecto.");
        return;
    }
    const projectData = { grid: [], grid_size: gridSize, palette: COLOR_PALETTE };
    for (let x = 0; x < gridSize; x++) {
        projectData.grid[x] = [];
        for (let y = 0; y < gridSize; y++) {
            projectData.grid[x][y] = new Array(gridSize).fill(0);
        }
    }
    voxels.forEach((voxel, key) => {
        const [x, y, z] = key.split(',').map(Number);
        const gridX = Math.round(x + gridSize / 2);
        const gridY = Math.round(y);
        const gridZ = Math.round(z + gridSize / 2);
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize && gridZ >= 0 && gridZ < gridSize) {
            projectData.grid[gridX][gridY][gridZ] = voxel.colorIndex;
        }
    });
    const jsonStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
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
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.grid || typeof data.grid_size === 'undefined') {
                alert('Error: El archivo JSON no parece ser un proyecto válido.');
                return;
            }
            gridSize = data.grid_size;
            document.getElementById('grid-size-select').value = gridSize;
            createGridHelpers();
            voxels.forEach(({ mesh }) => scene.remove(mesh));
            voxels.clear();
            const gridData = data.grid;
            for (let x = 0; x < gridData.length; x++) {
                for (let y = 0; y < gridData[x].length; y++) {
                    for (let z = 0; z < gridData[x][y].length; z++) {
                        const colorIndex = gridData[x][y][z];
                        if (colorIndex > 0) {
                            addVoxel(x - gridSize / 2, y, z - gridSize / 2, colorIndex);
                        }
                    }
                }
            }
            alert('Proyecto cargado correctamente.');
        } catch (error) {
            console.error("Error al procesar el archivo JSON:", error);
            alert('Hubo un error al leer o interpretar el archivo JSON.');
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
});

// --- EXPORTAR A GLB/GLTF ---
document.getElementById('export-gltf-btn').addEventListener('click', () => {
    const exporter = new GLTFExporter();
    const options = { binary: true };
    const exportGroup = new THREE.Group();
    voxels.forEach(({ mesh }) => {
        exportGroup.add(mesh.clone());
    });
    exporter.parse(exportGroup, (result) => {
        if (result instanceof ArrayBuffer) {
            saveArrayBuffer(result, 'escena-voxel.glb');
        } else {
            const output = JSON.stringify(result, null, 2);
            saveString(output, 'escena-voxel.gltf');
        }
    }, (error) => {
        console.error('Ocurrió un error durante la exportación a GLTF:', error);
        alert('No se pudo exportar el modelo.');
    }, options);
});

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
