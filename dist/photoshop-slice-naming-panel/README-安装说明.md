# Photoshop 切图命名插件安装说明

## 包内文件

- `install.bat`：Windows 一键安装
- `install.ps1`：安装脚本
- `uninstall.ps1`：卸载脚本
- `plugin\com.openai.photoshop.slice.naming.cep`：插件本体

## 安装方法

1. 先关闭 Photoshop。
2. 双击运行 `install.bat`。
3. 安装完成后，重新打开 Photoshop。
4. 进入：
   `窗口 > 扩展（旧版） > Slice Naming Panel`

## 使用说明

1. 在 Photoshop 中选中一个图层、图层组或画板。
2. 打开 `Slice Naming Panel`。
3. 输入关键词，选择组件类型、状态、编号、尺寸和导出格式。
4. 点击 `导出当前选中对象`。
5. 选择一次导出文件夹，插件会自动以生成名称导出图片。

## 卸载方法

1. 关闭 Photoshop。
2. 运行 `uninstall.ps1`。

## 兼容说明

- 当前打包的是 Photoshop CEP 版插件。
- 推荐用于支持 `窗口 > 扩展（旧版）` 的 Photoshop 版本。
- 安装脚本会自动开启 CEP 开发扩展所需的 `PlayerDebugMode`。

## 常见提示

- 如果安装后菜单里没看到插件，先完全退出 Photoshop 再重新打开。
- 如果公司电脑限制 PowerShell 执行，可以右键 `install.bat` 后选择“以管理员身份运行”再试。
