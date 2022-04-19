## Q-learning Model

### Model specification
Hidden layer size: `1024`<br>
Activation: `relu`<br>
Optimizer: `adam`<br>
Loss: `meanSquaredError`<br>
                
### Layer specifications                  
|     Layer (type)     | Output shape | Param # |
|:--------------------:|:------------:|:-------:|
| dense_Dense1 (Dense) | [null,1024]  |  8192   |
| dense_Dense2 (Dense) |   [null,8]   |  8200   |

- Total params: 16392
- Trainable params: 16392
- Non-trainable params: 0

### Training details
|  #  | Iterations | Position x | Position in track | Max steps per run |
|:---:|:----------:|:----------:|:-----------------:|:-----------------:|
|  1  |  100.000   |   Center   |       Start       |        100        | 
|  2  |  500.000   |   Random   |      Random       |       1000        | 
|  3  | 2.000.000  |   Random   |      Random       |       1000        | 
