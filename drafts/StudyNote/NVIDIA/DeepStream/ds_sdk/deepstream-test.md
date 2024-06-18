对于想要建立定制化应用的开发者来说, deepstream-test会比deepstream-app更加易于理解
![Pasted image 20230801171301.png](https://cdn.jsdelivr.net/gh/ABi233/pic-upload/obs/202310091415015.png)


- deepstream-test1可以学习如何使用deepstream插件来建立GStreamer流水线, 建立一个从视频文件->解码->批处理->物体识别->渲染识别结果框在屏幕上的流水线
- deepstream-test2在test1的基础上级联2级模型
- deepstream-test3展示如何使用多个视频流输入
- deepstream-test4使用message broker插件来建立物联网服务

更多的sample app源码可以阅读 [C/C++ Sample Apps Source Details](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_C_Sample_Apps.html) and [Python Sample Apps and Bindings Source Details](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_Python_Sample_Apps.html).

# C/C++ Sample Apps Source Details
https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_C_Sample_Apps.html#c-c-sample-apps-source-details

**几个有用的test源码**
- test1完成了从源获取到推理结果输出的全流程pipeline
	- osd_sink_pad_buffer_probe函数中展示了获取推理matedata的过程
	- 更多的细节可以参考gstnvdsmeta.h
- test2在test1的基础上级联2级模型, 并且加上tracker
- test3在test1的基础上, 加上多个源输入以及不同源方式输入, 并且使用streammux来batch frame, 达到比较好的资源利用效率
- test4在test1基础上, 加上message部分
- test5在test1基础上, 加上report callback部分(需要研究一下)
- Yolo detector, 包含配置文件以及自定义库实现(?), 当前包含Yolo v2, v2 tiny, v3, and v3 tiny
# 源码阅读
## deepstream-test1
### main
使用gst流程构建pipeline
element, pipeline创建和属性设置就是gst流程

配置pgie依旧使用object_set操作
```cpp
/* Set all the necessary properties of the nvinfer element,
* the necessary ones are : */
g_object_set (G_OBJECT (pgie), "config-file-path", "dstest1_pgie_config.txt", NULL);
//配置的就是configuration group中的字段
//如果需要手动配置其他字段, 也需要手动补上
```
使用yaml文件配置element有了属于deepstream的接口:
```cpp
if (yaml_config) {
    //使用yaml parse api来读取yml文件配置不同的group
    RETURN_ON_PARSER_ERROR(nvds_parse_file_source(source, argv[1],"source"));
    RETURN_ON_PARSER_ERROR(nvds_parse_streammux(streammux, argv[1],"streammux"));

    /* Set all the necessary properties of the inference element */
    RETURN_ON_PARSER_ERROR(nvds_parse_gie(pgie, argv[1], "primary-gie"));
}
```
### bus_call
拉起一个新的线程来处理任务消息
被[gst_bus_add_watch()](https://gstreamer.freedesktop.org/documentation/gstreamer/gstbus.html#gst_bus_add_watch)调用, 是一个回调函数, 常被用于在mian loop中获取异步消息
### osd_sink_pad_buffer_probe
- 获取nvinfer的metadata, 并且通过osd显示
    - 遍历batch数据中的每一帧, 读取framemeta中的objectmeta, 通过设置displaymeta将数据打在一条label上
被[gst_pad_add_probe()](https://gstreamer.freedesktop.org/documentation/gstreamer/gstpad.html#gst_pad_add_probe)调用, 也是一个回调函数, 在pad状态发生改变的时候发出通知，为匹配mask的状态来调用提供的回调函数
函数原型:
```cpp
gulong(typedef unsigned long) gst_pad_add_probe (GstPad * pad,
                    GstPadProbeType mask,
                    GstPadProbeCallback callback,
                    gpointer user_data,
                    GDestroyNotify destroy_data)
```

对于display_meta的配置
```cpp
GstBuffer *buf = (GstBuffer *) info->data;
NvDsBatchMeta *batch_meta = gst_buffer_get_nvds_batch_meta(buf);
NvDsDisplayMeta *display_meta = NULL;

... //获取batch_meta内的元数据

//通过batch_meta中的display_meta_pool获得一个display_meta数据
display_meta = nvds_acquire_display_meta_from_pool(batch_meta);
//创建一个osd_textparams
NvOSD_TextParams *txt_params  = &display_meta->text_params[0];
//设置当前display_meta中显示的label数
//查看数据结构得知还可以配置矩形框, 线条, 箭头, 圆圈元素的数量
display_meta->num_labels = 1;
//临时申请用于显示字符串的内存
txt_params->display_text = g_malloc0 (MAX_DISPLAY_LEN);
//输入需要显示的格式化字符串
offset = snprintf(txt_params->display_text, MAX_DISPLAY_LEN, "Person = %d ", person_count);
//通过上一条字符串长度的偏移, 可以设置下一条内存地址连续的字符串
offset = snprintf(txt_params->display_text + offset , MAX_DISPLAY_LEN, "Vehicle = %d ", vehicle_count);

/* Now set the offsets where the string should appear */
txt_params->x_offset = 10;
txt_params->y_offset = 12;

/* Font , font-color and font-size */
//c++中不能使用这样string to char*的隐式转换方法
txt_params->font_params.font_name = "Serif";
if (cpp) {
    char font_name_char[15] = "Serif";
    txt_params->font_params.font_name = font_name_char;
}
txt_params->font_params.font_size = 10;
txt_params->font_params.font_color.red = 1.0;
txt_params->font_params.font_color.green = 1.0;
txt_params->font_params.font_color.blue = 1.0;
txt_params->font_params.font_color.alpha = 1.0;

/* Text background color */
txt_params->set_bg_clr = 1;
txt_params->text_bg_clr.red = 0.0;
txt_params->text_bg_clr.green = 0.0;
txt_params->text_bg_clr.blue = 0.0;
txt_params->text_bg_clr.alpha = 1.0;

//将配置完毕的display_meta加入到frame_meta中
nvds_add_display_meta_to_frame(frame_meta, display_meta);
```

## deepstream-test2
pipeline构建流程与test1基本一致, 多了tracker和sgie的创建, 基本就是创建GSTElement对象加上配置confige-file-path参数
## deepstream-test3
pipeline与test1类似, 在输入级使用queue来进行多个源队列输入, 能够输入uri
### create_source_bin
使用nvurisrcbin插件来接受&解码输入数据

g_signal_connect处理decodebin的pad-added和child-added信号, 通过自定义的回调函数来创建pad
```c
  /* Connect to the "pad-added" signal of the decodebin which generates a
   * callback once a new pad for raw data has beed created by the decodebin */
  g_signal_connect (G_OBJECT (uri_decode_bin), "pad-added",
      G_CALLBACK (cb_newpad), bin);
  g_signal_connect (G_OBJECT (uri_decode_bin), "child-added",
      G_CALLBACK (decodebin_child_added), bin);
```
### cb_newpad

### decodebin_child_added


## deepstream-image-decode-test
输入jpeg/mjpg图片来进行推理流程
### main
pipeline流程比较类似test3
输入图片队列组合成一个source_bin, 其中直接连接filesrc->jpegparse->nvv4l2decoder, source_bin连接到streammux
之后进行常规的pipeline连接
    source_bin通过src pad与streammux的sink_%n pad连接起来(因为输入图片有多个, streammux的sink pad也有多个)

## deepstream-image-meta-test
对检测模型的推理结果进行抠图, 并且保存成jpg图片输出, 可以直接用于下一级模型或者element(数据在显存未搬移)
### main
pipeline和image-decode-test一致, 添加了两个接口`osd_sink_pad_buffer_probe`和`pgie_src_pad_buffer_probe`用于抠图与图片保存
### osd_sink_pad_buffer_probe
在osd sink pad上添加探针, 获取osd输入数据
保存jpg图片
### pgie_src_pad_buffer_probe
在pgie src pad上添加探针, 获取pgie输出数据
将检测到的对象编码为jpeg数据

## deepstream-infer-tensor-meta-test
用于获取nvinfer插件的输出tensor data, 包含detector和classifier
### main
streammux和source参考image-decode-test, 类似组成一个source-bin, 其中连接顺序为source->parser->decoder
将decoder连接到streammux的指定sink pad上, 再由streammux连接pipeline中的下游element

streammux与下游element连接顺序:
```c
gst_element_link_many (streammux, pgie, queue, sgie1, queue5,
          sgie2, queue6, sgie3, queue2, tiler, queue3, nvvidconv, queue4, nvosd,
          sink, NULL)
```
其中所有的gie推理插件都连接到一个queue, 最后在tiler中组合batch, 进行颜色转换与osd输出

使用`osd_sink_pad_buffer_probe`接口来获取osd sink pad接口数据
使用`pgie_pad_buffer_probe`接口来获取pgie src pad接口数据
使用`sgie_pad_buffer_probe`接口来获取tiler sink pad接口数据, 也就是所有模型推理结果保存在queue中的数据

### osd_sink_pad_buffer_probe
获取detector检测结果(检测对象数量统计), 输出在osd界面上
### pgie_pad_buffer_probe
> PGIE element in the pipeline shall attach its NvDsInferTensorMeta to each frame metadata on GstBuffer, here we will iterate & parse the tensor data to get detection bounding boxes. The result would be attached as object-meta(NvDsObjectMeta) into the same frame metadata.

pgie在GstBuffer数据的每个metadata frame中保存NvDsInferTensorMeta数据, 在这个接口中将会迭代和解析tensor data以及获取detector的bbox, bbox数据以NvDsObjectMeta结构保存在GstBuffer数据的每个metadata frame中

调用detector后处理接口`NvDsInferParseCustomResnet`来处理检测模型输出的bbox坐标转换
- 基本可以了解infer在detector流程中是怎么处理数据的

通过得到的输出信息配置bbox以及显示框的坐标, 边框样式等信息
### sgie_pad_buffer_probe
> All SGIE infer elements in the pipeline shall attach their NvDsInferTensorMeta to each object's metadata of each frame, here we will iterate & parse the tensor data to get classification confidence and labels. The result would be attached as classifier_meta into its object's metadata.

sgie保存数据的形式和pgie一致, 在每个frame的object's meatedata中保存NvDsInferTensorMeta数据, 在这个接口中迭代和解析tensor data用于获取分类置信度和标签, 这些数据以classifier_meta的形式保存在object's metadata中

从GstBuffer到NvDsInferTensorMeta的流程和`pgie_pad_buffer_probe`基本一致, 拿到meta后, 对其中的output layer数据进行处理, 过程基本和/libs/nvdsinfer_customparser/nvdsinfer_customclassifierparser.cpp一致
- 获取矩阵深度
- 遍历矩阵取出特征值/分类概率值(置信度)

将classifier metadata填充到obj meta中
配置显示分类标签的参数

获取输出层数据的数据结构包含关系可见:
![deepstream_custom_model.drawio.png](https://cdn.jsdelivr.net/gh/ABi233/pic-upload/obs/202310091415369.png)


## deepstream-appsrc-test
根据这个test所做的实例sample可以看[[使用appsrc组件的复用流水线搭建]]

和其他几个test的流水线区别主要在appsrc和appsink
### main
设计了一个AppSrcData结构体来保存appsrc组件内数据的信息
```cpp
/* Structure to contain all our information for appsrc,
 * so we can pass it to callbacks */
typedef struct _AppSrcData
{
  GstElement *app_source;
  long frame_size;
  FILE *file;                   /* Pointer to the raw video file */
  gint appsrc_frame_num;
  guint fps;                    /* To set the FPS value */
  guint sourceid;               /* To control the GSource */
} AppSrcData;
```
首先配置AppSrcData对象的像素格式, 长宽, 帧率(这些数据都是可执行文件的参数配置的)
创建appsrc和appsink组件
```cpp
/* App Source element for reading from raw video file */
data.app_source = gst_element_factory_make ("appsrc", "app-source");

appsink = gst_element_factory_make ("appsink", "app-sink");
```
配置appsrc组件的caps属性
```cpp
/* Configure appsrc */
g_object_set (data.app_source, "caps",
  gst_caps_new_simple ("video/x-raw",
      "format", G_TYPE_STRING, format,
      "width", G_TYPE_INT, width,
      "height", G_TYPE_INT, height,
      "framerate", GST_TYPE_FRACTION, data.fps, 1, NULL), NULL);
#if !CUSTOM_PTS
//如果 `CUSTOM_PTS` 未定义，`appsrc` 将自动为每个缓冲区添加时间戳（`do-timestamp` 设置为 `TRUE`）。这对于同步很重要，特别是在处理实时数据时
g_object_set (G_OBJECT (data.app_source), "do-timestamp", TRUE, NULL);
#endif
//将信号与回调函数连接
//当 `appsrc` 需要更多数据时，将触发 `need-data` 信号，此时调用 `start_feed` 函数
g_signal_connect (data.app_source, "need-data", G_CALLBACK (start_feed), &data);
//当 `appsrc` 有足够的数据时，将触发 `enough-data` 信号，此时调用 `stop_feed` 函数
g_signal_connect (data.app_source, "enough-data", G_CALLBACK (stop_feed), &data);
```

appsrc-test流水线连接顺序:
app-source -> nvvidconv -> caps filter -> nvinfer -> nvvidconv -> tee
    tee -> nvosd -> sink
    tee -> appsink
通过tee来把流水线的输出分为两路, 一路通过osd输出给屏幕渲染器, 一路输出给appsink, 通过API获取推理后的meta data做后续处理
### start_feed
添加一个用于主循环的idle handler, 用来给appsrc推送数据
```cpp
//将 `read_data` 函数添加到主循环中，确保在空闲时调用 `read_data` 函数
data->sourceid = g_idle_add ((GSourceFunc) read_data, data);
```
### read_data
- 创建和填充GstBuffer
```cpp
GstBuffer *buffer;

size_t ret = 0;
GstMapInfo map;

//创建一个新的gstbuffer
buffer = gst_buffer_new_allocate (NULL, data->frame_size, NULL);
//把map映射到buffer上
gst_buffer_map (buffer, &map, GST_MAP_WRITE);

//map填充实际的数据流
ret = fread (map.data, 1, data->frame_size, data->file);
map.size = ret;
//释放buffer和map的映射
gst_buffer_unmap (buffer, &map);
```
- 为appsrc填充buffer数据
```cpp
//使用gst_app_src_push_buffer将gstbuffer中的数据推送到appsrc中
gstret = gst_app_src_push_buffer ((GstAppSrc *) data->app_source, buffer);
if (gstret != GST_FLOW_OK) { //检查推送操作的返回值是否正常
    g_print ("gst_app_src_push_buffer returned %d \n", gstret);
    return FALSE;
}
```
- 处理EOF/EOS
```cpp
//如果 `ret == 0`，表示文件已经读取完毕，发送 End Of Stream（EOS）信号到 `appsrc`
gstret = gst_app_src_end_of_stream ((GstAppSrc *) data->app_source);
if (gstret != GST_FLOW_OK) {
    g_print("gst_app_src_end_of_stream returned %d. EoS not queued successfully.\n", gstret);
    return FALSE;
}
```

### stop_feed
停止为appsrc推送数据, 并且从主循环中把idle handler移除
## deepstream-user-metadata-test
这个sample用于介绍如何在probe中配置自定义的metadata
### main
一条正常的流水线, nvinfer->nvosd
### set_metadata_ptr
自定义user meta的创建&初始化实现
- 使用g_malloc0进行内存申请
- 在data中填入16位随机数
```cpp
void *set_metadata_ptr()
{
  int i = 0;
  gchar *user_metadata = (gchar*)g_malloc0(USER_ARRAY_SIZE);

  g_print("\n**************** Setting user metadata array of 16 on nvinfer src pad\n");
  for(i = 0; i < USER_ARRAY_SIZE; i++) {
    user_metadata[i] = rand() % 255;
    g_print("user_meta_data [%d] = %d\n", i, user_metadata[i]);
  }
  return (void *)user_metadata;
}
```
### copy_user_meta
自定义user meta的拷贝实现
```cpp
/* copy function set by user. "data" holds a pointer to NvDsUserMeta*/
static gpointer copy_user_meta(gpointer data, gpointer user_data)
{
  NvDsUserMeta *user_meta = (NvDsUserMeta *)data;
  gchar *src_user_metadata = (gchar*)user_meta->user_meta_data;
  gchar *dst_user_metadata = (gchar*)g_malloc0(USER_ARRAY_SIZE);
  memcpy(dst_user_metadata, src_user_metadata, USER_ARRAY_SIZE);
  return (gpointer)dst_user_metadata;
}
```
### release_user_meta
自定义user meta的释放实现
```cpp
/* release function set by user. "data" holds a pointer to NvDsUserMeta*/
static void release_user_meta(gpointer data, gpointer user_data)
{
  NvDsUserMeta *user_meta = (NvDsUserMeta *) data;
  if(user_meta->user_meta_data) {
    g_free(user_meta->user_meta_data);
    user_meta->user_meta_data = NULL;
  }
}
```
### nvinfer_src_pad_buffer_probe
调用以上内部接口来进行metadata的替换
```cpp
  NvDsMetaType user_meta_type = NVDS_USER_FRAME_META_EXAMPLE;
  NvDsBatchMeta *batch_meta = gst_buffer_get_nvds_batch_meta (buf);

    for (l_frame = batch_meta->frame_meta_list; l_frame != NULL;
      l_frame = l_frame->next) {
        NvDsFrameMeta *frame_meta = (NvDsFrameMeta *) (l_frame->data);

        /* Acquire NvDsUserMeta user meta from pool */
        // NvDsFrameMeta * frame_meta->NvDsMetaPool * user_meta_pool
        user_meta = nvds_acquire_user_meta_from_pool(batch_meta);

        /* Set NvDsUserMeta below */
        //配置自定义的user_meta_data内容
        user_meta->user_meta_data = (void *)set_metadata_ptr();
        user_meta->base_meta.meta_type = user_meta_type;
        //自定义user meta的拷贝实现
        user_meta->base_meta.copy_func = (NvDsMetaCopyFunc)copy_user_meta;
        //自定义user meta的释放实现
        user_meta->base_meta.release_func = (NvDsMetaReleaseFunc)release_user_meta;

        /* We want to add NvDsUserMeta to frame level */
        nvds_add_user_meta_to_frame(frame_meta, user_meta);
    }
    
```
### osd_sink_pad_buffer_probe
通过frame_meta->frame_user_meta_list获取user_meta数据, 打印填入的随机值, 验证metadata数据的替换是否成功

# reference
[Getting started with building apps](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_Overview.html#getting-started-with-building-apps)
