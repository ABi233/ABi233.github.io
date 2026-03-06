[Gst-nvvideoconvert — DeepStream 6.3 Release documentation (nvidia.com)](https://docs.nvidia.com/metropolis/deepstream/dev-guide/text/DS_plugin_gst-nvvideoconvert.html#gst-nvvideoconvert)

![image.png](https://pic-upload-for-abi.oss-cn-hangzhou.aliyuncs.com/img-bed/202310241630141.png)
# Features
nvvideoconvert插件能够做到
**缩放**
**转换数据内存类型** NVMM to NVMM, RAW to NVMM, and NVMM to RAW and RAW to RAW
**裁切输入和输出帧**

# Properties
|Property|Meaning|Type and Range|Example Notes|
|---|---|---|---|
|src-crop|指定输入图像的Pixel location: left:top:width:height, 将会裁切和转换输入图像到output buffer中. 如果crop坐标超出了图像边界, 将会把值限定在图像范围内. 这个属性配置将会应用到batch中所有输入图像上.|String|> src-crop=”20:40:150:100”|
|dest-crop|指定输出图像Pixel location: left:top:width:height, 将会裁切和转换输出图像. 如果crop坐标超出了图像边界, 将会把值限定在图像范围内. 这个属性配置将会应用到batch中所有输出图像上.|String|dest-crop=”20:40:150:100”|
|allow-odd-crop|允许使用奇数坐标来进行crop操作|Boolean|allow-odd-crop=1 Default value is 1.|


