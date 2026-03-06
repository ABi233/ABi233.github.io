# Docker description
## DS 6.4

|**Container Name**|**Architecture**|**License Type**|**Notes**|
|---|---|---|---|
|**deepstream:6.4-triton-multiarch**|Multi-Arch<br><br>x86 + Jetson|Deployment|The DeepStream Triton container enables inference using [Triton Inference Server](https://developer.nvidia.com/nvidia-triton-inference-server). With Triton developers can run inference natively using TensorFlow, TensorFlow-TensorRT, PyTorch and ONNX-RT. Inference with Triton is supported in the reference application (deepstream-app)|
|**deepstream:6.4-samples-multiarch**|Multi-Arch<br><br>x86 + Jetson|Deployment|The DeepStream samples container extends the base container to also include sample applications that are included in the DeepStream SDK along with associated config files, models, and streams. This container is ideal to understand and explore the DeepStream SDK using the provided samples.|
|**deepstream:6.4-gc-triton-devel**|x86|Development|The DeepStream development container is the recommended container to get you started as it **includes Graph Composer**, the build toolchains, development libraries and packages necessary for building DeepStream reference applications within the container. This container is slightly larger in size by virtue of including the build dependencies.|
- triton-multiarch: 可用于triton server的版本
- samples-multiarch: 比较完整的版本, 附带所有的sample, config, stream示例, 适合用于开发
- gc-triton-devel: 附带了GC的版本

```bash
docker pull nvcr.io/nvidia/deepstream:6.4-samples-multiarch
```

# docker run Sample
更加实用的例子, 可以不再参考下面的docker run示例
```bash
# base case
sudo docker run -itd --net=host --gpus all --device /dev/snd -v -w -h --name  nvcr.io/nvidia/deepstream:6.4-samples-multiarch

# if need use perf, add:
--cap-add CAP_SYS_ADMIN --privileged

# for 192.168.2.101
sudo docker run -itd --net=host --gpus all --device /dev/snd -v /fast_disk/:/fast_disk -v /slow_disk/:/slow_disk -v /slow_disk2/:/slow_disk2 -v /mnt/:/mnt -w /root -h deepstream-test --name deepstream-test nvcr.io/nvidia/deepstream:6.2-devel

sudo docker run -itd --net=host --gpus all --device /dev/snd -v /fast_disk/:/fast_disk -v /slow_disk/:/slow_disk -v /mnt/:/mnt -w /root -h deepstream-test --name deepstream-test --cap-add CAP_SYS_ADMIN --privileged nvcr.io/nvidia/deepstream:6.4-samples-multiarch

# --device 挂载宿主机设备到容器
# -v 挂载
# -w 选择进入容器的工作目录
# --name 容器名称
# -h 容器主机名
```
# ubuntu20.04上的deepstream docker实践
**拉取deepstream6.2-devel镜像**
```bash
docker pull nvcr.io/nvidia/deepstream:6.2-devel
```

**启动docker容器**
```bash
sudo docker run -itd --net=host --gpus all -e DISPLAY=$DISPLAY --device /dev/snd -v /tmp/.X11-unix/:/tmp/.X11-unix --name deepstream-test nvcr.io/nvidia/deepstream:6.2-devel

# --device 挂载宿主机设备到容器
# -v 挂载
```

运行sample
在/opt/nvidia/deepstream/deepstream-6.2/samples/configs/deepstream-app目录下有已经写好的配置文件
```bash
# 使用-c选项来指定配置文件
deepstream-app -c source2_1080p_dec_infer-resnet_demux_int8.txt
```
配置文件的详解可以见[[deepstream configuration]]
## 替换目标识别模型为YOLO
[使用docker部署Deepstream6.1+yolov5+Kafka_deepstream docker_羽化登仙°的博客-CSDN博客](https://blog.csdn.net/weixin_44290628/article/details/125105484)


reference:
[Docker Containers — DeepStream 6.3 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_docker_containers.html)
[deepstream官方事例运行问题_weixin_44594953的博客-CSDN博客](https://blog.csdn.net/weixin_44594953/article/details/119939349)


# 在容器中构建deepstream c++应用并且封装成新的docker镜像
在本地容器中构建deepstream c++应用, 并且用本地容器的数据来封装成新的docker镜像
操作步骤可见[[docker镜像构建#根据一个container打包一个镜像]]

# 报错
## Error response from daemon: could not select device driver ““ with capabilities: \[\[gpu\]\]
原因为没有安装nvidia-container-toolkit, 按照[[nvidia-container-toolkit]]文档安装后解决问题



