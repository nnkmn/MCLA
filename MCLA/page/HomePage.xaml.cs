using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using StarLight_Core.Authentication;
using StarLight_Core.Models.Authentication;
using StarLight_Core.Enum;
using StarLight_Core.Models.Launch;
using System.Threading.Tasks;
using MCLA.Enums;
using System.Diagnostics;

namespace MCLA.page
{
    public partial class HomePage : Page
    {
        private readonly string logPath;
        private LoginModeEnum loginMode;

        public HomePage()
        {
            InitializeComponent();

            // 初始化日志路径
            string logDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Logs");
            Directory.CreateDirectory(logDirectory);
            logPath = Path.Combine(logDirectory, "error.log");

            // 设置默认登录方式为离线
            loginMode = LoginModeEnum.Offline;

            // 初始隐藏离线玩家名称输入框
            OfflineLoginPanel.Visibility = Visibility.Collapsed;
        }

        private void LoginMode_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (LoginMode.SelectedItem is ComboBoxItem selectedItem && selectedItem.Tag != null)
            {
                string mode = selectedItem.Tag.ToString();
                loginMode = mode == "Offline" ? LoginModeEnum.Offline : LoginModeEnum.Online;

                // 切换输入框显示
                ToggleOfflineLoginPanel();
            }
        }

        private void ToggleOfflineLoginPanel()
        {
            if (loginMode == LoginModeEnum.Offline)
            {
                OfflineLoginPanel.Visibility = Visibility.Visible; // 显示玩家名称输入框
            }
            else
            {
                OfflineLoginPanel.Visibility = Visibility.Collapsed; // 隐藏玩家名称输入框
            }
        }

        private async void Button_click(object sender, RoutedEventArgs e)
        {
            try
            {
                BaseAccount account;

                if (loginMode == LoginModeEnum.Offline)
                {
                    // 离线登录，获取玩家名称
                    string playerName = PlayerNameTextBox.Text.Trim();
                    if (string.IsNullOrEmpty(playerName))
                    {
                        MessageBox.Show("离线登录需要提供玩家名称！");
                        return;
                    }

                    account = new OfflineAuthentication(playerName).OfflineAuth();
                }
                else
                {
                    // 在线登录
                    account = await HandleMicrosoftAuthentication();
                    if (account == null) return;
                }

                // 校验启动配置
                if (!ValidateLaunchConfig()) return;

                // 准备启动参数
                LaunchConfig args = PrepareLaunchConfig(account);

                // 启动游戏
                await LaunchGame(args);
            }
            catch (Exception ex)
            {
                LogError("启动游戏时发生异常", ex);
                MessageBox.Show("启动失败，请查看日志。");
            }
        }

        // 处理微软认证
        private async Task<BaseAccount?> HandleMicrosoftAuthentication()
        {
            try
            {
                var auth = new MicrosoftAuthentication("e1e383f9-59d9-4aa2-bf5e-73fe83b15ba0");
                var code = await auth.RetrieveDeviceCodeInfo();

                Clipboard.SetText(code.UserCode);
                MessageBox.Show($"请访问以下网址登录：{code.VerificationUri}，并输入代码：{code.UserCode}，点击确认后将自动复制代码并跳转到验证网页");

                Process.Start(new ProcessStartInfo(code.VerificationUri)
                {
                    UseShellExecute = true,
                    Verb = "open"
                });

                var token = await auth.GetTokenResponse(code);
                return await auth.MicrosoftAuthAsync(token, progress =>
                {
                    Dispatcher.Invoke(() => Progress.Text = progress);
                });
            }
            catch (Exception ex)
            {
                LogError("微软认证失败", ex);
                MessageBox.Show("微软认证失败，请检查网络或稍后重试。");
                return null;
            }
        }

        // 校验启动配置
        private bool ValidateLaunchConfig()
        {
            // 检查游戏版本或Java路径是否为空
            if (string.IsNullOrWhiteSpace(SettingsPage.GameVer) || string.IsNullOrWhiteSpace(SettingsPage.JavaLibrary))
            {
                MessageBox.Show("启动配置缺失，请检查游戏版本或Java路径！");
                return false; // 确保返回 false
            }

            // 检查指定的 Java 路径是否存在
            if (!File.Exists(SettingsPage.JavaLibrary))
            {
                MessageBox.Show("指定的Java路径无效！");
                return false; // 确保返回 false
            }

            // 如果所有检查都通过，返回 true
            return true;
        }

        // 准备启动参数
        private LaunchConfig PrepareLaunchConfig(BaseAccount account)
        {
            // 如果 MinecraftPath 为空，则使用默认路径
            string minecraftRootPath = SettingsPage.MinecraftPath ?? @"C:\Users\Administrator\AppData\Roaming\.minecraft";

            return new LaunchConfig
            {
                Account = new()
                {
                    BaseAccount = account
                },
                GameCoreConfig = new()
                {
                    Root = minecraftRootPath,  // 使用计算出来的 .minecraft 路径
                    Version = SettingsPage.GameVer,
                    IsVersionIsolation = true
                },
                JavaConfig = new()
                {
                    JavaPath = SettingsPage.JavaLibrary,
                    MaxMemory = 4000,
                    MinMemory = 1000
                }
            };
        }

        // 启动游戏
        private async Task LaunchGame(LaunchConfig args)
        {
            try
            {
                var launcher = new StarLight_Core.Launch.MinecraftLauncher(args);
                var launch = await launcher.LaunchAsync(ReportProgress);

                launch.ErrorReceived += output => Console.WriteLine($"[错误] {output}");
                launch.OutputReceived += output => Console.WriteLine($"[日志] {output}");

                if (launch.Status == Status.Succeeded)
                {
                    // 更新UI显示
                    Progress.Text = "启动成功！";
                    Progress.Visibility = Visibility.Visible;
                }
                else
                {
                    LogError("游戏启动失败", launch.Exception);
                    MessageBox.Show("游戏启动失败，请检查日志文件。");
                    MessageBox.Show($"日志路径：{logPath}");
                }
            }
            catch (Exception ex)
            {
                LogError("游戏启动时发生异常", ex);
                MessageBox.Show("游戏启动时发生异常，请检查日志文件。");
                MessageBox.Show($"日志路径：{logPath}");
            }
        }

        // 更新进度
        private void ReportProgress(ProgressReport report)
        {
            Dispatcher.Invoke(() => Progress.Text = $"{report.Description} {report.Percentage}%");
        }

        // 日志记录
        private void LogError(string message, Exception? ex = null)
        {
            try
            {
                string logMessage = $"[{DateTime.Now}] {message}\n";

                if (ex != null)
                {
                    logMessage += $"异常信息：{ex.Message}\n堆栈信息：{ex.StackTrace}\n";
                }

                File.AppendAllText(logPath, logMessage);
            }
            catch (Exception logEx)
            {
                MessageBox.Show($"日志写入失败：{logEx.Message}");
            }
        }
    }
}
