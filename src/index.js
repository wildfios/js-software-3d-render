import "./index.css";

const screenWidth = 320;
const screenHeight = 200;

let fps = 0;
let isWireframe = false;

/* Geometry of model */

const objFile = `
v 0.000000 20.000000 20.000000\n
v 0.000000 0.000000 20.000000\n
v 20.000000 0.000000 20.000000\n
v 20.000000 20.000000 20.000000\n
v 0.000000 20.000000 0.000000\n
v 0.000000 0.000000 0.000000\n
v 20.000000 0.000000 0.000000\n
v 20.000000 20.000000 0.000000\n
f 1 2 3 4\n
f 8 7 6 5\n
f 4 3 7 8\n
f 5 1 4 8\n
f 5 6 2 1\n
f 2 6 7 3\n
`;

/* 
    ********** Helper functions block **********
*/

/* Projects 3d coords to 2d camera (screen) */

function projectPoint(pointCoords) {
    const scaleFactor = screenHeight / (50 + pointCoords[2]);

    const projectedX = pointCoords[0] * scaleFactor + screenWidth / 3;
    const projectedY = pointCoords[1] * scaleFactor + screenHeight / 3;

    return [projectedX, projectedY, pointCoords[2]];
}

/* Interpolation helper */

const interpolateZ = (p1, p2, x) => p2[0] === p1[0] ? p1[1] : p1[1] + ((p2[1] - p1[1]) / (p2[0] - p1[0])) * (x - p1[0]);

/* Rasterization helper, scan triangle by horizontal line to fined intersection points */

function findIntersectionPoint(v1, v2, y) {
    // Extract coordinates of the first line
    let x1 = v1[0];
    let y1 = v1[1];
    let z1 = v1[2];

    let x2 = v2[0];
    let y2 = v2[1];
    let z2 = v2[2];

    // Calculate determinants
    const det = (y1 - y2) * screenWidth;
    const detX = (x1 - x2) * (screenWidth * y) - screenWidth * (x1 * y2 - y1 * x2);

    // Calculate intersection point
    const x = Math.round(detX / det);
    const z = x2 === x1 ? z1 : z2 + ((z1 - z2) / (x1 - x2)) * (x - x2);

    return [x, z];
}

/* Vertex sort helper */

const sortVertices = vertices => vertices.sort((a, b) => a[1] - b[1]);

/* Rasterization of triangle, Z buffer implantation */

function rasterizeTriangle(buffer, v1, v2, v3) {
    [v1, v2, v3] = sortVertices([v1, v2, v3]);

    const minY = Math.trunc(v1[1]) + 1;
    const maxY = Math.trunc(v3[1]);

    let startPoint, stopPoint;

    for (let y = minY; y <= maxY; y++) {

        if (y < v2[1]) {
            startPoint = findIntersectionPoint(v1, v2, y);
            stopPoint = findIntersectionPoint(v1, v3, y);
        } else {
            startPoint = findIntersectionPoint(v1, v3, y);
            stopPoint = findIntersectionPoint(v2, v3, y);
        }

        if (startPoint[0] > stopPoint[0]) [startPoint, stopPoint] = [stopPoint, startPoint];

        startPoint[0] = startPoint[0] < 0 ? 0 : startPoint[0];
        stopPoint[0] = stopPoint[0] > screenWidth ? screenWidth : stopPoint[0];

        let zValue = 0;
        let currentZValueIndex = 0;

        for (let x = startPoint[0]; x < stopPoint[0]; x++) {
            const interpolatedZValue = interpolateZ(startPoint, stopPoint, x) * 4;
            zValue = 255 - (interpolatedZValue >= 255 ? 1 : interpolatedZValue);

            /* Depth test */
            currentZValueIndex = (y * screenWidth + x) * 4;
            if (buffer.data[currentZValueIndex] < zValue) {
                buffer.data[currentZValueIndex] = zValue;
            }
        }
    }
}

/*
   ********** 3d draw functions **********
*/

/* Load .OBJ file from string, have some simplifications */

function loadObjModel(objFileString) {
    const lines = objFileString.split('\n');
    const vertexArray = lines.filter(line => line.startsWith('v')).map(line => line.split(/\s+/).slice(1).map(coord => parseFloat(coord)));
    const triangleData = lines.filter(line => line.startsWith('f')).map(line => line.split(/\s+/).slice(1).map(coordIndex => parseInt(coordIndex)));

    return [vertexArray, triangleData];
}

/* Apply translation to each vertex, move object */

function fgTranslateObject(object, translateX, translateY, translateZ) {
    // Perform translations
    object.forEach(vertex => {
        vertex[0] += translateX;
        vertex[1] += translateY;
        vertex[2] += translateZ;
    });
}

/* Apply rotation matrix to each vertex, rotates model */

function fgRotateObject(object, angleX, angleY, angleZ) {
    // Convert angles to radians
    const radX = angleX * Math.PI / 180;
    const radY = angleY * Math.PI / 180;
    const radZ = angleZ * Math.PI / 180;

    // Define rotation matrices for each axis
    const rotateX = [
        [1, 0, 0],
        [0, Math.cos(radX), -Math.sin(radX)],
        [0, Math.sin(radX), Math.cos(radX)]
    ];

    const rotateY = [
        [Math.cos(radY), 0, Math.sin(radY)],
        [0, 1, 0],
        [-Math.sin(radY), 0, Math.cos(radY)]
    ];

    const rotateZ = [
        [Math.cos(radZ), -Math.sin(radZ), 0],
        [Math.sin(radZ), Math.cos(radZ), 0],
        [0, 0, 1]
    ];

    // Perform rotations
    object.forEach(vertex => {
        // Rotate around X axis
        let tempY = vertex[1];
        let tempZ = vertex[2];
        vertex[1] = tempY * rotateX[1][1] + tempZ * rotateX[1][2];
        vertex[2] = tempY * rotateX[2][1] + tempZ * rotateX[2][2];

        // Rotate around Y axis
        let tempX = vertex[0];
        tempZ = vertex[2];
        vertex[0] = tempX * rotateY[0][0] + tempZ * rotateY[0][2];
        vertex[2] = tempX * rotateY[2][0] + tempZ * rotateY[2][2];

        // Rotate around Z axis
        tempX = vertex[0];
        tempY = vertex[1];
        vertex[0] = tempX * rotateZ[0][0] + tempY * rotateZ[0][1];
        vertex[1] = tempX * rotateZ[1][0] + tempY * rotateZ[1][1];
    });
}

/* Projects 3d coords to 2d screen */

function fgProjectGeometry(vertexes) {
    const projected = vertexes.map(vertex => projectPoint(vertex));
    projected.unshift(1);

    return projected;
}

/* Renders model on screen by projected coords */

function fgRenderModelFilled(ctx, order, projectedVertexes) {
    /* Create video buffer */
    const videoBuffer = ctx.createImageData(screenWidth, screenHeight);

    /* Clear buffer and fill with color */
    for (let i = 0; i < videoBuffer.data.length; i += 4) {
        videoBuffer.data[i] = 50;
        videoBuffer.data[i + 1] = 50;
        videoBuffer.data[i + 2] = 50;
        videoBuffer.data[i + 3] = 255;
    }

    /* Rasterize triangles */
    order.forEach(triangle => {
        rasterizeTriangle(videoBuffer, projectedVertexes[triangle[0]], projectedVertexes[triangle[1]], projectedVertexes[triangle[2]]);
        rasterizeTriangle(videoBuffer, projectedVertexes[triangle[0]], projectedVertexes[triangle[2]], projectedVertexes[triangle[3]]);
    });

    /* Draw buffer on screen */
    ctx.putImageData(videoBuffer, 0, 0);
}

/* Renders wireframe of model on screen by projected coords */

function fgRenderModelFrame(ctx, order, projectedVertexes) {
    order.forEach(triangle => {
        ctx.strokeStyle = 'green'; // You can specify any color
        ctx.lineWidth = 1; // You can specify any line width

        ctx.beginPath();
        ctx.moveTo(projectedVertexes[triangle[0]][0], projectedVertexes[triangle[0]][1]);
        ctx.lineTo(projectedVertexes[triangle[1]][0], projectedVertexes[triangle[1]][1]);
        ctx.lineTo(projectedVertexes[triangle[2]][0], projectedVertexes[triangle[2]][1]);
        ctx.lineTo(projectedVertexes[triangle[0]][0], projectedVertexes[triangle[0]][1]);

        ctx.moveTo(projectedVertexes[triangle[0]][0], projectedVertexes[triangle[0]][1]);
        ctx.lineTo(projectedVertexes[triangle[2]][0], projectedVertexes[triangle[2]][1]);
        ctx.lineTo(projectedVertexes[triangle[3]][0], projectedVertexes[triangle[3]][1]);
        ctx.lineTo(projectedVertexes[triangle[0]][0], projectedVertexes[triangle[0]][1]);
        ctx.stroke();
    });
}

/*
    ******************************************
    ********** Main process routine **********
    ******************************************
*/

const mainProc = () => {
    const canvas = document.getElementById('myCanvas');
    const fpsCounter = document.getElementById('fps-counter');

    if (!canvas) {
        console.log('Canvas not found, exiting');
        return;
    }

    const ctx = canvas.getContext('2d');

    const [vertexes, order] = loadObjModel(objFile);

    /* Main loop */
    setInterval(() => {
        /* Clear screen */
        ctx.clearRect(0, 0, screenWidth, screenHeight);

        /* Project 3D coords to 2D camera */
        const projectedVertexes = fgProjectGeometry(vertexes);

        /* Draw solid or wireframe */
        if (isWireframe) {
            fgRenderModelFrame(ctx, order, projectedVertexes);
        } else {
            fgRenderModelFilled(ctx, order, projectedVertexes);
        }

        fps++;
    }, 0);

    /* Fps counter */
    setInterval(() => {
        fpsCounter.textContent = `fps: ${fps}`;
        fps = 0;
    }, 1000);

    /* Actions list */
    const actionTable = {
        'ArrowRight': () => fgRotateObject(vertexes, 0, -2, 0),
        'ArrowLeft': () => fgRotateObject(vertexes, 0, 2, 0),
        'ArrowUp': () => fgRotateObject(vertexes, 2, 0, 0),
        'ArrowDown': () => fgRotateObject(vertexes, -2, 0, 0),

        'KeyA': () => fgTranslateObject(vertexes, -1, 0, 0),
        'KeyD': () => fgTranslateObject(vertexes, 1, 0, 0),
        'KeyW': () => fgTranslateObject(vertexes, 0, 1, 0),
        'KeyS': () => fgTranslateObject(vertexes, 0, -1, 0),
        'KeyZ': () => fgTranslateObject(vertexes, 0, 0, 1),
        'KeyX': () => fgTranslateObject(vertexes, 0, 0, -1),

        'KeyT': () => isWireframe = !isWireframe
    };

    /* Apply action */
    document.addEventListener('keydown', (event) => actionTable[event.code] && actionTable[event.code]());
};

mainProc();
