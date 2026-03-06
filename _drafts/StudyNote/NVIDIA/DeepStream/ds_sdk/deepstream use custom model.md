[Using a Custom Model with DeepStream — DeepStream 6.3 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_using_custom_model.html)

deepstream流程支持使用自定义的模型来进行推理, 插件为nvinfer
## configuration
使用自定义模型也需要提供一个configuration, 用于配置模型的一些信息, 下面这些字段是必须要配置的:
- model-file (Caffe model)
- proto-file (Caffe model)
- uff-file (UFF models)
- onnx-file (ONNX models)
- model-engine-file, if already generated
- int8-calib-file for INT8 mode
- mean-file, if required
- offsets, if required
- maintain-aspect-ratio, if required
- parse-bbox-func-name (detectors only)
- parse-classifier-func-name (classifiers only)
- custom-lib-path
- output-blob-names (Caffe and UFF models)
- network-type
- model-color-format
- process-mode
- engine-create-func-name
- infer-dims (UFF models)
- uff-input-order (UFF models)

## implementation interface
nvinfer能够支持用于以下目的的接口:
- Custom bounding box parsing for custom neural network detectors and classifiers
- IPlugin implementation for layers not natively supported by NVIDIA® TensorRT™
- Initializing non-image input layers in cases where the network has more than one input layer
- Creating a CUDA engine using TensorRT Layer APIs instead of model parsing APIs. Read more about TensorRT docs here: [https://docs.nvidia.com/deeplearning/tensorrt/developer-guide/index.html](https://docs.nvidia.com/deeplearning/tensorrt/developer-guide/index.html)
- IModelParser interface to parse the model and fill the layers in an INetworkDefinition

简略翻译:
- 自定义detectors和classifiers模型的bbox输出处理
- 对TensorRT原生不支持的层, 使用IPlugin来实现相关功能
- 在网络具有多个输入层的情况下初始化非图像输入层
- 使用TensorRT Layer APIs创建CUDA引擎
- IModelParser 接口用于解析模型并填充 INetworkDefinition 中的层

所有的接口需要在一个单独的动态库中实现, nvinfer使用`dlopen()`来动态调用库, 使用`dlsym()`来查找接口
在头文件`nvdsinfer_custom_impl.h`中可以看到更多用法
## output parse
对于detector, 后处理库需要提供处理bbox坐标, 从模型输出层获得类别信息的能力
对于classifier, 后处理库需要提供处理从输出层得到的object特征/属性的能力

在`sources/libs/nvdsinfer_customparser`路径中包含了一些自定义模型输出处理的例子

## IPlugin
deepstream支持通过IPlugin插件来实现TensorRT不支持的网络层
在*objectDetector_SSD*, *objectDetector_FasterRCNN*,  *objectDetector_YoloV3*sample中展示了IPlugin的用法

Gst-nvinfer插件现在支持在TensorRT5.0中引入的IPluginV2 和 IPluginCreator接口
为了兼容caffemodel和已经存在的插件, IPlugin依旧支持以下接口:
- nvinfer1::IPluginFactory
- nvuffparser::IPluginFactory
- nvuffparser::IPluginFactoryExt
- nvcaffeparser1::IPluginFactory
- nvcaffeparser1::IPluginFactoryExt
- nvcaffeparser1::IPluginFactoryV2

