# Demo
[The live demo](http://be.ignorethedark.com/).


# Before Evening

This project features a simple JavaScript car game combined with an autonomous driving agent powered by TensorFlow.js.
The model is based on reinforcement learning and follows the principles of Q-learning.

The project includes a pre-trained model to control the vehicle in the Before Evening game.
Additionally, it offers a UI for training a new model in the user's browser. Users can modify certain parameters of the model
and create their own autonomous agent directly in their browser.

The project consists of multiple applications and shared modules.

1. **Frontend Application (before-evening-fe)**:
  - This is the main frontend application for the Before Evening car game.
  - It is built with TypeScript and utilizes various tools and libraries to create an interactive and user-friendly experience.
  - The application imports the game engine module and creates/loads a TensorFlow.js model to train/test in real-time in the browser.
  - It includes a simple UI that allows the user to set training parameters, train the model, or test an already trained model.

2. **Game Engine (before-evening-game-engine)**:
  - This module provides the core game engine functionalities required to run the Before Evening car game.
  - It handles game logic, physics, and interactions within the game world.
  - Inspired by [Javascript Racer](https://github.com/jakesgordon/javascript-racer).

3. **Node.js TensorFlow Trainer (node-tensorflow-trainer)**:
  - This module provides the necessary scripts and configurations to train the autonomous driving agent using TensorFlow.js in a Node.js environment.
  - It leverages the game engine and shared utilities to facilitate the training process.
  - The Node.js application is used to test training in a faster way. It uses the same model and Q-learning method to train, ensuring the output model is the same both in the browser and the Node.js app.

4. **Shared Module (shared)**:
  - This module provides common utilities and resources that are used across multiple modules within the Before Evening project.
  - It includes shared functions, configurations, and assets that facilitate the development and integration of different parts of the project.

The goal of the project is to create an autonomous driving model by using only the browser to explore the capabilities of the WebGL-based TensorFlow.js machine learning platform. A pre-trained, very well-working autonomous driving agent model is stored at `./apps/shared/before-evening-{version}`.

# Installation
### Dependencies
- Node.js >= 20.x.x

### Web App
To run front-end application and test pre-trained model or train your own model on browser;

```
cd apps/before-evening-fe
pnpm install
pnpm run dev
```

Then go to your browser and navigate to `localhost:5173`.

### Node.js training
To run Node.js application and train your own model in terminal;

```
cd apps/node-tensorflow-trainer
pnpm install
pnpm run build
node ./build/main/index.js
```

# Theory
Q-learning is a simple way for agents to learn how to act optimally in controlled Markovian
domains. It amounts to an incremental method for dynamic programming which imposes limited computational
demands. It works by successively improving its evaluations of the quality of particular actions at particular states. [1]

### Algorithm
After <i>&Delta;<sub>t</sub></i> steps into the future the agent will decide some next step. The weight for this step is calculated as
<i>&gamma;<sub>t</sub><sup>&Delta;<sub>t</sub></sup></i>,where <i>&gamma;</i> (the discount factor) is a number between 0 and 1, 0 &le; &gamma; &le; 1,
and has the effect of valuing rewards received earlier higher than those received later (reflecting the value of a "good start"). 
&gamma; may also be interpreted as the probability to succeed (or survive) at every step <i>&Delta;<sub>t</sub></i>.

![Q algorithm](https://wikimedia.org/api/rest_v1/media/math/render/svg/678cb558a9d59c33ef4810c9618baf34a9577686)

where <i>r<sub>t</sub></i> is the reward received when moving from the state <i>s<sub>t</sub></i> to the state <i>s<sub>t+1</sub></i>,
and alpha is the learning rate 0 &lt; &alpha; &le; 1.

An episode of the algorithm ends when state <i>s<sub>t+1</sub></i> is a final or terminal state. However, Q-learning can also learn in non-episodic tasks 
(as a result of the property of convergent infinite series). If the discount factor is lower than 1, 
the action values are finite even if the problem can contain infinite loops.
For all final states <i>s<sub>f</sub></i>, <i>Q(s<sub>f</sub>, a)</i> is never updated, but is set to the reward value r observed for state <i>s<sub>f</sub></i>. 
In most cases, <i>Q(s<sub>f</sub>, a)</i> can be taken to equal zero. [2]

### Variables
#### Learning rate
The learning rate or step size determines to what extent newly acquired information overrides old information.
Thus, the learning rate controls how fast we modify our estimates. One expects to start with a high learning rate, which allows fast
changes, and lowers the learning rate as time progresses. [3] The agent learns by receiving rewards after every action. 
It somehow keeps track of these rewards, and then selects actions that it believes will maximize the reward it gains,
not necessarily only for the next action, but in the long run. The agent usually goes through the same environment many times in order
to learn how to find the optimal actions. [4]

#### Discount factor
The discount factor gamma determines the importance of future rewards. A factor of 0 will make the agent "myopic" (or short-sighted)
by only considering current rewards, while a factor approaching 1 will make it strive for a long-term high reward. [2]

#### Exploration Vs. Exploitation
The agent usually goes through the same environment many times in order to learn how to find the optimal actions. 
Balancing exploration and exploitation is particularly important here: the agent may have found a good goal on one path, 
but there may be an even better one on another path. Without exploration, the agent will always return to first goal, 
and the better goal will not be found. Or, the goal may lie behind very low reward areas, that the agent would avoid 
without exploration. On the other hand, if the agent explores too much, it cannot stick to a path; in fact, it is not
really learning: it cannot exploit its knowledge, and so acts as though it knows nothing. Thus, it is critical to find a 
good balance between the two, to ensure that the agent is really learning to take the optimal actions. [5]

# References
[[1] WATKINS, Christopher JCH; DAYAN, Peter. Q-learning. Machine learning, 1992, 8.3: 279-292.](https://link.springer.com/content/pdf/10.1007/BF00992698.pdf)

[[2] Q-learning Algorithm. Wikipedia.](https://en.wikipedia.org/wiki/Q-learning#Algorithm)

[[3] EVEN-DAR, Eyal; MANSOUR, Yishay; BARTLETT, Peter. Learning Rates for Q-learning. Journal of machine learning Research, 2003, 5.1.](https://www.jmlr.org/papers/volume5/evendar03a/evendar03a.pdf)

[[4] Sutton, RS and Barto, AG. Reinforcement learning: an introduction. Trends in cognitive sciences, 1999, 3(9), 360.](https://www.cell.com/trends/cognitive-sciences/fulltext/S1364-6613(99)01331-5)

[[5] Coggan, Melanie. Exploration and exploitation in reinforcement learning. Research supervised by Prof. Doina Precup, CRA-W DMP Project at McGill University, 2004.](https://www.jmlr.org/papers/volume5/evendar03a/evendar03a.pdf)
