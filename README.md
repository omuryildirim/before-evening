# Before Evening

A project where a simple Javascript car game combined with an autonomous driving agent powered by a Tensorflow.js based reinforcement learning model. A game with a visually satisfying environment where user can let artifical intelligence to travel for them whilst user can interrupt and take over the lead.

Project consists two applications. First one is a Javascript module under `./src` path. Module is the main car game, inspired from [Javascript Racer](https://github.com/jakesgordon/javascript-racer). Second application is an Angular web-app under `./example/before-evening`. Angular application imports car game module and creates a Tensorflow.js model to train in realtime at browser. It creates a simply UI that user can set training parameters, train the model or test already trained model.

The goal is to create the autonomous driving model by only using browser to explore the capabilities of WebGL based Tensorflow.js machine learning platform.
