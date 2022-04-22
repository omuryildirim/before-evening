# Before Evening

A project where a simple Javascript car game combined with an autonomous driving agent powered by a Tensorflow.js.
The model is based on a reinforcement learning model, it follows the principles of Q-learning.

The project consists a pre-trained model to control the vehicle in Before Evening game.
Further, project offers a UI for training a new model in user's browser. User can change certain parameters of model
and create their own autonomous agent in their browser.

Project consists two front-end applications and a back-end application.
First front-end app is a Javascript module under `./src` path. Module is the main car game, 
inspired from [Javascript Racer](https://github.com/jakesgordon/javascript-racer). 
Second front-end app is an Angular web-app under `./implementations/before-evening`. 
Angular application imports the car game module and creates/loads a Tensorflow.js model to train/test in realtime at the browser.
It consists a simple UI that user can set training parameters, train the model or test already trained model.
And finally, back-end app is a Node.js module at `./implementations/node-tensorflow`. The app uses Tensorflow.js package for Node.js
and the car game module, and trains a model. Node.js app is used to test training in a faster way. It uses same model and Q-learning method
to train. Thus, output model is same both in browser and Node.js app.

The goal of project is to create an autonomous driving model by only using browser to explore the capabilities of WebGL based
Tensorflow.js machine learning platform. A pre-trained very well working autonomous driving agent model is stored at
`./implementations/shared/before-evening-{version}`.
