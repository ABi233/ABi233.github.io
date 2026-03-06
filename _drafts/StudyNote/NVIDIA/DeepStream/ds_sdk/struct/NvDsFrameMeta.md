- **FrameMeta**：FrameMeta 是单个视频帧的元数据。它包含了关于这一帧的详细信息，如检测到的对象、帧编号、流ID等。在一个 BatchMeta 中，可以有多个 FrameMeta，每个 FrameMeta 对应一个视频帧。

通过读取`NvDsFrameMeta->source_id`可以得到当前frame是来自于哪一个输入源, 通过遍历batchmeta中所有framemeta->sorce_id, 就可以得到此batch中包含了哪些输入源的数据