## [0.2.2] - 2020-10-17

### Changed
- Fixed browser training
- Moved model management to browser localstorage
- Introduced stop render option to improve training performance

## [0.2.1] - 2020-10-17

### Changed
- Fixed training methodology for Nodejs model
- New trained model with 12 million sample space
- Updated test example to test Nodejs model

## [0.2.0] - 2020-09-23

### Added
- Car game - Support for state progress without rendering anything to canvas
- New Nodejs based Tensorflow model to train network faster

### Changed
- Randomized test runs

## [0.1.0] - 2020-09-21

### Added
- Episodes will start with a random speed at random location rather than start point of the track with 0 speed

### Changed
- New reward function:
    <br/>
    >    if car is inside the road:
    ><br/>
    >        <img src="https://latex.codecogs.com/svg.latex?reward=100-(90*\left|position_{normalized}\right|)-(100*(1-speed_{normalized}))" />
    ><br/>
    >    else:
    ><br/>
    >        <img src="https://latex.codecogs.com/svg.latex?reward=-10+(-40*(\left|position_{normalized}\right|-1))-(100*(1-speed_{normalized}))" />

- Reduced number of actions from eight to five, car will automatically increase speed if break is not triggered
