## [0.1.0] - 2020-09-21

### Added
- Episodes will start with a random speed at random location rather then start point of the track with 0 speed

### Changed
- New reward function:
    <br/>
    >    if car is inside the road:
    <br/>
            <img src="https://latex.codecogs.com/svg.latex?\Large&space;reward= 100 - (90 * \left |  position_{normalized}\right |) - (100 * (1 - speed_{normalized}))" />
    <br/>
        else:
    <br/>
            <img src="https://latex.codecogs.com/svg.latex?\Large&space;reward = -10 + (-40 * (\left |  position_{normalized}\right | - 1)) - (100 * (1 - speed_{normalized}))" />
    >

- Reduced number of actions from eight to five, car will automatically increase speed if break is not triggered
