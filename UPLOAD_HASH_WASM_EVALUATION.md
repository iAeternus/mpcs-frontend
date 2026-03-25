# 前端分片上传整文件 Hash 性能评估与 Rust + WASM 方案分析

## 1. 文档目的

本文用于评估以下问题：

当前前端在大文件分片上传前，需要先计算整文件 hash，这一步已经成为性能瓶颈。如果将这部分逻辑从现有 TypeScript / JavaScript 实现迁移为 `Rust + WASM`，是否能够带来显著性能提升，以及该方案是否值得落地。

本文基于当前项目中的真实实现进行分析，不是泛泛讨论。

相关代码位置：

- `src/pages/Home/features/hierarchy/components/useUploadHandler.ts`
- `src/apis/upload/index.ts`

## 2. 当前实现现状

当前大文件上传路径中，整文件 hash 的计算逻辑位于：

- `useUploadHandler.ts` 中的 `calculateFileHash(file)`

当前方案特点如下：

1. 使用 `SparkMD5.ArrayBuffer` 做增量 MD5 计算
2. 使用 `FileReader.readAsArrayBuffer` 分块读取文件
3. 按 `10 MB` 的 hash 分块顺序计算
4. 整个 hash 计算完成后，才会进入上传初始化流程
5. hash 计算运行在主线程

当前关键常量如下：

- `LARGE_FILE_THRESHOLD = 50 MB`
- `CHUNK_SIZE = 50 MB`
- `HASH_CHUNK_SIZE = 10 MB`
- `UPLOAD_CONCURRENCY = 10`

当前大文件上传流程可概括为：

1. 用户选择文件
2. 前端先完整计算整文件 hash
3. 调用 `initUploadApi(...)`
4. 后端返回是否已上传 / 断点续传状态 / `uploadId`
5. 前端开始上传各个分片
6. 全部分片完成后调用 `completeUploadApi(...)`

也就是说：

- `整文件 hash 计算处于上传关键路径上`
- `hash 算完之前，上传不会开始`

## 3. 当前瓶颈到底在哪里

这次问题的本质，不只是“TS 慢”。

当前性能瓶颈实际上由以下几个因素共同构成：

### 3.1 主线程执行

hash 计算现在跑在主线程中，会直接占用前端 UI 线程：

- 大文件时页面响应会变慢
- 进度弹窗更新会受影响
- 低配机器上更容易出现明显卡顿

### 3.2 文件读取与内存分配成本

虽然当前不是一次性读取整个文件，但每个 `10 MB` 分块仍然要经历：

1. `Blob.slice(...)`
2. `FileReader.readAsArrayBuffer(...)`
3. `ArrayBuffer` 分配
4. JS 哈希库处理字节数据

这部分本身就有固定成本。

### 3.3 纯 JS 哈希计算成本

`SparkMD5` 是成熟方案，但本质仍然是 JS 实现。对于几百 MB 到数 GB 文件：

- CPU 开销会上升明显
- 主线程占用会变重

### 3.4 上传链路串行化

当前流程中，必须先得到整文件 hash，才能继续初始化上传。所以哪怕后续分片上传并发度高，hash 这一步仍然是前置阻塞阶段。

## 4. Rust + WASM 会不会带来“巨大性能提升”

结论先说：

- `会带来明显提升`
- `但不应该默认认为一定是巨大提升`

### 4.1 可以带来的提升

如果将当前 `SparkMD5 + FileReader + 主线程` 替换为 `Rust + WASM`：

可能带来以下收益：

1. hash 核心计算更快
2. CPU 利用率更高
3. 对超大文件更友好
4. 如果配合 `Web Worker`，UI 卡顿会明显缓解

对于 hash 核心计算本身，通常可以期待：

- 约 `1.3x ~ 3x` 的计算性能提升

具体幅度取决于：

- 文件大小
- 浏览器实现
- 机器 CPU
- JS <-> WASM 数据传递方式

### 4.2 为什么不一定“巨大”

因为 WASM 不能消除以下成本：

1. 浏览器读取文件分块的成本
2. `Blob -> ArrayBuffer` 的成本
3. JS 和 WASM 之间的数据传递成本
4. hash 在上传前必须完成这一流程约束

所以如果只是把“纯 JS hash 库”替换成“WASM hash 库”，但仍然：

- 在主线程执行
- 按原样阻塞上传流程

那么最终端到端提升通常会是：

- 有改善
- 但未必达到“质变”

### 4.3 真正的大收益来自什么

真正能带来明显用户体验改善的，不只是 Rust，而是以下三件事叠加：

1. `将 hash 计算移出主线程`
2. `使用更高性能的 hash 引擎`
3. `尽量降低读取和拷贝开销`

因此，真正推荐的方向不是：

- 仅 Rust + WASM

而是：

- `Rust + WASM + Web Worker`

## 5. 是否值得做

结论：

- `值得做`
- 但建议分阶段推进，而不是直接大改

原因如下：

### 5.1 当前热点真实存在

当前实现中，整文件 hash 计算已经在关键路径上，并且是明确的性能热点。

### 5.2 接入点很清晰

当前项目结构已经比较适合替换：

- 现有 hash 逻辑集中在 `calculateFileHash(file)`
- 上传后续流程边界清楚
- 可以把 hash 逻辑抽象成单独模块

### 5.3 后端协议暂时无需大改

当前前端上传初始化接口依赖 `fileHash`。只要 Rust + WASM 最终仍输出和当前一致的 MD5 字符串，就可以保持：

- 秒传逻辑
- 断点续传逻辑
- 去重逻辑

不需要马上改后端协议。

## 6. 推荐方案

## 6.1 推荐结论

最推荐的最终方案是：

- `Rust + WASM + Web Worker`

这是当前场景下性能、可维护性和工程可行性最平衡的方案。

## 6.2 不建议的方案

### 方案 A：仅把 JS hash 换成 Rust + WASM，但仍在主线程执行

不推荐。

原因：

- 只能提升一部分计算速度
- UI 卡顿问题仍然存在
- 用户体感不会达到最佳

### 方案 B：直接改成后端算 hash

当前不适合作为直接替代方案。

虽然项目里有：

- `computeFileHashApi(file)`

但当前大文件上传设计依赖：

- 上传前先得到整文件 hash

如果把 hash 挪到后端，意味着：

- 可能要先把文件上传到后端才能算 hash
- 与当前断点续传 / 秒传初始化逻辑不匹配

除非后端协议整体重构，否则不建议把它当作当前问题的主方案。

## 7. 建议的实施路径

建议按以下阶段推进：

### 第一阶段：先把 hash 逻辑做成抽象层

把当前：

- `calculateFileHash(file)`

抽象成统一接口，例如：

```ts
export interface HashProgress {
  processedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface FileHashEngine {
  calculate(
    file: File,
    onProgress?: (progress: HashProgress) => void,
  ): Promise<string>;
}
```

目的：

- 让未来替换实现时，不影响上传主流程

### 第二阶段：先做 Worker 化验证

先保留 `SparkMD5`，但把 hash 计算搬到 `Web Worker`。

好处：

1. 技术风险最低
2. 可以先验证“主线程阻塞”是不是主要问题
3. 可以先得到一版低成本收益

### 第三阶段：引入 Rust + WASM

在 Worker 内部，把 JS hash 引擎替换成 Rust + WASM。

这样可以叠加：

- 更高的 hash 性能
- 更流畅的前端交互

### 第四阶段：AB 对比与灰度

建议至少对比三组数据：

1. 当前主线程 JS 方案
2. Worker + JS 方案
3. Worker + Rust/WASM 方案

重点观察：

- 总 hash 时间
- 主线程卡顿情况
- 上传总耗时
- 内存占用

## 8. 推荐的最终架构

### 主线程职责

主线程负责：

1. 打开上传进度 UI
2. 启动 Worker
3. 把文件对象传给 Worker
4. 接收 hash 进度
5. 接收最终 hash
6. 继续调用现有上传初始化接口

### Worker 职责

Worker 负责：

1. 分块读取文件
2. 把字节流喂给 WASM hash 引擎
3. 定期回传进度
4. 返回最终 hash

### Rust + WASM 模块职责

Rust 模块负责：

1. 增量 hash 状态维护
2. 高性能字节处理
3. 最终 hash 输出

## 9. 与当前项目的契合度分析

当前项目与该方案高度契合，原因如下：

### 9.1 现有 hash 逻辑集中

当前热点集中在一个函数中，适合替换，不会到处散落难以收口。

### 9.2 上传协议已成熟

前端只要继续产出相同格式的 `fileHash`，后续上传逻辑可保持不动。

### 9.3 项目已有 wasm 相关基础

从当前环境看，已有 `wasm-pack` 相关许可和使用历史，说明项目引入 WASM 工具链的门槛不算高。

## 10. 风险分析

### 10.1 MD5 兼容性风险

当前使用的是 `SparkMD5`。如果改用 Rust 实现，必须保证：

- 同一文件输出完全一致的 MD5 十六进制字符串

否则会影响：

- 秒传判断
- 断点续传
- 去重逻辑

### 10.2 工程复杂度提升

引入 Rust + WASM 会新增：

- Rust 工程
- `wasm-pack` 或其他构建流程
- Worker 与 WASM 的打包集成

### 10.3 跨浏览器兼容与降级

虽然现代浏览器对 Worker 和 WASM 支持普遍较好，但仍建议：

- 保留 JS fallback
- 保留 worker fallback

### 10.4 内存控制

如果 chunk 过大，哪怕是 WASM，也可能造成：

- 内存峰值过高
- 浏览器 GC 压力增大

所以即使换成 WASM，也不建议盲目增大分块。

## 11. 性能收益预估

以下为更现实的预估：

### 场景一：仅改成 Worker + JS

收益重点：

- UI 更流畅
- 用户体感提升明显
- 纯计算速度提升有限

### 场景二：改成 Rust + WASM，但仍在主线程

收益重点：

- hash 时间缩短
- UI 卡顿仍明显

### 场景三：改成 Worker + Rust + WASM

收益重点：

- hash 时间下降
- UI 卡顿明显缓解
- 体感提升最明显

结论：

如果目标是“用户真正感觉更快”，第三种方案最合理。

## 12. 推荐决策

建议团队采用如下决策：

### 推荐结论

`应该做，但要按阶段实施`

### 推荐顺序

1. 先抽象 hash 逻辑
2. 先做 Worker 化
3. 再引入 Rust + WASM
4. 用真实 benchmark 决定是否全面切换

### 不建议

不建议直接在没有 benchmark 的前提下，把“Rust + WASM”当作一定能带来巨大收益的银弹。

更准确的表述应该是：

- `这是一个值得做、且很可能带来明显收益的方向`

而不是：

- `一定会在所有场景下带来巨大性能提升`

## 13. 参考实现示例

以下代码仅作为方案说明，不要求现在落地。

### 13.1 Rust 侧增量 MD5 示例

```rust
use md5::{Context, Digest};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Md5Hasher {
    ctx: Context,
}

#[wasm_bindgen]
impl Md5Hasher {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Md5Hasher {
        Md5Hasher { ctx: Context::new() }
    }

    pub fn update(&mut self, bytes: &[u8]) {
        self.ctx.consume(bytes);
    }

    pub fn finalize_hex(self) -> String {
        let digest: Digest = self.ctx.finalize();
        format!("{:x}", digest)
    }
}
```

### 13.2 Worker 侧示例

```ts
import init, { Md5Hasher } from "./pkg/upload_hash_wasm";

self.onmessage = async (event) => {
  const { file, chunkSize } = event.data;
  await init();

  const hasher = new Md5Hasher();
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    const buffer = await chunk.arrayBuffer();
    hasher.update(new Uint8Array(buffer));
    offset += chunkSize;

    self.postMessage({
      type: "progress",
      processedBytes: offset,
      totalBytes: file.size,
      percent: Math.min(100, Math.round((offset / file.size) * 100)),
    });
  }

  self.postMessage({
    type: "done",
    hash: hasher.finalize_hex(),
  });
};
```

### 13.3 前端接入示例

```ts
const worker = new Worker(new URL("./hash.worker.ts", import.meta.url), {
  type: "module",
});

worker.postMessage({
  file,
  chunkSize: 10 * 1024 * 1024,
});

worker.onmessage = (event) => {
  if (event.data.type === "progress") {
    setHashProgress(event.data.percent);
  }

  if (event.data.type === "done") {
    resolve(event.data.hash);
  }
};
```

## 14. 验证清单

如果后续要真正实施，建议至少验证以下内容：

1. Rust/WASM 输出的 MD5 与 `SparkMD5` 完全一致
2. 大文件上传秒传逻辑不回归
3. 断点续传逻辑不回归
4. 主线程卡顿显著下降
5. 超大文件下内存峰值可接受
6. Worker 生命周期正确回收
7. WASM 加载失败时可以回退到 JS 实现

## 15. 最终结论

针对当前这个 issue，结论如下：

- 当前整文件 hash 计算确实是前端上传链路中的性能瓶颈
- 使用 `Rust + WASM` 是可行且值得投入的方向
- 但真正高价值的方案不是“只把 TS 改成 WASM”
- 而是 `Rust + WASM + Web Worker + 可替换 hash 抽象`

因此，推荐落地策略是：

1. 先抽象现有 hash 逻辑
2. 先做 Worker 化验证收益
3. 再引入 Rust + WASM 替换 hash 引擎

如果团队要一个一句话决策建议：

`值得做，预期收益明显，但应按阶段推进，最佳落地形态是 Rust + WASM 运行在 Web Worker 中。`

