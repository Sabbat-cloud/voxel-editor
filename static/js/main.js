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

const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    preserveDrawingBuffer: true 
});
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

// --- LÓGICA DEL CUBO FANTASMA (PREVISUALIZACIÓN) ---
let ghostCube;

function createGhostCube() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    ghostCube = new THREE.Mesh(geometry, material);
    ghostCube.visible = false;
    scene.add(ghostCube);
}

// --- PALETA DE COLORES ---
const COLOR_PALETTE = [0x00ff83, 0xff5733, 0x5733ff, 0xffff00, 0xff0057, 0x33aaff, 0xffd700, 0x8b4513];
const colorNames = ['Verde', 'Naranja', 'Morado', 'Amarillo', 'Rosa', 'Azul Claro', 'Dorado', 'Marrón'];
const paletteDiv = document.getElementById('color-palette');
let selectedColorIndex = 0;
COLOR_PALETTE.forEach((color, index) => {
    const button = document.createElement('button');
    button.style.cssText = `width:30px; height:30px; border:2px solid #444; border-radius:50%; background-color:#${color.toString(16).padStart(6, '0')}; cursor:pointer;`;
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
                    addVoxel(x - gridSize / 2 + 0.5, y, z - gridSize / 2 + 0.5, colorIndex);
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
    createGhostCube();
    loadInitialGrid();
}

initializeGrid();

// --- INTERACCIÓN CON EL RATÓN ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5);

// *** MODIFICACIÓN 1: La función ahora acepta un parámetro para invertir la normal ***
function getVoxelPosition(event, placeOnOppositeFace = false) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(Array.from(voxels.values()).map(v => v.mesh));
    if (intersects.length > 0) {
        const hit = intersects[0];
        const normal = hit.face.normal.clone();
        
        // Si se indica, usamos la cara opuesta (ej: para construir hacia abajo)
        if (placeOnOppositeFace) {
            return hit.object.position.clone().sub(normal);
        } else {
            return hit.object.position.clone().add(normal);
        }

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

// Evento para mover el ratón (actualiza el cubo fantasma)
window.addEventListener('mousemove', (event) => {
    if (!ghostCube) return;
    if (event.shiftKey) {
        // *** MODIFICACIÓN 2: Pasamos el estado de la tecla Alt a la función ***
        const finalPosition = getVoxelPosition(event, event.altKey);
        if (finalPosition) {
            ghostCube.position.copy(finalPosition);
            ghostCube.visible = true;
        } else {
            ghostCube.visible = false;
        }
    } else {
        ghostCube.visible = false;
    }
});

// Evento para cuando se deja de pulsar una tecla
window.addEventListener('keyup', (event) => {
    if (event.key === 'Shift' && ghostCube) {
        ghostCube.visible = false;
    }
});

// Evento para el clic del ratón
window.addEventListener('mousedown', async (event) => {
    // La lógica de añadir (`Shift + Click`) ahora funciona automáticamente
    // con la nueva posición del ghostCube, por lo que no necesita cambios.
    if (!event.shiftKey && !event.ctrlKey) return;
    const action = event.shiftKey ? 'add' : 'remove';
    let finalPosition;

    if (action === 'remove') {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(Array.from(voxels.values()).map(v => v.mesh));
        if (intersects.length > 0) {
            finalPosition = intersects[0].object.position;
        }
    } else {
        finalPosition = ghostCube.position;
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
            const displayX = result.x - gridSize / 2 + 0.5;
            const displayY = result.y;
            const displayZ = result.z - gridSize / 2 + 0.5;
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
    voxels.forEach((voxel) => {
        const pos = voxel.mesh.position;
        const gridX = Math.round(pos.x + gridSize / 2 - 0.5);
        const gridY = Math.round(pos.y);
        const gridZ = Math.round(pos.z + gridSize / 2 - 0.5);
        if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize && gridZ >= 0 && gridZ < gridSize) {
            projectData.grid[gridX][gridY][gridZ] = voxel.colorIndex;
        }
    });
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
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
                            addVoxel(x - gridSize / 2 + 0.5, y, z - gridSize / 2 + 0.5, colorIndex);
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

// --- EXPORTAR ---
document.getElementById('export-gltf-btn').addEventListener('click', () => {
    const exporter = new GLTFExporter();
    const options = { binary: true };
    const exportGroup = new THREE.Group();
    voxels.forEach(({ mesh }) => exportGroup.add(mesh.clone()));
    exporter.parse(exportGroup, (result) => {
        saveArrayBuffer(result, 'escena-voxel.glb');
    }, (error) => {
        console.error('Ocurrió un error durante la exportación a GLTF:', error);
    }, options);
});
document.getElementById('export-btn').addEventListener('click', () => {
    // Forzar un renderizado del último fotograma para asegurar que el buffer esté actualizado
    renderer.render(scene, camera); 
    
    // Usar toBlob que es asíncrono y más seguro
    renderer.domElement.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'voxel-editor.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url); // Limpiar el objeto URL
    });
});
function save(blob, filename) {
    const link = document.createElement('a');
    // Si ya existe, lo eliminamos para evitar duplicados
    if (document.body.contains(link)) {
        document.body.removeChild(link);
    }
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

function saveString(text, filename) {
    save(new Blob([text], { type: 'text/plain' }), filename);
}
function saveArrayBuffer(buffer, filename) {
    save(new Blob([buffer], { type: 'application/octet-stream' }), filename);
}
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
