# gst plugin introduce
[Gst-nvtracker — DeepStream 6.3 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvtracker.html#gst-nvtracker)
[deepstream之Gst-nvtracker - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/464861595)
[【Nvidia DeepStream5.0】Gst-nvtracker插件功能说明_行路南的博客-CSDN博客](https://blog.csdn.net/u010414589/article/details/115554325)
[NvDCF参数解析_坚强的羊脂球的博客-CSDN博客](https://blog.csdn.net/u010881576/article/details/119484304)

nvtracker插件支持调用任何追踪器的底层库, 在NvMultiObjectTracker library中有一些官方提供的参考案例, 例如IOU, NvSORT, NvDeepSORT and NvDCF

nvtracker插件会查询底层库对于输入格式的功能和要求, 内存类型, 以及批处理支持情况. 根据这些信息, 对输入帧进行转换, 转换到底层库要求的格式. 
e.g.NvDeepSORT and NvDCF使用NV12 or RGBA, 而IOU and NvSORT不需要video frame buffers

底层tracker库的功能有两个方面: 支持跨多个输入流的批处理能力, 支持传递上一帧追踪数据的能力
- 行多个输入流的批处理(batch processing across multiple input streams)
    - 对多个输入流进行批处理的效率会比单独处理每个流要高, 也可以减少数据搬移产生的开销, 特别是当底层库执行的是基于GPU的加速时.
    - 如果底层库支持批处理, 那么插件会默认使用批处理的操作方式
    - 如果底层库同时支持批处理和pre-stream模式, 可以用`enable-batch-process`来修改操作方式
- 传递过去帧数据(passing the past-frame data)
    - 对于目标的追踪数据在过去帧中产生了, 但是因为置信度较低的原因仅保存在内部没有被报告出来, 在之后帧的处理中置信度增加并且想要报告出来过去帧数据时, 插件会调用`NvDsPastFrameObjBatch`来检索底层tracker中的过去帧数据, 并且把他们作为user-mate报告出来
    - 可以通过`enable-past-frame`选项来配置开关

- **IOU Tracker**
    - IOU Tracker使用相邻两帧之间detector’s bounding boxes的IOU值进行关联，如果没有匹配，则分配一个新的目标ID
    - 它被认为是最基本的对象跟踪器, 通常只能作为baseline来使用
- **NvSORT**
    - NvSORT基于bbox邻近性的级联数据来关联连续帧上的bbox, 并应用卡尔曼滤波器更新目标状态
    - 由于它不涉及任何像素数据处理，因此计算效率很高
- **NvDeepSORT**
    - NvDeepSORT使用深度余弦度量学习和 Re-ID 神经网络对帧上的多个对象进行数据关联
    - 只要TensorRT框架支持, 用户就可以使用任何 Re-ID 网络来实现。NvDeepSORT 还使用了级联数据关联，而不是简单的双向匹配
    - 该实现还针对 GPU 上的高效处理进行了优化
- **NvDCF**
    - 采用判别相关滤波器进行视觉目标跟踪
    - 即使在没有检测结果的情况下也能独立跟踪目标
## input and output
![image.png](https://pic-upload-for-abi.oss-cn-hangzhou.aliyuncs.com/img-bed/202310231113188.png)
**input**
- Gst buffer(来自source stream的frame batch)
    - 上一级批处理后的数据作为输入? 
    - 上一级应该是推理中的识别? 推理后的数据依旧会放到批处理? 
- NvDsBatchMeta
**NvTracker对于输入视频帧的color format支持NV12和RGBA**

**output**
- Gst buffer(作为输入提供给下一级)
- NvDsBatchMeta(在NvDsObjectMeta中包含追踪目标坐标, tracker置信度, 以及object ids)

> 如果算法没有生成置信度值, 追踪目标的置信度被会设置为一个默认值(1.0)
> 对于IOU, NvSORT, NvDeepSORT来说, `tracker_confidence`会被设置为1.0
> 对于NvDCF来说, 它通过视觉跟踪能力为跟踪目标产生置信度, 其值在`NvDsObjectMeta`结构体中的`tracker_confidence`字段中设置
> 
> 在`NvDsObjectMeta`类中, 对detector和tracker的置信度分别有单独的参数来设置, 分别是`confidence`和`tracker_confidence`, 更多细节记录在[New metadata fields](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_metadata.html?highlight=tracker_confidence#new-metadata-fields)

## config properties
直接参考文档内列出的表格, 这里就不再贴张表了
## NvDsTracker API for Low-Level Tracker Library
通过使用定义在`sources/includes/nvdstracker.h`中的API接口来实现low-level tracker库.部分API引用`sources/includes/nvbufsurface.h`中的接口.不论是函数接口还是数据结构, 都会以`NvMOT`(NVIDIA Multi-Object Tracker)作为前缀

## Late Activation
NvMultiObjectTracker采用了一种名为*Late Activation*的策略, 延迟追踪目标的报告

> where a newly detected object is examined for a period of time and activated for long-term tracking only if it survives such a period

新检测到的对象会被检查一段时间，只有在该对象在这段时间内幸存下来时才被激活进行长期跟踪
这个时间可以通过config file中的`TargetManagement` section的`probationAge`来设置
> probationAge: 1    # If the target's age exceeds this, the target will be considered to be valid.

详细说明可见文档: [NvTracker Target Management and Error Handling](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvtracker.html#target-management-and-error-handling)

有一个issue提出了相关问题, 在作者测试时发现tracker输出的开头几帧`frame_meta`中`obj_meta_list`为空
[Some frames lose object meta after tracker](https://forums.developer.nvidia.com/t/some-frames-lose-object-meta-after-tracker/253281)

# 目标追踪算法综述
[目标追踪综述 - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/148516834)
[计算机视觉中，目前有哪些经典的目标跟踪算法？ - 知乎 (zhihu.com)](https://www.zhihu.com/question/26493945)

# ByteTracker
ByteTracker是当前业界使用最多的trakcer, 速度又快又准确

并且作者直接给deepstream框架做了low level lib, 编译后可以直接使用, 非常强大
[ByteTrack/deploy/DeepStream at main · ifzhang/ByteTrack (github.com)](https://github.com/ifzhang/ByteTrack/tree/main/deploy/DeepStream)


