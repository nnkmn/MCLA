using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;

namespace MCLA.page
{
    public partial class HomePage : Page
    {
        private LoginModeEnum loginMode; // 存储当前登录模式
        private string playerName; // 存储玩家名称

        public HomePage()
        {
            InitializeComponent();

            // 默认登录方式为离线
            loginMode = LoginModeEnum.Offline;

            // 显示离线登录面板
            OfflineLoginPanel.Visibility = Visibility.Visible;

            // 隐藏正版登录面板
            OnlineLoginPanel.Visibility = Visibility.Collapsed;

            // 设置默认离线头像（Alex头像）
            PlayerAvatar.Source = new BitmapImage(new Uri("pack://application:,,,/Images/skins/Alex.png")); // 离线头像
        }

        // 正版登录按钮点击事件
        private void OnlineButton_Click(object sender, RoutedEventArgs e)
        {
            loginMode = LoginModeEnum.Online;
            ToggleLoginPanels();

            // 获取玩家登录后的名字（例如从微软账号获取）
            playerName = "PlayerFromMicrosoft"; // 示例，实际应用中会从微软账号获取

            // 设置正版登录时的头像（通过Crafatar获取玩家皮肤）
            string skinUrl = $"https://crafatar.com/avatars/{playerName}?size=64"; // 获取玩家皮肤URL
            BitmapImage onlineAvatar = new BitmapImage(new Uri(skinUrl));
            PlayerAvatar.Source = onlineAvatar;
            PlayerAvatar.Visibility = Visibility.Visible;
        }

        // 离线登录按钮点击事件
        private void OfflineButton_Click(object sender, RoutedEventArgs e)
        {
            loginMode = LoginModeEnum.Offline;
            ToggleLoginPanels();

            // 获取玩家输入的名字（离线登录时的自定义名称）
            playerName = PlayerNameTextBox.Text.Trim();

            // 设置离线玩家的头像（使用默认离线头像）
            PlayerAvatar.Source = new BitmapImage(new Uri("pack://application:,,,/Images/skins/Alex.png")); // 离线头像
            PlayerAvatar.Visibility = Visibility.Visible;
        }

        // 切换登录面板显示
        private void ToggleLoginPanels()
        {
            if (loginMode == LoginModeEnum.Offline)
            {
                OfflineLoginPanel.Visibility = Visibility.Visible;
                OnlineLoginPanel.Visibility = Visibility.Collapsed;
            }
            else
            {
                OfflineLoginPanel.Visibility = Visibility.Collapsed;
                OnlineLoginPanel.Visibility = Visibility.Visible;
            }
        }

        // 启动游戏按钮点击事件
        private void Button_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // 根据登录模式加载对应账户信息并启动游戏
                if (loginMode == LoginModeEnum.Offline)
                {
                    playerName = PlayerNameTextBox.Text.Trim();
                    if (string.IsNullOrEmpty(playerName))
                    {
                        MessageBox.Show("离线登录需要提供玩家名称！");
                        return;
                    }
                    // 离线登录处理
                    MessageBox.Show($"离线登录成功！玩家名称: {playerName}");
                }
                else
                {
                    // 正版登录处理
                    MessageBox.Show($"正版登录成功！玩家名称: {playerName}");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"发生错误: {ex.Message}");
            }
        }
    }

    // 登录模式枚举
    public enum LoginModeEnum
    {
        Offline,
        Online
    }
}
