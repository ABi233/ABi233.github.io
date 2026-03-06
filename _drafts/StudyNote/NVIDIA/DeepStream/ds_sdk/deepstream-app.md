[Nvidia DeepStream 101: DeepStream Tutorial | Medium | Medium](https://chirag4798.medium.com/nvidia-deepstream-101-a-step-by-step-guide-to-creating-your-first-deepstream-application-68148753cf96)

# 环境
## 环境配置
```bash
sudo apt-get install libgstreamer-plugins-base1.0-dev libgstreamer1.0-dev \
   libgstrtspserver-1.0-dev libx11-dev nvidia-cuda-toolkit
```

## 编译选项
1. 在deepstream-test\*中提供的Makefile中修改CUDA_VER
	- For Jetson, CUDA_VER=11.4
	- For x86, CUDA_VER=11.8
1. sudo make(在容器中不要求sudo)

# pipeline
## 输入
### rtsp输入
### 图片输入
图片输入需要使用deepstream-image-decode-app
```bash
$ ./deepstream-image-decode-app <file1> [file2] ... [fileN] 
$ ./deepstream-image-decode-app file1.mjpeg file2.mjpeg
```

也有图片输入case的sample
`deepstream/sources/apps/sample_apps/deepstream-image-decode-test/`

## 解码
### gstreamer硬解
deepstream中对于gstreamer解码器的配置如下, 可以看到是调用nvdec_h264来做硬解支持
```cpp
  /* Since the data format in the input file is elementary h264 stream,
   * we need a h264parser */
  h264parser = gst_element_factory_make ("h264parse", "h264-parser");

  /* Use nvdec_h264 for hardware accelerated decode on GPU */
  decoder = gst_element_factory_make ("nvv4l2decoder", "nvv4l2-decoder");
```
吕博建议研究一下, 之前他们用这个进行解码时12路就已经比较卡了

### ffmpeg硬解


