---
title: 从零到可发布：KANO 暗黑骑士 ACR 开发笔记
description: 一篇偏教学的开发记录：如何把暗黑骑士 ACR 从基础循环、爆发、QT、Hotkey、配置保存做到打包发布。
pubDate: 2026-07-04
tags:
  - ffxiv
  - acr
  - devlog
  - csharp
---

这篇文章整理的是我这几天开发 KANO 暗黑骑士 ACR 的过程。

它不是单纯的成果展示，而是一篇偏教学的开发笔记：一个 ACR 从基础循环、爆发逻辑、QT 开关、Hotkey 面板、配置保存、资源文件，到最后打包成订阅仓库格式，中间到底要考虑哪些问题。

其中有一部分行为对齐参考了成熟实现和公开资料。这里不展开具体反编译过程，只把它当成“观察成熟实现并整理成自己的代码结构”的阶段。真正有价值的是后半段：怎么把参考到的思路变成可维护、可调试、可发布的项目。

## 开发目标

KANO 最开始的目标很直接：写一套 100 级暗黑骑士循环。

但真正做起来会发现，一个能长期使用的 ACR 不能只会按技能。它至少要解决这些问题：

- 高难模式和日随模式要分开。
- 100 级爆发要尽量对齐标准循环。
- 60 / 120 秒爆发要能稳定触发。
- GCD 和 oGCD 插入不能互相卡住。
- QT 开关要能控制循环细节。
- Hotkey 要能优先触发减伤、挑衅、黑盾、献奉等技能。
- UI 要看得懂，也要能拖动并保存位置。
- 配置要能保存，不能每次重启插件都初始化。
- 资源文件要跟着 DLL 发布，不能依赖本地绝对路径。
- 最后要能打包成订阅仓库能读取的格式。

所以这个项目后面其实变成了一个完整 ACR 的开发范例：战斗决策、UI、配置、资源、打包、发布都要处理。

## 总体架构

我最后采用的是比较清晰的分层结构：

```text
KanoRotation
├─ GCD Resolver
├─ oGCD Resolver
├─ DrkAeLogic
├─ ApiHelper
├─ KanoSettings
├─ KanoQT
├─ KanoHotkeyUI
├─ KanoQTUI
├─ KanoControlUI
└─ Opener / Timeline Support
```

每一层只做自己的事。

`KanoRotation` 是 ACR 入口，负责注册 GCD / oGCD 决策器，处理起手、事件、UI 激活和战斗状态。

`DrkGcdResolver` 只负责下一发 GCD 打什么。

`DrkOffGcdResolver` 只负责下一发能力技打什么。

`DrkAeLogic` 放真正的职业逻辑，比如是否进爆发、是否卸蓝、是否召唤弗雷、是否使用暗影使者、日随是否 AOE、自动减伤是否触发。

`ApiHelper` 是我自己封装的一层 PR API 外壳。这样后面本体 API 改了，尽量只改 Helper，不要让业务逻辑到处散落框架调用。

这是我觉得最关键的开发思路：**不要把所有判断都塞进 Resolver。Resolver 应该像调度器，真正的规则应该沉到逻辑层。**

## 入口类：只负责接线

ACR 的入口类一般实现 `IRotation`，并通过 `RotationMetadata` 标记职业、作者、版本等信息。

简化后的结构大概是这样：

```csharp
[RotationMetadata(
    (uint)Job.DRK,
    "KANO",
    "KANO",
    KanoRotation.Version,
    ContentScope = AcrContentScope.HighEnd)]
public class KanoRotation : IRotation
{
    public const string Version = "1.2.1";

    private readonly List<IDecisionResolver> _gcdResolvers = new();
    private readonly List<IDecisionResolver> _offGcdResolvers = new();

    public KanoRotation()
    {
        _gcdResolvers.Add(new DrkGcdResolver());
        _offGcdResolvers.Add(new DrkOffGcdResolver());

        foreach (var (name, defaultValue) in KanoQT.All)
            ApiHelper.添加QT(name, defaultValue);

        KanoSettings.Instance.RestoreQtSnapshot(KanoSettings.Instance.IsHighEnd);
        KanoSettings.Instance.ApplyModeVisibilityDefaults();
        ApiHelper.重建QT可见性();
    }

    public PAction? NextGcd()
    {
        foreach (var resolver in _gcdResolvers)
        {
            var check = resolver.Check();
            if (!check.Success) continue;
            return resolver.GetAction();
        }

        return null;
    }

    public PAction? NextOffGcd()
    {
        foreach (var resolver in _offGcdResolvers)
        {
            var check = resolver.Check();
            if (!check.Success) continue;
            return resolver.GetAction();
        }

        return null;
    }
}
```

这里最重要的是 `NextGcd` 和 `NextOffGcd` 分开。

`NextGcd` 返回下一发 GCD。

`NextOffGcd` 返回下一发能力技。

暗黑骑士的循环质量，很大一部分就取决于 oGCD 插入是否稳定。如果两者混在一起，后面调试会很痛苦。

## 为什么一定要拆 GCD 和 oGCD

最开始循环出问题时，经常会出现一种情况：GCD 一直在打基础连击，但能力技完全插不进去；或者爆发一直显示“准备中”，实际却没有执行。

这通常不是技能 ID 错了，而是调度逻辑错了。

FFXIV 的战斗节奏大概是：

- GCD 转动期间可以插入能力技。
- 常规情况下一个 GCD 间隔里最多双插。
- 如果能力技判断过于保守，就一个都插不进去。
- 如果能力技判断过于激进，又会卡 GCD。

所以 oGCD 不能简单写成“CD 好了就打”。它应该是：**CD 好了，并且当前窗口适合插入，才打。**

简化判断可以写成这样：

```csharp
private static bool CanUseOffGcd(uint id, out string reason)
{
    if (!ApiHelper.技能已解锁(id))
    {
        reason = "未解锁";
        return false;
    }

    if (!ApiHelper.技能可用(id))
    {
        reason = "冷却中";
        return false;
    }

    if (ApiHelper.动画锁定 > 0.1f)
    {
        reason = "动画锁";
        return false;
    }

    if (ApiHelper.GCD剩余 <= 0.6f)
    {
        reason = "GCD剩余不足";
        return false;
    }

    reason = "可用";
    return true;
}
```

实际项目里的判断会更复杂，比如要考虑技能队列、移动、目标、职业资源和开关状态。但核心原则不变：先判断能不能插，再判断该插什么。

## 暗黑骑士循环的资源视角

暗黑骑士不是只看“哪个技能亮了”。

它需要管理一组资源和窗口：

- MP
- 暗血
- 暗黑状态时间
- 血乱 / 嗜血
- 弗雷窗口
- 60 秒爆发
- 120 秒爆发
- 暗影使者充能
- 腐秽大地和腐秽黑暗

所以循环逻辑要先回答一个问题：**现在处在哪个阶段？**

例如弗雷逻辑：

```csharp
public static bool CanUseLivingShadow()
{
    if (!ApiHelper.获取QT(KanoQT.弗雷)) return false;
    if (!CanUseBurstSkillCommon()) return false;
    if (!ApiHelper.技能已解锁(KanoSkill.掠影示现)) return false;
    if (!ApiHelper.技能可用(KanoSkill.掠影示现)) return false;

    return ApiHelper.DRK.弗雷剩余 <= 0f;
}
```

`掠影示现` 不应该被普通卸资源逻辑卡住，而应该在爆发逻辑里有明确优先级。

再比如 MP 倾泻：

```csharp
public static bool ShouldSpendMp()
{
    if (!ApiHelper.获取QT(KanoQT.暗影锋)) return false;
    if (ApiHelper.获取QT(KanoQT.攒资源)) return false;

    if (IsBurstWindow())
        return ApiHelper.玩家的蓝量 >= 30;

    var keepMp = KanoSettings.Instance.IsHighEnd
        ? KanoSettings.Instance.HighEndKeepMp
        : KanoSettings.Instance.KeepMp;

    return ApiHelper.玩家的蓝量 >= keepMp;
}
```

这里不能写死一个 MP 阈值，因为高难和日随的目标不一样。高难要考虑爆发、黑盾和资源池；日随更多是打得舒服、不发呆、能处理小怪场景。

## 爆发逻辑：先定义窗口，再排优先级

暗黑骑士爆发重点是稳定打出这些内容：

- 血乱 / 嗜血
- 弗雷
- 暗影使者
- 腐秽大地
- 腐秽黑暗
- 精雕怒斩 / 吸血深渊
- 暗影锋卸蓝
- 血溅 / 寂灭
- 掠影的蔑视

开发时我遇到过一个典型问题：开场 120 爆发一直显示循环中，但实际没有打能力技。

后来处理思路是：

1. 起手窗口单独识别。
2. 爆发公共条件单独写。
3. 弗雷、血乱、暗影使者、腐秽大地等技能按优先级排。
4. 卸蓝逻辑要知道什么时候全卸，什么时候保留黑盾。
5. QT 能覆盖默认行为。

能力技优先级可以这样组织：

```csharp
if (DrkAeLogic.CanUseLivingShadow() && TryUse(KanoSkill.掠影示现))
    return true;

if (DrkAeLogic.CanUseBurstSkill() && TryUse(KanoSkill.血乱))
    return true;

if (DrkAeLogic.CanUseShadowbringer() && TryUse(KanoSkill.暗影使者))
    return true;

if (DrkAeLogic.CanUseSaltedEarth() && TryUse(KanoSkill.腐秽大地))
    return true;

if (DrkAeLogic.ShouldSpendMp() && TryUse(JobHelper.EdgeOrFlood(aoe)))
    return true;
```

这里的优先级很重要。

比如 120 窗口里，暗影使者和暗影锋都能打，但它们不是同一类资源。暗影使者是 120 爆发重点技能，暗影锋是 MP 倾泻技能。实战中要通过 Logs 对比去调整顺序，而不是凭感觉堆判断。

## QT：按钮要真正影响循环

我最后保留了一批比较实用的 QT：

- 嗜血 / 血乱
- 弗雷
- 暗影使者
- 腐秽大地
- 精雕 / 海胆
- 暗影锋
- 掠影的蔑视
- 伤残
- AOE
- 卸蓝
- 卸暗血
- 爆发期留黑盾
- 攒资源
- 爆发药
- 倾泻爆发
- 血溅 / 寂灭
- 强制 AOE
- 不打爆发
- 小停一下
- 日随专用的自动减伤 / 自动挑衅 / 拉怪模式

QT 的核心不是显示一个按钮，而是要真正改变循环。

例如：

```csharp
if (!ApiHelper.获取QT(KanoQT.暗影锋))
    return false;

if (ApiHelper.获取QT(KanoQT.攒资源))
    return false;

if (ApiHelper.获取QT(KanoQT.爆发期留黑盾) && IsBurstWindow())
    return ApiHelper.玩家的蓝量 >= 60;
```

一个 QT 最好只控制一类行为，不要一个按钮影响太多东西。否则后期调试时，你会不知道到底是哪一个开关改变了结果。

## 高难模式和日随模式不要强行合并

这是开发中很重要的一点。

高难模式追求：

- 爆发对齐。
- 资源池管理稳定。
- 尽量不被日随拉怪逻辑干扰。
- 时间轴减伤能触发。
- 开场起手稳定。

日随模式追求：

- 能自动判断 AOE。
- 能拉怪。
- 能自动减伤。
- 能处理低等级技能缺失。
- 打起来舒服，不发呆。

所以 KANO 里做了 `IsHighEnd`：

```csharp
public static bool IsHighEnd => KanoSettings.Instance.IsHighEnd;
```

然后在关键逻辑里分支：

```csharp
if (IsHighEnd)
{
    return GetHighEndAction();
}

return GetDailyAction();
```

不要试图用一套逻辑同时覆盖高难和日随。两者目标不一样，强行合并最后只会互相打架。

## 自动减伤：看似简单，其实最需要 Debug

日随自动减伤是一个很典型的功能。

它要判断：

- 是否日随模式。
- 自动减伤 QT 是否开启。
- 玩家是否在战斗中。
- 周围敌人数量。
- 玩家血量。
- Boss 是否读条。
- 目标是否正在打我。
- 大减伤之间是否需要错开。
- 小怪是否快死了，快死就别浪费大减。

示意：

```csharp
public static PAction? GetDailyAutoDefenseAction()
{
    if (IsHighEnd) return null;
    if (!ApiHelper.获取QT(KanoQT.自动减伤)) return null;
    if (!ApiHelper.战斗中 || ApiHelper.玩家 == null) return null;

    var selfHp = ApiHelper.玩家血量 / 100f;
    var nearby5 = CountEnemiesAroundPlayer(5f);
    var target = ApiHelper.目标;
    var bossCasting = target != null && ApiHelper.是Boss(target) && target.IsCasting;

    if (JobHelper.IsUsableOffGcd(KanoSkill.至黑之夜)
        && (bossCasting || nearby5 >= 3 && selfHp < KanoSettings.Instance.AutoDefenseBlackestNightThreshold))
    {
        return ApiHelper.对自己技能(KanoSkill.至黑之夜);
    }

    if (JobHelper.IsUsableOffGcd(KanoSkill.铁壁)
        && nearby5 >= 3
        && selfHp < KanoSettings.Instance.AutoDefenseRampartThreshold)
    {
        return ApiHelper.对自己技能(KanoSkill.铁壁);
    }

    return null;
}
```

自动减伤一定要加 Debug，否则你不知道它为什么不开。

比如开发面板里可以输出：

```text
自动减伤未触发：血量 92% 高于铁壁阈值 85%
自动减伤未触发：周围敌人数量 1，不满足小怪减伤条件
自动减伤触发：Boss 读条，使用黑盾
```

这种信息比“怎么没开减伤”有用太多。

## Hotkey 面板：UI 不要写死技能逻辑

Hotkey 是 KANO 里很重要的体验功能。

我做的 Hotkey 不是简单按钮列表，而是一个独立悬浮窗：

- 点击图标触发技能。
- 技能进入 CD 后图标变暗。
- 左下角显示 CD 时间。
- 右下角显示技能次数。
- 支持 2 号位黑盾 / 献奉。
- 支持行尸走肉、LB、挑衅、退避、防击退、开关盾姿。
- 图标使用自定义资源，跟 DLL 一起发布。
- 支持拖动改变布局顺序。
- 窗口位置持久化。

核心写法是把每个按钮抽象成一个 Entry：

```csharp
private sealed record HotkeyEntry(
    string Key,
    string Name,
    Func<uint> GetDisplayActionId,
    IHotkeyLogic Logic,
    string IconPath
);
```

点击时不要直接在 UI 里写死技能逻辑，而是交给 `Logic.OnClick()`：

```csharp
if (ImGui.InvisibleButton($"drk-hotkey-{entry.Key}", slotSize))
{
    entry.Logic.OnClick();
}
```

这样后面要支持“对自己”“对 2 号位”“切换盾姿”“LB”都能单独写逻辑类，不会把 UI 写乱。

## 自定义 QT UI：绘制和状态分离

最开始我用的是 PR 本体 QT，但样式控制比较有限。后来做了 KANO 自己的 QT 悬浮窗。

好处是：

- 样式完全可控。
- 每行几个按钮可以自己控制。
- 可以隐藏本体 QT。
- 可以和 Hotkey / 启停设置面板统一视觉。

绘制思路是：

```csharp
var drawList = ImGui.GetWindowDrawList();
drawList.AddRectFilled(pos, max, bgColor, radius);
drawList.AddRect(pos, max, borderColor, radius);

ImGui.SetCursorScreenPos(buttonPos);
if (ImGui.InvisibleButton(id, size))
{
    ApiHelper.设置QT(key, !ApiHelper.获取QT(key));
}
```

这类 UI 写法有四个要点：

- 外观由 `drawList` 画。
- 点击区域用 `InvisibleButton`。
- 状态从 QT 读取。
- 点击后写回 QT。

UI 不应该自己决定循环逻辑。UI 只负责显示状态和修改状态。

## 配置保存：不要写到临时目录

配置保存很容易被忽略，但实际很影响体验。

KANO 里需要保存：

- 高难 / 日随模式。
- QT 默认状态。
- Hotkey 顺序。
- Hotkey 窗口位置。
- QT 窗口位置。
- 启停设置窗口位置。
- 起手倒计时设置。
- 存蓝阈值。
- 自动减伤阈值。

我用的是 JSON：

```csharp
public class KanoSettings
{
    public bool IsHighEnd = true;
    public List<string> HotkeyOrder = new();

    public bool HotkeyWindowPositionSaved = false;
    public float HotkeyWindowX = 120f;
    public float HotkeyWindowY = 360f;

    public int HighEndKeepMp = 96;

    public void Save()
    {
        var json = JsonSerializer.Serialize(this, JsonOptions);
        File.WriteAllText(FilePath, json);
    }
}
```

这里踩过一个坑：不能把配置写到 PR 的临时 cache 目录里。

临时 cache 目录可能带进程 ID，例如：

```text
PromeRotation\.Cache\14068\ACR\KANO.Settings.json
```

插件重启后进程 ID 变了，配置就像丢了一样。

稳定写法应该用插件配置目录：

```csharp
Path.Combine(Svc.PluginInterface.ConfigDirectory.FullName, "KANO.Settings.json")
```

这样每个用户电脑上都会自动保存到自己的配置目录，不需要写死我的用户名，也不会因为进程变化丢配置。

## 资源文件发布：不要依赖本地绝对路径

Hotkey 图标一开始可以用本地绝对路径调试，比如桌面上的资源文件夹。调试可以，发布不行。

发布时必须把资源放进项目里：

```text
Resources
└─ PixelHotkeysV4_BigCutePinkOrange
   ├─ rampart.png
   ├─ reprisal.png
   ├─ the_blackest_night.png
   └─ ...
```

然后在 csproj 里设置复制：

```xml
<ItemGroup>
  <Content Include="Resources\**\*.png">
    <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
  </Content>
</ItemGroup>
```

代码里再按 ACR DLL 所在目录找资源：

```csharp
var dir = Path.GetDirectoryName(typeof(KanoRotation).Assembly.Location);
var iconPath = Path.Combine(
    dir,
    "Resources",
    "PixelHotkeysV4_BigCutePinkOrange",
    "rampart.png");
```

这样别人下载插件后，图标也能正常显示。

## 时间轴联动：重点是节点语义

后面我还做了时间轴相关尝试。

思路上可以分成两类。

第一类是时间轴触发技能，比如减伤轴：

```text
Boss 技能条件节点
└─ 行为节点：使用铁壁 / 黑盾 / 献奉 / 行尸走肉
```

第二类是时间轴控制 QT，比如某个阶段开启“爆发期留黑盾”，某个阶段关闭“倾泻爆发”。

这里要注意：时间轴行为节点必须能被本体识别，不能只是写一个名字。行为节点要和 ACR / PR 能识别的动作绑定，否则在编辑器里看起来有名字，游戏里实际不会触发。

这个阶段最重要的经验是：**时间轴不是单纯 JSON 转换，节点语义必须对上本体能执行的行为。**

## 调试方法

开发 ACR 最重要的是调试。

我主要用了几种方式：

1. 游戏里看下一发 GCD / oGCD。
2. 开发面板输出当前状态。
3. 木人测试。
4. ACT / FFLogs 对比技能数量。
5. 和参考实现对比 60 / 120 窗口。
6. 编译后直接放进 PR ACR 目录测试。

例如 `NextOffGcd` 没有输出时，可以把阻塞原因写出来：

```text
无可用oGCD | 最近阻塞: 暗影使者 CD中 | GCD剩余: 1.42 动画锁: 0.00 MP: 6000 暗血: 50
```

这种调试信息比“技能不打了”有用太多。

我的经验是：只要一个判断可能返回 `false`，它就应该能解释为什么是 `false`。否则后面排查时，每一个条件都会变成黑盒。

## 打包和 GitHub 发布

PR 的 ACR 订阅大概需要：

- `KANO.zip`
- `repo.json`
- GitHub Release

`repo.json` 示例：

```json
{
  "author": "KANO",
  "version": "1.2.1",
  "description": "KANO - FFXIV Dark Knight ACR",
  "supportedJobs": [
    {
      "contentScope": "HighEnd",
      "job": "DRK"
    }
  ],
  "apiVersion": 15,
  "referencePromeVersion": "1.5.4.2",
  "downloadUrl": "https://github.com/KanoNoUta/KanoACR/releases/download/v1.2.1/KANO.zip",
  "sha256": "..."
}
```

打包流程：

1. `dotnet build -c Release`
2. 把 `KANO.dll`、`KANO.deps.json`、`Resources` 放进临时 pkg 文件夹。
3. 压缩成 `KANO.zip`。
4. 计算 SHA256。
5. 更新 `repo.json`。
6. 上传到 GitHub Release。

GitHub CLI 上传：

```powershell
gh release upload v1.2.1 KANO.zip repo.json --clobber --repo KanoNoUta/KanoACR
```

用户订阅链接：

```text
https://github.com/KanoNoUta/KanoACR/releases/latest/download/repo.json
```

这里踩过一个小坑：`repo.json` 最好写成无 BOM UTF-8，避免某些解析器抽风。

## 最重要的几个经验

第一，先写能跑的循环，再写漂亮的 UI。

UI 很容易让人上头，但 ACR 的核心永远是决策逻辑。GCD / oGCD 不稳定，UI 再好看也没用。

第二，所有复杂判断都要能解释。

比如为什么不打弗雷？为什么不卸蓝？为什么不自动减伤？代码里最好能输出原因。

第三，QT 不是越多越好。

QT 太多会让用户迷路，也会让逻辑分支爆炸。每个 QT 都应该有明确用途。

第四，高难和日随要分开。

日随需要舒服，高难需要严格。它们不是同一个问题。

第五，不要依赖本地路径。

图标、配置、发布文件都要考虑别人电脑能不能用。

第六，参考成熟实现时，重点学行为，不是照搬代码。

真正要吸收的是技能优先级、爆发窗口、资源保留、减伤触发条件、低等级兼容思路。

## 后续还能做什么

KANO 后面还可以继续加：

- 战斗分析面板。
- 自动减伤 Debug。
- 120 / 60 爆发状态灯。
- 时间轴 QT 控制节点。
- 配置导入 / 导出。
- 日随低等级循环更精细的适配。
- FFLogs 技能数量对比辅助。
- 一键上传发布脚本。

如果继续做，我最推荐先加“战斗分析面板”。因为它能直接告诉我这一把少了几个暗影锋、暗影使者有没有延迟、120 窗口有没有卸完蓝。调循环时，这比肉眼看战斗记录省太多时间。

## 结语

这几天开发 KANO 最大的感受是：写 ACR 并不是简单地把技能按顺序排出来。

它更像是在写一个小型战斗决策系统：

- 要理解职业循环。
- 要理解框架 API。
- 要处理 UI。
- 要处理配置。
- 要处理资源。
- 要处理发布。
- 还要不断用实战日志反推问题。

当基础结构搭好以后，后面每次优化都会轻松很多。KANO 现在已经从“能打技能”变成了“能维护、能调试、能发布”的 ACR，这也是这几天开发里最有价值的部分。
