[Gst-nvstreammux — DeepStream 6.3 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvstreammux.html)

[Gst-nvstreammux New — DeepStream 6.3 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvstreammux2.html)
[插件 Gst-nvstreammux New (Beta) - 知乎 (zhihu.com)](https://zhuanlan.zhihu.com/p/478894260)

streamux插件主要是对多个输入源的数据流进行batch操作
- streammux存在一个nvstreammux new的新版本插件, 是从ds5.0开始新建立的
- 当前可以默认依旧为老版本的streammux, 可以通过环境变量`export USE_NEW_NVSTREAMMUX=yes`来开启使用streammux new
- 在后续的更新中, 旧版本streammux将会弃用, 默认使用streammux new
# sink & src
**输入输出数据类型如下:**
streammux
![image.png](https://pic-upload-for-abi.oss-cn-hangzhou.aliyuncs.com/img-bed/202312021500864.png)
streammux new
![image.png](https://pic-upload-for-abi.oss-cn-hangzhou.aliyuncs.com/img-bed/202312021504411.png)


# feature
## old
> When connecting a source to nvstreammux (the muxer), a new pad must be requested from the muxer using `gst_element_get_request_pad()` and the pad template `sink_%u`.

每个输入源需要连接到streammux的sink pad上, pad会以sink_%u的形式命名

> The muxer pushes the batch downstream when the batch is filled, or the batch formation timeout batched-pushed-timeout is reached. The timeout starts running when the first buffer for a new batch is collected.

当出现1. batch队列已经填满 2. 组batch的时间超过batched-pushed-timeout设置的值, muxer会将batch推给下游组件

> The muxer uses a round-robin algorithm to collect frames from the sources. It tries to collect an average of (batch-size/num-source) frames per batch from each source (if all sources are live and their frame rates are all the same).  The number varies for each source, though, depending on the sources’ frame rates.

streammux会在输入源的帧率相同的情况下尽可能从每个源中收集每个批次的平均帧(batch size/num source), 并不是随机从源中获取帧; 但是收集到的每个输入源的帧数也会存在不相同的情况, 这取决于输入源的帧率

> The muxer outputs a single resolution (i.e. all frames in the batch have the same resolution). This resolution can be specified using the width and height properties. The muxer scales all input frames to this resolution. The enable-padding property can be set to true to preserve the input aspect ratio while scaling by padding with black bands.

muxer需要输出完全一致的分辨率, 也就是batch内的每一帧都是一致的分辨率. 可以通过streammux的width和height属性来设置输出分辨率, muxer将会对所有帧进行这个设定分辨率下的scale操作; 如果开启了enable-padding, 那么muxer将会保留帧的原始宽高比, 并且用黑色背景填充无像素的部分.

输入源的分辨率会记录在`NvDsFrameMeta`的`source_frame_width`和`source_frame_height`字段中
streammux输出分辨率会记录在`NvDsFrameMeta`的`pipeline_width`和`pipeline_height`字段中

> Set the live-source property to true to inform the muxer that the sources are live. In this case the muxer attaches the PTS of the last copied input buffer to the batched Gst Buffer’s PTS. If the property is set to false, the muxer calculates timestamps based on the frame rate of the source which first negotiates capabilities with the muxer.
> 
> The muxer supports calculation of NTP timestamps for source frames. It supports two modes. In the system timestamp mode, the muxer attaches the current system time as NTP timestamp. In the RTCP timestamp mode, the muxer uses RTCP Sender Report to calculate NTP timestamp of the frame when the frame was generated at source. The NTP timestamp is set in `ntp_timestamp` field of `NvDsFrameMeta`. The mode can be toggled by setting the `attach-sys-ts` property. For more details, refer to section NTP Timestamp in DeepStream.

streamux对于实时流的时间戳也有一些处理: 
开启live-source选项告诉muxer输入源是直播视频, muxer会将最后复制的输入缓冲区的PTS用作批处理的 GstBuffer的PTS上;
关闭live-source选项, muxer将会使用视频的帧率来计算时间戳
*PTS主要用于度量解码后的视频帧什么时候被显示出来*
*[H264中的时间戳（DTS和PTS)](https://blog.csdn.net/youzhouliu/article/details/78270238)*

streamux同时支持计算NTP时间戳([NTP时间戳和UTC时间戳互转及其原理](https://blog.csdn.net/qing310820/article/details/111310721)), 计算结果将会写入`NvDsFrameMeta`的`ntp_timestamp`字段中
通过配置attach-sys-ts字段, 可以选择不同的计算模式:
attach-sys-ts设置为true, 使用system timestamp mode, muxer会使用系统时间来计算NTP时间戳
设置为false, 使用RTCP timestamp mode, muxer会通过RTCP Sender的报文来计算当前帧的NTP时间戳

> The muxer attaches an `NvDsBatchMeta` metadata structure to the output batched buffer. This meta contains information about the frames copied into the batch (e.g. source ID of the frame, original resolutions of the input frames, original buffer PTS of the input frames). The source connected to the `Sink_N` pad will have `pad_index` `N` in `NvDsBatchMeta`.

muxer会将输出的组合好的batch加入到一个`NvDsBatchMeta`中, 这个metadata会包含当前批次中每一帧的metadata信息, 在`NvDsBatchMeta->frame_meta_list`中
*更多metadata结构体的信息记录在[[NvDsBatchMeta]]和[[NvDsFrameMeta]]中*
`Sink_N`和 `NvDsBatchMeta`中的`pad_index` `N`字段会对应起来

> The muxer supports addition and deletion of sources at run time. When the muxer receives a buffer from a new source, it sends a `GST_NVEVENT_PAD_ADDED` event. When a muxer sink pad is removed, the muxer sends a `GST_NVEVENT_PAD_DELETED` event. Both events contain the source ID of the source being added or removed (see `sources/includes/gst-nvevent.h`). Downstream elements can reconfigure when they receive these events. Additionally, the muxer also sends a `GST_NVEVENT_STREAM_EOS` to indicate EOS from the source.

streammux支持在运行时动态地添加或者删除源. 当新增一个源时, muxer会发送一个`GST_NVEVENT_PAD_ADDED`事件; 当移除一个源时, muxer会发送一个`GST_NVEVENT_PAD_DELETED`事件; 当muxer读完了源, 也会发送一个`GST_NVEVENT_STREAM_EOS`事件
### batch size
`nvstreammux` 插件用于将来自多个输入流的视频帧合并为一个批处理。`batch-size` 参数指定了每个批处理包含的帧数。例如，如果 `nvstreammux` 的 `batch-size` 设置为 4，那么它将从各个输入流中收集 4 帧，将它们合并为一个批处理，然后发送给下一个插件。
#### 和nvinfer batch size的区别
streammux的batch-size和nvinfer的batch-size是可以不一致的
`nvinfer` 插件用于对输入的视频帧进行推理处理（如目标检测、分类等）。`nvinfer` 的 `batch-size` 指定了它在每次推理操作中可以处理的帧数。如果 `nvinfer` 的 `batch-size` 设置为 1，那么它在每次推理中只处理一个帧

当 `nvstreammux` 的 `batch-size` 大于 `nvinfer` 的 `batch-size` 时，`nvinfer` 将顺序处理来自 `nvstreammux` 的每个批处理中的帧。例如，如果 `nvstreammux` 的 `batch-size` 是 4 而 `nvinfer` 的 `batch-size` 是 1，则 `nvinfer` 会对 `nvstreammux` 发送的每个批处理中的四帧逐一进行推理
## new
- 不再支持streammux内的resize操作
- 不再限制streammux输出分辨率
- 支持动态修改confie file
- 支持帧率控制组合batch阈值
### 切换到streammux new版本
设置环境变量来使用nvstreammux new
```bash
export USE_NEW_NVSTREAMMUX=yes
```
# streammux使用技巧
[How to set parameters reasonably to improve the efficiency of nvstreammux in live mode](https://forums.developer.nvidia.com/t/deepstream-sdk-faq/80236/34#:~:text=26.%5BDeepstream6.2%20Gst%2Dnvstreammux%20%26%20Gst%2Dnvstreammux%20New%5DHow%20to%20set%20parameters%20reasonably%20to%20improve%20the%20efficiency%20of%20nvstreammux%20in%20live%20mode)
## streammux 和 streammux new在组合batch策略上的差异
streammux通过`batched-push-timeout`来设置batch的超时时间
streammux new不再支持`batched-push-timeout`方式来设定组合batch的超时阈值, 转而通过设置最小/最大帧率来作为组合batch的等待策略

并且在[Running new nvstreammux offline / non-live with batching of a single source - Intelligent Video Analytics / DeepStream SDK - NVIDIA Developer Forums](https://forums.developer.nvidia.com/t/running-new-nvstreammux-offline-non-live-with-batching-of-a-single-source/262572)这个issuse中, 官方有提到"New nvstreammux is designed to sync multiple sources. If you want to batch the frames in one stream, please use nvstreammux. nvstreammux and new nvstreammux will co-exist. They are for different scenarios.", 两个插件是用于不同的场景的, streammux new其实更加适合多个不同帧率的live stream组合batch的场景

一个定位过程很丰富的issue[Nvstreammux (new) plugin is broken in DS 6.2 release - Intelligent Video Analytics / DeepStream SDK - NVIDIA Developer Forums](https://forums.developer.nvidia.com/t/nvstreammux-new-plugin-is-broken-in-ds-6-2-release/251616/7), 可以后续来参考

并且在测试发现, streammux new使用batch策略默认值时, 组合图片队列时batch size是不固定的, 基本为11~15个frame组一个batch
这里就会出现如果模型的batch size是超过15的, 那么streammux new默认组合图片队列出的batch是会低于模型batch的
- 经过测试, batchsize=64的模型流水线中, 使用streammux组合出batch=64的数据和使用streammux new组合出多个batch=11~15的数据, 在实际推理流程中, 并没有明显的耗时差异
## streammux组合batch乱序现象
有一个类似现象的issue[Error when setting streammux's batchsize >1 for custom model - Intelligent Video Analytics / DeepStream SDK - NVIDIA Developer Forums](https://forums.developer.nvidia.com/t/error-when-setting-streammuxs-batchsize-1-for-custom-model/202917), 但是没有实际解决问题以及讲述原因

在流水线测试中发现streammux组合出的batch_meta中的frame_meta_list的frame并不是一定按照sink pad连接顺序来排序的
通过"The source connected to the `Sink_N` pad will have `pad_index` `N` in `NvDsBatchMeta`."可以得知sink_n和pad_index字段是对应起来的, 不过源码的结构体定义中`NvDsFrameMeta`才拥有`pad_index`字段, 实际测试中也确实和sink_n对应

`NvDsFrameMeta`中还有一个`source_id`用于记录输入streammux的源序号, 其实和`pad_index`的含义是一致的

