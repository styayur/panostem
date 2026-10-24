# Panostem 0.5.0-alpha.1 交付报告

日期：2026-10-24（Asia/Singapore）。此报告按实际执行证据区分实现、验证、发布和部分完成；版本仍为 alpha。

## 发布与状态

**已发布：** [styayur/panostem](https://github.com/styayur/panostem)、[v0.5.0-alpha.1 预发布](https://github.com/styayur/panostem/releases/tag/v0.5.0-alpha.1)、[线上 Web](https://styayur.github.io/panostem/)。这是 Windows x64 alpha，不是稳定版或所有平台正式支持声明。

实现分支 `feat/panostem-manimgl`；受保护的 [PR #33](https://github.com/styayur/panostem/pull/33) 于 2026-10-24 05:04:31 UTC squash 合并，提交和 tag 指向 `cad3dd2e0da378794278b5436fbdeeb62389be2e`。PR 最终提交 `14070a94a4bd743ef3e284b06d138076bd6196a4` 与合并提交的源码树完全相同。现有 tag/Release 未覆盖，未强推，未重写用户历史。

[合并源码 CI](https://github.com/styayur/panostem/actions/runs/40064834360)、[CodeQL](https://github.com/styayur/panostem/actions/runs/40064834539)、[PR CodeForge](https://github.com/styayur/panostem/actions/runs/40064369705)、[发布构建](https://github.com/styayur/panostem/actions/runs/40065190628)及[改名后 Pages 部署](https://github.com/styayur/panostem/actions/runs/40064856327)均成功。合并时自动启动的旧路径 Pages 任务被改名后的显式部署按既有 concurrency 规则取消，最终新路径部署成功。

仓库已正式改名，本地 origin 为 `https://github.com/styayur/panostem.git`，默认分支为 main。旧 GitHub 仓库与历史 v0.2.0 Release 链接实测跳转后为 200；新 Pages 为 200；旧 `https://styayur.github.io/stem-visual-explorer/` 为 **404**。仓库改名没有带来旧 Pages 路径重定向。只修改本仓库，没有跨仓库、个人站点或 DNS 操作。

线上正式部署通过实际视频解码/播放/定位、源码选入、分享下载/重新导入、损坏包拒绝、概念导航、三语、390px 和 Reduced Motion 回归。

### 实际资产与校验

以下文件已从公开 Release 下载；字节数、完整 SHA-256 同时与 GitHub asset digest 核对，两个二进制包还与 SHA256SUMS 核对。

| 资产 | 字节 | SHA-256 |
| --- | ---: | --- |
| [SHA256SUMS.txt](https://github.com/styayur/panostem/releases/download/v0.5.0-alpha.1/SHA256SUMS.txt) | 210 | `21eaba31b2dcdc60b9598f2df9c43750483515a21e6042c66e5fa66007afd6ce` |
| [panostem_0.5.0-alpha.1_windows-x64.zip](https://github.com/styayur/panostem/releases/download/v0.5.0-alpha.1/panostem_0.5.0-alpha.1_windows-x64.zip) | 6509298 | `fb7375e422f75fcf94f94fc8eb76a4130fe3767556e4e5e1cd891cbc704bd58d` |
| [panostem_0.5.0-alpha.1_x64-setup.exe](https://github.com/styayur/panostem/releases/download/v0.5.0-alpha.1/panostem_0.5.0-alpha.1_x64-setup.exe) | 4406727 | `21cfea10fb41028c7e91ddad1b45f9f5bde1e2d0aaef3ec7d9e73b66c1b196f5` |

便携 ZIP 的全部 CRC、预期文档/完整许可/补充声明均验证通过。安装器为真实 NSIS，ProductName=Panostem、ProductVersion=FileVersion=0.5.0-alpha.1。提取的可执行文件实际运行 `--verify-build`，版本、产品、兼容 ID 和运行时源身份通过完整断言；其 SHA-256 为 `fdda7f7e2162972ce35b7f122bea356c9e396736e22bc050c22ebc69525ca554`。

首次跨检出核验因 Windows 构建的 CRLF 与本地 LF 字节不同而失败。逐项比较后，内嵌 controller/requirements 哈希恰好等于 tag 原始 Git blob 进行 Windows CRLF 转换的结果。使用精确 tag 源码和该检出格式重建验证目录后，原验证脚本全部断言通过，没有删除或放宽断言。发布的 controller SHA-256 为 `4d408584eb08908913d8f8919f37c325fa8ccfb382f6e0fc9adb2712725f5ccb`，requirements 为 `33f09cf365cb96f701504ebf234703caef973cb93039c9d593a6c460f6a805c3`。后续源码以 `.gitattributes` 固定嵌入运行时为 LF；已发布 tag/资产保持不变。

安装器完成构建、下载与格式/版本验证；没有对真实生产用户数据执行安装升级。跨旧名称的就地升级/旧快捷方式清理仍属于未实测范围。

## 功能与架构

已实现独立 ManimGL Studio：普通多文件 Python 项目创建、打开、ZIP 导入导出、资源复制和可恢复删除，CodeMirror Python 编辑、文件切换、保存和语法错误位置，场景发现与手动入口、可选元数据和参数。标准 Scene、Mobject、相机、三维、自定义类与 updater 直接交给真实引擎，未转换成 DSL/SceneFrame，也未猴子补丁上游。

原生 OpenGL 预览使用独立进程；正式渲染支持 MP4、GIF、透明 MOV 和 PNG 最终帧，设置实际映射到已验证的上游 CLI/config。任务提供有界日志、状态、耗时、取消、重试、历史、真实产物路径和播放器。Windows Job Objects / Unix process groups 管理进程树。

运行时采用显式授权的应用私有 uv/CPython/venv，固定 Python 3.11.14 和 3b1b/manim v1.7.2 的提交 f427fc67df75513be0cd3f3329e327a9a19401c3。上游该 tag 的包元数据/横幅实际为 1.7.1，不能据此误认其他引擎。uv 归档、上游源码、依赖锁均校验哈希；项目依赖另行授权并安装在项目私有环境。未改全局 PATH、系统 Python 或注册表。

Web 端仅播放媒体和显示可选源码；版本化分享 ZIP 校验清单、路径、类型、大小、SHA-256，拒绝穿越、符号链接、重复/冲突路径和不支持的版本。源码分享为选入，导出不等于上传或永久公共链接。没有云 Python 执行、账号或数据库。

保留原有 490 概念本体、查询解析、资源发现、学习 Workbench、三门 JSXGraph 引导课程及数值安全边界、三语、键盘和 Reduced Motion。场景元数据复用权威 Concept ID，未知 ID 明确报错。公开名称/图标/窗口/包/安装器/站点统一为 Panostem；Tauri org.stemvisualexplorer.app、sve.*、SQLite 和内部兼容标识保留。

## 实际验证

- 原有搜索、1395 条语言查询、51 条 golden、索引基线、12 组学习数学/状态机和 Workbench 契约保留并通过；新增分享/元数据/参数/版本/路径/哈希/执行边界契约通过。
- Rust 41 项测试、格式、纯核心 Clippy（warnings denied）、桌面编译通过；Python 17 项契约在本地及 Windows/macOS/Ubuntu CI 通过。
- TypeScript、ESLint、生产构建、依赖审计通过；npm audit 为 0 漏洞。原有 Chromium 23 组回归、24 个三语课程状态、Workbench、窄屏/Reduced Motion及生产包禁止 eval/Function 检查通过。
- 原有原生 WebView2 七组回归通过。Studio 原生端到端实际编辑、保存、撤销信任、渲染、播放、项目 ZIP、随机媒体 token、OpenGL/IPython 预览、输入 40+2、取消后子进程终止及失败/取消输出清理通过；更换安全进程封装后重新通过。
- 实际管理运行时首次安装（约 320 秒、59 个 Windows 包）与单独授权的项目依赖安装通过。真实二维、三维、物理、多文件自定义类/updater 等五个场景渲染且用 FFmpeg 解码；GIF、透明 MOV、PNG 也实际验证。Linux Xvfb/Mesa CI 五个真实场景渲染解码通过。
- CodeForge v0.2.1 完整 PR 扫描无新增诊断，未更改 baseline 或降低规则。首轮 CI 的临时路径别名、Linux Xauthority 环境与可 panic 代码问题已修复，最终提交重新检查通过。
- 本地真实 NSIS 构建与可执行文件 --verify-build 校验通过（产品/应用与包版本/兼容 ID/控制器和依赖锁哈希）。GitHub 发布资产另行下载核验，见发布记录。

## 许可与安全

AGPL-3.0-only 未变。ManimGL MIT 许可、实际 npm/Rust/Python 清单和文本、FFmpeg GPL 及源码/构建说明、PyOpenGL 精确源码许可均保留。对发布归档缺失文本的 CodeMirror 包和 Windows Rust 依赖，按精确上游提交补齐许可文本，并验证包映射及哈希；实验平台的构建依赖不宣称全部作为 Windows 二进制分发。用户源码、视频、教材、第三方素材不自动改用应用许可。

打开/检查/导入项目不执行 Python，不自动安装依赖。运行前按源码版本授予信任，编辑撤销信任；依赖安装独立授权。参数数组启动、受控工作目录、环境允许列表、日志/任务/超时限制及随机媒体能力 token 已实现；外部页面不能调用应用 IPC。普通本地 Python 有当前用户文件/网络权限，虚拟环境、AST 检查和子进程均不是 OS 沙箱。

## 既有安全告警复核

发布前读取了仓库的实际安全告警，未把工作流成功等同于零告警。CodeQL #4（2026-09-30 创建）仍为 open，指向 ResourcePreview 的 iframe URL 数据流；现有 previewCapability/providerForUrl 同时检查 HTTP(S)、精确主机及来源 ID，未知目的地降级为卡片，并保留 iframe sandbox。该告警早于本次任务，未绕过检查或擅自关闭。

Dependabot 的 postcss-selector-parser 告警仍显示旧 6.1.4；本次锁文件和 npm ls 实际为 7.1.7，npm audit 为 0，平台告警状态尚未刷新。另一条既有 glib 0.18.5 VariantStrIter 不健全性告警仍适用于实验 Linux 的 GTK/Tauri 依赖链（修复线为 0.20.0）；Windows x64 cargo tree 没有 glib，不随本次 Windows 原生资产链接分发。Linux 正式支持前仍需解决上游依赖链兼容升级，未冒充已修复。

## 部分完成与已知限制

- Windows Sandbox 导出已实现并有契约测试；测试机为未提供 WindowsSandbox.exe 的 Windows 11 Home，来宾/GPU 实际运行未验证。此项为部分完成/环境不可用，不冒充安全隔离。
- Windows x64 是实际本地验证并发布的目标。Linux/macOS 仅实验适配和契约 CI，没有未验证的原生发布包或正式支持承诺。
- 可选 LaTeX/dvisvgm 未在本机验证；模板不依赖它们。MOV 播放取决于编码支持。
- 原生控制台为逐行输入。IPython simple-prompt 无法安装 Manim idle input hook，嵌入提示符空闲时不保证持续窗口刷新；普通场景使用原生窗口循环。任意场景没有统一暂停/逐帧跳转承诺。
- 安装包未签名，无自动更新器；更名升级可能留下旧快捷方式/安装项，共用应用数据身份保持不变。
- 未修改其他仓库、个人站点或 DNS。旧 Pages 路径行为以发布后的 HTTP 实测为准。

## 后续工作

优先验证 Windows Sandbox 来宾/GPU与实际旧版本安装升级，改进原生预览完整终端/idle 交互，提供签名和更新策略；在解决 Linux glib 上游依赖链并完成各平台原生回归之前，不扩大发布平台支持声明。

本报告的二进制来源是上述不可变 release tag。之后的文档与检出换行治理提交不重写该 tag，也不替换已发布资产。
