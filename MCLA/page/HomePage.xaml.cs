using StarLight_Core.Authentication;
using StarLight_Core.Enum;
using StarLight_Core.Models.Authentication;
using StarLight_Core.Models.Launch;
using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using MCLA.Enums;

namespace MCLA.page
{
    public partial class HomePage : Page
    {
        private readonly string logPath;

        public HomePage()
        {
            InitializeComponent();

            // 初始化日志路径
            string logDirectory = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Logs");
            Directory.CreateDirectory(logDirectory); // 确保日志目录存在
            logPath = Path.Combine(logDirectory, "error.log");
        }

        private async void Button_click(object sender, RoutedEventArgs e)
        {
            try
            {
                // 校验登录模式
                if (!Enum.IsDefined(typeof(LoginModeEnum), SettingsPage.Login))
                {
                    MessageBox.Show("未知的登录模式，请重新配置！");
                    return;
                }

                LoginModeEnum loginMode = (LoginModeEnum)SettingsPage.Login;  // 将 int 转换为 LoginModeEnum 枚举
                BaseAccount account;

                // 离线模式登录逻辑
                if (loginMode == LoginModeEnum.Offline)
                {
                    if (string.IsNullOrWhiteSpace(SettingsPage.UserName))
                    {
                        MessageBox.Show("离线模式需要提供用户名，请重新配置！");
                        return;
                    }
                    account = new OfflineAuthentication(SettingsPage.UserName).OfflineAuth();
                }
                else // 在线模式
                {
                    account = await HandleMicrosoftAuthentication();
                    if (account == null)
                        return; // 如果微软认证失败，直接退出
                }

                // 校验启动配置
                if (!ValidateLaunchConfig())
                    return;

                // 准备启动参数
                LaunchConfig args = PrepareLaunchConfig(account);

                // 启动游戏
                await LaunchGame(args);
            }
            catch (Exception ex)
            {
                LogError("发生未处理的异常", ex);
                MessageBox.Show("发生未处理的异常，请检查日志文件。");
            }
        }

        // 处理微软认证
        private async Task<BaseAccount?> HandleMicrosoftAuthentication()
        {
            try
            {
                var auth = new MicrosoftAuthentication("youer MicrosoftAuthentication Id");
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
            if (string.IsNullOrWhiteSpace(SettingsPage.GameVer) || string.IsNullOrWhiteSpace(SettingsPage.JaveLibrary))
            {
                MessageBox.Show("启动配置缺失，请检查游戏版本或Java路径！");
                return false;
            }

            if (!File.Exists(SettingsPage.JaveLibrary))
            {
                MessageBox.Show("指定的Java路径无效！");
                return false;
            }

            return true;
        }

        // 准备启动参数
        private LaunchConfig PrepareLaunchConfig(BaseAccount account)
        {
            return new LaunchConfig
            {
                Account = new()
                {
                    BaseAccount = account
                },
                GameCoreConfig = new()
                {
                    Root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), ".minecraft"),
                    Version = SettingsPage.GameVer,
                    IsVersionIsolation = true
                },
                JavaConfig = new()
                {
                    JavaPath = SettingsPage.JaveLibrary,
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
                    MessageBox.Show("启动成功！");
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
