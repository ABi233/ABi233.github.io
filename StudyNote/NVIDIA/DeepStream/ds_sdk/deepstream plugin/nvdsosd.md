[Gst-nvdsosd — DeepStream 6.3 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvdsosd.html)
osd插件负责绘制例如od框, 线段, 圆圈, 文本标签等元素

![image.png](https://pic-upload-for-abi.oss-cn-hangzhou.aliyuncs.com/img-bed/202311091006020.png)
osd插件的输入输出如上图所示
输入的图像像素格式限定为RGBA, 所以一般在osd前都会使用nvvideoconvert来进行一次像素格式的转换

## properties
如果是符合deepstream数据结构设计的后处理库产生的目标bbox数据, osd插件在相关绘制选项打开后, 会自动进行绘制
可以通过配置插件的属性来实现部分自动化的绘制

|Property|Meaning|Type and Range|Example Notes|
|---|---|---|---|
|gpu-id|Device ID of the GPU to be used for operation (dGPU only)|Integer, 0 to 4,294,967,295|gpu-id=0|
|display-clock|Indicates whether to display system clock|Boolean|display-clock=0|
|display-text|Indicates whether to display text|Boolean|display-text=0|
|clock-font|Name of Pango font to use for the clock for CPU process mode, name of TrueType font to use for the clock and other text for GPU process mode|String|clock-font=Arial|
|clock-font-size|Font size to use for the clock|Integer, 0-60|clock-font-size=2|
|x-clock-offset|X offset of the clock|Integer, 0 to 4,294,967,295|x-clock-offset=100|
|y-clock-offset|Y offset of the clock|Integer, 0 to 4,294,967,295|y-clock-offset=50|
|clock-color|Color of the clock to be set while display, in the order 0xRGBA|Integer, 0 to 4,294,967,295|clock-color=0xff0000ff (Clock is red with alpha=1)|
|process-mode|Indicates the mode used to draw the objects<br><br>Default mode: CPU mode<br><br>0: CPU mode<br><br>1: GPU mode|Integer, 0 to 2|process-mode=0|
|display-bbox|Control bounding box drawing|Boolean|display-bbox=1|
|display-mask|Controls instance mask drawing|Boolean|display-mask=1|
其中比较重要的:
- process-mode 选择osd处理的方式, 有cpu和gpu模式
- display-bbox 显示bbox框
- display-text 在bbox框上显示类别名称


如果是自定义数据结构的后处理库, 需要手动配置绘制元素的信息, text label的配置可以参考[[deepstream-test#osd_sink_pad_buffer_probe]]中的源码分析, 其他绘制元素的配置大同小异

## 绘制元素的数量限制
osd的单个绘制元素的数据类型为NvOSD_XXX, 参考API手册: [NVIDIA DeepStream SDK API Reference: On-Screen Display Manager | NVIDIA Docs](https://docs.nvidia.com/metropolis/deepstream/sdk-api/group__ee__nvosd__group.html)
![image.png](https://pic-upload-for-abi.oss-cn-hangzhou.aliyuncs.com/img-bed/202311091041428.png)

绘制元素由NvDsDisplayMeta结构拥有, 数据结构定义为:
可以看到一个display_meta可以hold住的单种元素的数量为**16**
也就是说一个display_meta可以记录16个矩形框, 16个线段, 16个文本框.etc
```cpp
/** Defines the maximum number of elements that a given display meta
 can hold. */
#define MAX_ELEMENTS_IN_DISPLAY_META 16

typedef struct NvDsDisplayMeta {
  NvDsBaseMeta base_meta;
  /** Holds the number of rectangles described. */
  guint num_rects;
  /** Holds the number of labels (strings) described. */
  guint num_labels;
  /** Holds the number of lines described. */
  guint num_lines;
  /** Holds the number of arrows described. */
  guint num_arrows;
  /** Holds the number of circles described. */
  guint num_circles;
  /** Holds an array of positional parameters for rectangles.
   Used to overlay borders or semi-transparent rectangles,
   as required by the application. @see NvOSD_RectParams. */
  NvOSD_RectParams rect_params[MAX_ELEMENTS_IN_DISPLAY_META];
  /** Holds an array of text parameters for user-defined strings that can be
   overlayed using this structure. @see NvOSD_TextParams. */
  NvOSD_TextParams text_params[MAX_ELEMENTS_IN_DISPLAY_META];
  /** Holds an array of line parameters that the user can use to draw polygons
   in the frame, e.g. to show a RoI in the frame. @see NvOSD_LineParams. */
  NvOSD_LineParams line_params[MAX_ELEMENTS_IN_DISPLAY_META];
  /** Holds an array of arrow parameters that the user can use to draw arrows
   in the frame. @see NvOSD_ArrowParams */
  NvOSD_ArrowParams arrow_params[MAX_ELEMENTS_IN_DISPLAY_META];
  /** Holds an array of circle parameters that the user can use to draw circles
   in the frame. @see NvOSD_CircleParams */
  NvOSD_CircleParams circle_params[MAX_ELEMENTS_IN_DISPLAY_META];
  /** Holds an array of user-defined OSD metadata. */
  gint64 misc_osd_data[MAX_USER_FIELDS];
  /** For internal use. */
  gint64 reserved[MAX_RESERVED_FIELDS];
} NvDsDisplayMeta;
```

NvDsDisplayMeta由`nvds_acquire_display_meta_from_pool(NvDsBatchMeta)`获取
在NvDsBatchMeta中有成员display_meta_pool, 一个display_meta就是display_meta_pool中的一个element
```cpp
typedef struct _NvDsBatchMeta {
...
  /** Holds a pointer to a pool of pointers of type @ref NvDsDisplayMeta,
   representing a pool of display metas. */
  NvDsMetaPool *display_meta_pool;
...
} NvDsBatchMeta;
```
NvDsMetaPool结构如下
保存了当前metapool中的element数量
```cpp
typedef struct _NvDsMetaPool {
  NvDsMetaType meta_type;
  guint max_elements_in_pool;
  guint element_size;
  guint num_empty_elements;
  guint num_full_elements;
  NvDsMetaList * empty_list;
  NvDsMetaList * full_list;
  NvDsMetaCopyFunc copy_func;
  NvDsMetaReleaseFunc release_func;
}NvDsMetaPool;
```

在人头计数项目中, 对pgie src pad进行probe
打印batch_meta->display_meta_pool, 发现其中最大element数量为8
根据一个display_meta中一种绘制元素的最大数量为16, batch_meta->display_meta_pool中的display_meta数量为8, 那么在一帧frame_meta上最多可以画128个单种元素
![Pasted image 20231109095709.png](https://pic-upload-for-abi.oss-cn-hangzhou.aliyuncs.com/img-bed/202311091003916.png)
### 实践
尝试使用`nvds_acquire_display_meta_from_pool`接口获取8个以上的display_meta, 并且测试id>8以后的display_meta获取到了有效的地址, 并且操作内部字段也正常

但是根据源码以及调试的信息来看, 这里超出max_element数量的display_meta是有内存越界的可能性的