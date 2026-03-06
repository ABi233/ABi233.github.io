# 配置组
|**配置组名**|**配置内容**|
|:-:|-|
|application|应用设置, 例如性能检测开关, 与指定组件无关的配置|
|tiled-display|平铺显示, 类似九宫格显示|
|source|源配置。多个源时，命名：[source0], [source1], ...|
|source-list|以列表形式提供的源URI, 可以支持多个输入源, 命名: [source-list], [source-attr-all]|
|source-attr-all|同上|
|streammux|streammux（混流）组件的配置和更改|
|preprocess|preprocess（预处理）组件的配置和更改|
|primary-gie|GIE推理引擎的相关配置|
|secondary-gie|次级推理引擎的相关配置。多个次级推理命名：[secondary-gie0], [secondary-gie1], ...|
|tracker|目标跟踪的相关配置|
|message converter|message converter(转换器)组件的配置和更改|
|message consumer|message consumer(接收器)组件的配置和更改, pipeline可以包含多个接收器组件, 命名: [message-consumer0], [message-consumer1], ...|
|osd|OSD(on-screen display)组件相关配置。包括每一帧上显示的文本和矩形框|
|sink|sink组件的相关配置。表示了输出（如显示、文件渲染、编码、文件保存）。一个管道可以包含多个sink。组的命名须为[sink0]， [sink1], ...|
|tests|诊断和debug。该组为测试用。|
|NvDs-analytics|为nvdsanalytics插件配置参数, 并且在应用中启用该插件|
## Source
https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_ref_app_deepstream.html#source-group
## Source-list & Source-attr-all
https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_ref_app_deepstream.html#source-list-and-source-attr-all-groups
## Primary-gie
https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_ref_app_deepstream.html#primary-gie-and-secondary-gie-group

gst-nvinfer configuration
https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvinfer.html#gst-nvinfer-file-configuration-specifications
## Tracker
https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_ref_app_deepstream.html#tracker-group
more details: [Gst-nvtracker — DeepStream 6.2 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvtracker.html#nvtracker-gst-properties)
## Sink
https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_ref_app_deepstream.html#sink-group
一个使用rtsp输出的例子:
```txt
[sink1]
enable=1
#Type - 1=FakeSink 2=EglSink 3=File 4=RTSPStreaming
type=4
#1=h264 2=h265
codec=1
#encoder type 0=Hardware 1=Software
enc-type=0
sync=0
bitrate=4000000
#H264 Profile - 0=Baseline 2=Main 4=High
#H265 Profile - 0=Main 1=Main10
profile=0
# set below properties in case of RTSPStreaming
rtsp-port=8554
udp-port=5400
```

reference:
[DeepStream Reference Application - deepstream-app — DeepStream 6.2 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_ref_app_deepstream.html#configuration-groups)
[DeepStream 配置文件解析_drop-frame-interval_MOLWH的博客-CSDN博客](https://blog.csdn.net/weixin_38369492/article/details/104859567)
[NVIDIA DeepStream配置文件解析；摄像头源&&RTSP拉流源输入，RTSP推流输出_deepstream rtsp_Yan_uuu的博客-CSDN博客](https://blog.csdn.net/Yan_uuu/article/details/127389866)

