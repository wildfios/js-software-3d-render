## Simple software 3D render algorythm

This is a simple software 3D rendering app.
No GPU or any API is used in this example, just math and HTML Canvas.
Written just for fun, education and as a simple explanation of a graphics card pipeline (**oversimplified**).

*Please note, the code is **not optimized** for more transparency of each step.

Model data is **.OBJ** based format

Implemented steps:

- Coordinate projection **3D -> 2D**
- Geometry building
- Geometry transformation (Rotation, Move)
- Rasterization
- Depth test (Z buffer)

Not implemented **ToDo**:

- Proper pixel coloring
- Texturing
- Lighting calculation

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!
