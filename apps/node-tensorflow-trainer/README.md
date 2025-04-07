# Node TensorFlow Trainer (node-tensorflow-trainer)

This module is the TensorFlow trainer part of the Before Evening project, responsible for training the autonomous driving agent. If you do not want to use browser for training your own model, you can do it using TensorFlow in Node.js environment.

## Overview

The `node-tensorflow-trainer` module provides the necessary scripts and configurations to train the autonomous driving agent using TensorFlow.js in a Node.js environment. It leverages the game engine and shared utilities to facilitate the training process.

## Contents

- `.gitignore`: A file specifying which files should be ignored by Git.
- `biome.json`: Configuration file for the project.
- `package.json`: Contains metadata about the project and its dependencies.
- `pnpm-lock.yaml`: Lockfile for the project's dependencies.
- `tsconfig.json`: Configuration file for TypeScript.
- `tsconfig.module.json`: Additional configuration file for TypeScript modules.
- `src/`: Directory containing source code.

## Getting Started

To get started with the TensorFlow trainer module, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/omuryildirim/before-evening.git
   cd before-evening/apps/node-tensorflow-trainer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Train the model:
   ```bash
   pnpm train
   ```

## Scripts

- `train`: Trains the TensorFlow model.
- `lint`: Lints the codebase.

## License

This project is licensed under the MIT License.
