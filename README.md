# Lemanscope React
Lemanscope map

[![License: MIT][mit-by-shield]][mit-by]

This is the map-component for the [Lemanscope](https://lemanscope.org/) project build in React v18. Lemanscope is a  EPFL participatory science project in collaboration with the Association for the Protection of Lake Geneva (ASL) and EAWAG for measuring the transparency and color of Lake Geneva.

The online deployement can be found at https://lemanscope.org

![React][React] ![TypeScript][TypeScript] ![Javascript][javascript-by-shield]

## Development

### Install Node.js

Install node.js according to the official instructions https://nodejs.org/en/download

### Clone the repository

```console
git clone git@github.com:eawag-surface-waters-research/lemanscope-react.git
```

### Install packages

```console
cd lemanscope-react
npm install
```

### Launch the service

```console
npm start
```

Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes. You may also see any lint errors in the console.

### Build a production package

```console
npm run build
```

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

## Deployement

The application is deployed using AWS Amplify. The GitHub repositority is connected to a CI/CD pipeline which rebuilds and redeploys the application on any commits to the master branch.


[mit-by]: https://opensource.org/licenses/MIT
[mit-by-shield]: https://img.shields.io/badge/License-MIT-g.svg
[javascript-by-shield]: https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E
[React]: https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB
[TypeScript]: https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white
