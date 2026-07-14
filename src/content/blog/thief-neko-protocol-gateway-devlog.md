---
title: 从 500 次额度到协议网关：Thief Neko 开发笔记
description: 把 Catpaw 的 GLM-5.2 接入 Claude Code 与 Codex：从协议转换、工具调用和 SSE，到凭证刷新与长会话治理。
pubDate: 2026-07-14
tags:
  - ai
  - gateway
  - protocol
  - nodejs
  - devlog
---

最开始，我手里只有 Catpaw 提供的一批 GLM-5.2 调用额度。

我的目标也很直接：把这些额度接入 Claude Code，让模型不只是回答问题，还能读取项目、修改文件、运行命令，完成一整段开发任务。

当时我以为，只要写一个反向代理就够了：收到 Claude Code 的请求，转发给 Catpaw，再把结果原样返回。真正开始后才发现，两端虽然都在调用大模型，说的却不是同一种“协议语言”。

最后，这个小代理逐渐变成了 **Thief Neko**：一个同时支持 Anthropic Messages、OpenAI Chat Completions 和 OpenAI Responses 的有状态协议网关。

这篇文章不只记录它做了什么，更想讲清楚一个问题：**怎样判断一个大模型网关是真的可用，而不是仅仅能够返回文字。**

## 先定义“跑通”到底是什么

网关第一次返回模型文本时，我以为主要工作已经完成了。

但 Claude Code 一进入工具调用就暴露了问题。模型会说“我将浏览项目”，随后输出一段看起来很像操作计划的文字，然后直接结束。Catpaw 的额度已经扣除，Claude Code 却没有执行任何工具。

这说明“模型有回复”只是最弱的一层成功。对于 Agent 客户端，至少要依次验证四件事：

1. 普通文本能够正确返回。
2. 模型能发出结构化工具调用，而不是用文字假装调用。
3. 客户端执行工具后，结果能回到同一轮会话中。
4. 模型能根据工具结果继续工作，直到给出最终答案。

我后来把真正的最小验收条件定成了一个工具闭环：

```text
模型请求 Write
    ↓
客户端创建文件
    ↓
模型请求 Read
    ↓
客户端读回刚才的内容
    ↓
模型请求 Edit
    ↓
最终返回 LOCAL_TOOL_LOOP_OK
```

只有这个闭环完成，才说明请求、工具、结果与会话状态都接上了。

## 反向代理为什么不够

Claude Code 使用 Anthropic Messages 协议，Catpaw 内部更接近 OpenAI Chat Completions 加上自己的 Agent 会话格式。两边的差异不只是字段名，而是至少分成四层：

| 层级 | 需要转换的内容 |
| --- | --- |
| 消息层 | `system`、`user`、`assistant`、内容块与多段文本 |
| 工具层 | `tool_use`、`tool_result`、`tool_calls`、参数增量与结束原因 |
| 流式层 | OpenAI SSE chunk 与 Anthropic 事件序列 |
| 状态层 | `conversationId`、`suggestUuid`、工作区路径、历史与凭证 |

如果只处理第一层，聊天通常可以工作；一旦进入工具循环、流式输出或长会话，问题就会集中出现。

所以 Thief Neko 后来的结构更接近这样：

```text
Claude Code / Codex / OpenAI Client
                ↓
Anthropic Messages / Responses / Chat Completions
                ↓
消息、工具、流、路径和会话状态归一化
                ↓
Catpaw Native Agent
                ↓
GLM-5.2
```

这里最重要的设计决定，是先建立统一的中间表示，再分别适配每一种客户端和上游。否则每增加一种协议，都要和现有协议两两转换，复杂度会很快失控。

## 第一步：不要把结构化内容压成纯文本

Anthropic 的一条消息可以包含多个内容块。例如，助手可以先输出文字，再发出一个 `tool_use`；用户下一轮则用 `tool_result` 返回执行结果。

转换到 OpenAI 格式时，关键映射大致是：

```text
Anthropic tool_use.id       → OpenAI tool_calls[].id
Anthropic tool_use.name     → OpenAI tool_calls[].function.name
Anthropic tool_use.input    → OpenAI tool_calls[].function.arguments
Anthropic tool_result       → OpenAI role: tool
Anthropic tool_use_id       → OpenAI tool_call_id
```

简化后的转换代码可以写成：

```js
function anthropicMessageToOpenAI(message) {
  const blocks = Array.isArray(message.content)
    ? message.content
    : [{ type: 'text', text: message.content ?? '' }];

  const results = blocks
    .filter((block) => block.type === 'tool_result')
    .map((block) => ({
      role: 'tool',
      tool_call_id: block.tool_use_id,
      content: toText(block.content),
    }));

  if (results.length > 0) return results;

  return [{
    role: message.role,
    content: blocks
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n'),
    tool_calls: blocks
      .filter((block) => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        },
      })),
  }];
}
```

这里有两个容易忽略的细节。

第一，工具调用的 ID 必须原样保留。后面的工具结果依靠这个 ID 找到对应调用，随便生成一个新 ID 会让会话在下一轮断开。

第二，不能把 `tool_result` 拼进普通用户文本。模型也许仍能读懂内容，但客户端和上游都失去了“这是某次工具调用结果”的结构信息。

## 第二步：工具调用必须形成状态机

工具调用不是一个孤立 JSON，而是一段有顺序的状态变化：

```text
等待模型
  → 收到 tool_use
  → 等待客户端执行
  → 收到 tool_result
  → 继续请求模型
  → 收到下一个 tool_use 或最终文本
```

因此，网关至少要记录：

- 当前调用属于哪次会话。
- 工具调用的 ID、名称和参数。
- 工具结果属于哪个调用。
- 当前轮是正常结束，还是以 `tool_calls` / `tool_use` 结束。
- 上游要求继续使用的 `conversationId` 和 `suggestUuid`。

最初的实现缺少这些状态，所以模型能够“提出要做什么”，却无法让客户端真正接管执行。

在请求侧，我还加入了一条明确的工具协议指令：需要操作时必须使用客户端声明的函数，不能只在文本中描述动作。第一次请求可以要求模型必须选择工具；收到工具结果后再切回 `auto`，让模型决定继续调用还是结束。

这不是为了靠提示词修复协议，而是让模型和转换层遵守同一份契约。真正的工具结构仍然要由网关验证。

## 第三步：SSE 转换要重建事件，而不是改字段名

流式输出是第二个大坑。

OpenAI 风格的接口通常不断返回 `choices[0].delta`。Anthropic 则要求一组有严格顺序的 SSE 事件：

```text
message_start
content_block_start
content_block_delta
content_block_stop
message_delta
message_stop
```

工具调用还要使用独立的 `content_block`，参数通过 `input_json_delta` 发送。只把 OpenAI chunk 的字段名改成 Anthropic 字段名，客户端并不会正确识别。

Thief Neko 为此使用一个流构建器，逐块收集文本、工具参数、结束原因和 Token 统计，再按 Anthropic 需要的顺序发出事件。

另一个问题是，上游部分内容不是增量，而是累计快照：

```text
第 1 块：正在读取
第 2 块：正在读取项目
第 3 块：正在读取项目文件
```

如果把三块全部当增量转发，客户端看到的就会是：

```text
正在读取正在读取项目正在读取项目文件
```

处理这种流时，必须先识别它属于快照还是增量。最简单的思路是比较上一块和当前块的公共前缀，只发新增部分；实际环境还要处理重复段落、空 chunk、工具参数分片，以及快照突然回退或改写的情况。

这也是为什么流式协议最好单独做成状态机，并为缓冲区设置上限。无上限地“先存起来再说”，长任务最终一定会变成内存问题。

## 第四步：路径也是协议的一部分

Claude Code Desktop 的工具可能运行在 Windows 主机，也可能运行在本地 Agent 的虚拟工作区。于是同一个文件会同时出现两种路径：

```text
F:\project\src\index.js
/sessions/<session>/mnt/project/src/index.js
```

如果把虚拟路径交给主机上的 Read / Write / Edit，工具会找不到文件；反过来，把 Windows 路径交给虚拟环境里的 shell，也会失败。

因此路径转换不能写成一个全局字符串替换，而要带上工具运行位置：

- 主机原生文件工具使用真实 Windows 路径。
- 虚拟环境 shell 使用 `/sessions/.../mnt/...` 挂载路径。
- 没有精确映射时，先检查当前工作目录和挂载目录，而不是猜路径。
- shell 命令字符串不能随意改写，否则引号和转义很容易被破坏。

这个问题让我意识到，协议适配不只发生在 HTTP 层。**只要两端对同一件事有不同表示，它就是协议的一部分。**

## 第五步：把凭证刷新做成单航班

网关运行一段时间后，Claude Code 偶尔会提示 API Key 无效并退出登录。排查 Clash、IP 和服务配置后，我确认 Catpaw 的登录凭证会在运行期间刷新。

如果网关还拿着旧 Token，上游返回 401；Claude Code 会把这个 401 理解为用户配置的 API Key 已失效，于是中断整个开发会话。

修复思路分成三层：

1. 定时读取登录状态，发现新 Token 后热更新。
2. 请求遇到 401 时主动刷新凭证，并透明重试一次。
3. 多个并发请求同时遇到 401 时，只允许一个刷新任务运行。

第三点很重要。否则十个失败请求会同时刷新十次，既浪费资源，也可能互相覆盖状态。简化后的“单航班”逻辑如下：

```js
async function refreshAfterUnauthorized(usedToken) {
  if (state.token !== usedToken) return true;

  while (refreshPromise) {
    await refreshPromise;
    if (state.token !== usedToken) return true;
  }

  const task = refreshUntilChanged(usedToken);
  refreshPromise = task;

  try {
    return await task;
  } finally {
    if (refreshPromise === task) refreshPromise = null;
  }
}
```

这里还要区分两种 401：

- 如果失败请求使用的已经是旧 Token，说明别的请求刚刚刷新完成，直接用新 Token 重试。
- 如果当前 Token 也被拒绝，才真正发起新一轮刷新。

如果暂时拿不到新凭证，网关返回临时 503，而不是把上游 401 原样交给客户端。503 表示“服务暂时不可用，可以稍后重试”；401 则会被客户端理解成“你的永久配置错了”。正确的错误语义，本身也是兼容性的一部分。

Windows 版本后来使用 DPAPI 保存登录会话，Linux 版本使用 AES-256-GCM 加密，并由独立凭证服务提供给网关。这样 Thief Neko 不再需要一直依赖 Catpaw 桌面端运行。

## 第六步：长任务必须给所有状态加边界

五分钟测试通过，不代表一到三小时的 Agent 任务也能稳定运行。

长任务会放大所有没有上限的数据结构：会话 Map、工具参数缓冲、请求历史、流缓冲、活动列表和日志文件。于是我为每一类资源都定义了明确边界。

当前默认值大致如下：

| 资源 | 默认上限 |
| --- | ---: |
| Agent 会话 | 128 个 |
| 会话存活时间 | 6 小时 |
| 请求体 | 10 MiB |
| 历史上下文 | 256 KiB |
| 流缓冲 | 4 MiB |
| 最近活动记录 | 100 条 |
| 单个日志文件 | 10 MiB，保留 3 份 |

历史压缩也不能简单删除最旧消息。工具调用和工具结果是一对，如果只删掉其中一半，剩余上下文就会变成非法历史。

Thief Neko 的压缩规则是：

- 保留系统指令与最初任务，避免模型忘记目标。
- 优先保留最近完整的工具调用与结果。
- 工具配对作为一个整体删除或保留。
- 大型工具结果只保留首尾摘要。
- 完整输出落盘，需要时再由工具读取。

这类治理没有直接增加功能，却决定了网关能不能从“演示可用”走到“日常可用”。

## 失败要被识别，而不是无限重试

长会话还暴露出几种典型退化：

- 工具参数因为 Windows 末尾反斜杠而成为不完整 JSON。
- 模型持续用同一组错误参数重试。
- 工具对象被错误转成 `[object Object]`。
- 模型陷入只读搜索，却始终不修改文件。
- 工具调用被输出成普通文本标签。

例如模型偶尔会输出：

```text
mcp__workspace__bash<arg_key>command</arg_key><arg_value>...</arg_value>
```

它看起来像工具调用，实际却在普通文本里。网关不能看到类似格式就强行执行，否则用户文章或代码示例里的同类文本也会被误判。

现在的恢复条件是：工具名必须确实由客户端声明，参数标签必须完整，解析后的结构还要通过工具 schema 校验。只要任何一项不满足，就保留为普通文本。

对于重复失败，也要设置恢复预算。v0.2.3 开始只允许自动清理坏轮次并恢复一次；如果同类错误继续出现，就停止本地循环并把原因交给用户。无限重试看起来很积极，实际上只是在持续消耗额度。

## 版本迭代背后的问题线

回头看这些版本，每一版解决的都不是孤立 bug，而是一层新的可靠性问题：

| 版本 | 解决的问题 |
| --- | --- |
| v0.1.0 | Anthropic Messages、文件工具、Windows 路径和桌面控制器 |
| v0.2.0 | 独立登录、Linux 服务、Responses 与 New API 接入 |
| v0.2.2 | namespace shell 参数、尾反斜杠与重复错误识别 |
| v0.2.3 | 坏轮次清理，以及有次数限制的自动恢复 |
| v0.2.4 | 对象序列化与持续只读搜索循环 |
| v0.2.5 | 超长历史压缩和截断 JSON 修复 |

这条问题线也给出了一个更合理的开发顺序：

1. 先完成非流式文本转换。
2. 再完成一次完整工具调用闭环。
3. 然后实现流式事件与工具参数增量。
4. 接着加入会话、路径和凭证状态。
5. 最后用长任务寻找资源泄漏与退化循环。

一开始就同时支持所有协议和所有客户端，很难知道错误到底出现在哪一层。逐层增加能力，失败才容易定位。

## 测试应该围绕契约，而不是实现细节

Thief Neko 当前的测试重点不是“某个函数调用了几次”，而是协议输出是否满足客户端契约：

- Anthropic 消息能否正确映射成 OpenAI 消息。
- `tool_use` 和 `tool_result` 能否保持 ID 配对。
- 流式事件顺序是否完整。
- 分片工具参数能否组装成合法 JSON。
- 累计快照是否会产生重复文本。
- 并发 401 是否只触发一次凭证刷新。
- 超出请求、历史和流缓冲上限时是否明确失败。
- 服务端能否完成一次真实的工具循环。

本地开发时可以先运行：

```powershell
npm test
```

但自动测试之后，我仍然会用一个真实工作区做端到端验证。因为路径映射、桌面客户端事件顺序和长对话恢复，很难只靠单元测试完全覆盖。

一个实用的回归任务应该同时包含 Read、Write、Edit、shell 和最终结果检查。只问一句“你能使用工具吗”，模型回答“能”，没有任何验证价值。

## 如果重新开始，我会更早做这几件事

第一，先画协议状态图，再写转换代码。消息结构看起来简单，但工具、流和会话一叠加，靠临时判断很快会失控。

第二，为每个请求生成贯穿全链路的 ID。日志应该能把客户端请求、上游会话、工具调用和重试串在一起，同时对 Token、Cookie 和工具输出做脱敏。

第三，从第一天就保存失败样本。一个真实的坏 SSE chunk，通常比十段猜测更有价值；把它匿名化后做成固定测试，修复才不会在下个版本复发。

第四，明确恢复预算。任何自动修复都要回答三个问题：最多重试几次、哪些状态可以清理、什么时候必须停止。

第五，尽早做长时间测试。协议网关最难的错误通常不发生在第一轮，而是出现在第几十次工具调用、第一次 Token 刷新，或者历史接近上限的时候。

## 最后的理解

现在回头看，Thief Neko 已经不是传统意义上的反向代理。它更像一个有状态的协议翻译器：一边维护不同 API 的结构契约，一边维护 Agent 对话的语义连续性。

真正困难的并不是把字段 A 改成字段 B，而是始终知道：哪个工具正在调用，结果属于哪一轮，什么时候应该继续，什么时候可以恢复，以及什么时候必须停下来。

让模型“回复”很容易。让模型跨过不同客户端、协议和运行环境，持续而可靠地“完成工作”，才是这个项目真正解决的问题。

项目地址：[KanoNoUta/thief-neko](https://github.com/KanoNoUta/thief-neko)
