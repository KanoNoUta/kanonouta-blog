---
title: 绕过 OpenAI 账号降智：直连 BPS 端点让 ChatGPT 满血复活
description: 最近火遍全网的 OpenAI 降智绕过方案：反代 Excel 插件里的 GPT，直连 bps.openai.com 的 BasisPoints 接口，带上 ChatGPT 的 access_token 即可满血调用。
pubDate: 2026-09-24
tags:
  - ai
  - openai
  - chatgpt
  - reverse-engineering
---

最近一个玩法在 X 上很火，几乎火遍全网：有天才反代了 **Excel 插件里的 GPT**，并且写了一个反代小程序。我随手测了一下，还真是满血。

这篇文章把这个玩法的原理和实现细节讲清楚，顺便说说怎么把它接入 sub2api 这类网关，做成「降智后自动切换」的兜底通道。

> 先说结论：直接打 `https://bps.openai.com/basispoints/api/responses`，带上 ChatGPT 网页版的 access token 就行了。

## 什么是「降智」

用过 ChatGPT 账号做 API 中转的人应该都遇到过：同一个账号，官方客户端里回答得好好的，一旦通过 Codex / OAuth 通道批量调用，OpenAI 就会悄悄把模型换成更弱的版本，或者压低推理强度。回答质量肉眼可见地下降，社区一般管这个叫「降智」。

降智的本质是 OpenAI 按**入口和客户端身份**做差异化调度：网页版、官方插件、第三方 OAuth 客户端，走的后端通道不同，拿到的模型档位也不同。

## 意外的突破口：Excel 插件

这次的突破口来自一个意想不到的地方——微软 Excel 里集成的 GPT 插件。

有人逆向了这个插件的网络请求，发现它并没有走常规的 ChatGPT 后端，而是打到了一个专门的端点：

```text
https://bps.openai.com/basispoints/api/responses
```

`bps` 是 **BasisPoints** 的缩写，看起来是 OpenAI 内部给这类嵌入式 / 合作方客户端准备的 Responses API 通道。关键在于：**这个通道不认常规的降智策略**，用它发请求，模型是满血的。

我实测的结果：

| 模型 | 结果 |
| --- | --- |
| `gpt-6-astra` | 200 ✅ |
| `gpt-5.6-sol` | 200 ✅ |
| `gpt-6-sol` | 403 `basispoints_model_access_changed` |
| `gpt-6-luna` | 403 `basispoints_model_access_changed` |

`gpt-6-astra` 和 `gpt-5.6-sol` 可以直接打通；部分更新的模型会返回 403，错误码 `basispoints_model_access_changed` 说明 BPS 通道有自己独立的模型权限列表，不是所有模型都能走这条路。

## 实现细节

整个方案的核心只有两步：拿到 ChatGPT 网页版的凭证，然后换上 BPS 需要的请求头。

**第一步：取 access token 和 account id。** 登录 ChatGPT 网页版后，从会话里取出 `access_token`，它是一个普通的 JWT，解析 payload 里的 `https://api.openai.com/auth` 声明就能拿到账号信息：

```python
access_token = session_info.get("access_token")
claims = _jwt_payload(access_token)
auth_claims = claims.get("https://api.openai.com/auth")  # ← 普通 ChatGPT JWT
account_id = user_info.get("chatgpt_account_id") or auth_claims.get("chatgpt_account_id")
```

**第二步：带着专用请求头打 BPS 端点。** 和常规 ChatGPT 后端的区别主要在几个 header 上：

```python
headers = {
    "authorization": f"Bearer {access_token}",
    "chatgpt-account-id": account_id,
    "x-openai-account-id": account_id,
    "x-basispoints-auth-mode": auth_mode,  # "chatgpt"
}
```

请求体就是标准的 Responses API 格式，没有别的魔法。也就是说，任何已经支持 ChatGPT OAuth 账号的中转网关，只要加上这套「BPS 协议」的出口逻辑，就能让降智账号恢复满血输出。

## 缺点

这个方案目前最明显的短板是 **effort 没有 max 挡位**——推理强度最高只能开到 high，想要 xhigh / max 档位还是得走原生通道。另外就是上面提到的，部分新模型在 BPS 通道里直接 403，模型覆盖面比原生通道窄。

所以更合理的用法不是完全替代原生通道，而是把它当作**降级兜底**：原生通道被降智时切到 BPS，恢复之后再切回来。

## 在 sub2api 里落地

事实上 [sub2api](https://github.com/ranxi2001/sub2api) 已经把 BPS 做成了一等公民，最近几个版本的更新基本就是围绕这条通道在打转：

- **降智后自动开启 BPS**：质量规则可以按「连续降智次数」或 5h / 7d 用量阈值触发，自动把账号切到 BPS 通道；恢复后还能自动关闭，全程不需要人工盯。
- **BPS 403 自动处理与恢复探测**：BPS 返回 403 时自动关闭协议并支持按间隔探测恢复，只有完整成功响应加回声校验通过才会真正恢复，避免反复横跳。
- **BPS 原生图片上传**：图片默认走 BPS 原生附件上传，还支持 `gpt-image-2` 的文生图和单图编辑。
- **429 切换**：BPS 上游限流且还没向客户端输出内容时，会在切换预算内自动尝试其他可用账号，限流冷却只作用于走 BPS 的模型，不污染全局限流状态。
- **会话出口预热**：BPS 会话代理优先使用通过初筛的订阅节点，后台维护健康池，池空直接 503 而不是临时探测。

对这些细节感兴趣的话，可以直接翻 [sub2api 的 Releases 页面](https://github.com/ranxi2001/sub2api/releases)，每个版本的 BPS 相关改动都写得很清楚。

## 最后

这个方案的优雅之处在于它没有用任何漏洞——BPS 是 OpenAI 自己给官方合作客户端开的门，我们只是借了 Excel 插件的钥匙走进去。至于这扇门会开多久，就看 OpenAI 什么时候注意到它了。

需要提醒的是，这种用法大概率不符合 OpenAI 的服务条款，账号有被限制甚至封禁的风险，建议只在自己的测试账号上折腾。

就当中秋迟到的礼物，送给各位佬友吧。
