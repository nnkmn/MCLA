using StarLight_Core.Utilities;
using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using MCLA.Enums;
using System.IO;

namespace MCLA.page
{
    public partial class SettingsPage : Page
    {
        public static string GameVer { get; set; }
        public static string JavaLibrary { get; set; }
        public static int Login { get; set; }
        public static string UserName { get; set; }
        public static string MinecraftPath { get; set; } // 用于保存自动计算的 .minecraft 路径

        public SettingsPage()
        {
            InitializeComponent();
            LoadGameVersions();
            LoadJavaPaths();
        }

        // 加载游戏版本
        private void LoadGameVersions()
        {
            var gameCores = GameCoreUtil.GetGameCores();
            if (gameCores == null || !gameCores.Any())
            {
                MessageBox.Show("未找到任何游戏版本，请检查配置文件或数据源！");
                return;
            }

            GameVersions.DisplayMemberPath = "Id";
            GameVersions.SelectedValuePath = "Id";
            GameVersions.ItemsSource = gameCores;
            GameVersions.SelectedIndex = 0; // 默认选中第一项
        }

        // 加载Java路径
        private void LoadJavaPaths()
        {
            var javas = JavaUtil.GetJavas();
            if (javas == null || !javas.Any())
            {
                MessageBox.Show("未找到任何Java路径，请检查配置！");
                return;
            }

            JavaPath.DisplayMemberPath = "JavaPath";
            JavaPath.SelectedValuePath = "JavaPath";
            JavaPath.ItemsSource = javas;
            JavaPath.SelectedIndex = 0; // 默认选中第一项
        }

        // 游戏设置按钮点击时
        private void GameSettings_Button_Click(object sender, RoutedEventArgs e)
        {
            // 切换显示状态
            if (GameSettingsPanel.Visibility == Visibility.Collapsed)
            {
                GameSettingsPanel.Visibility = Visibility.Visible; // 显示内容
            }
            else
            {
                GameSettingsPanel.Visibility = Visibility.Collapsed; // 隐藏内容
            }
        }

        // 游戏版本选择变化时
        private void GameVersions_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (GameVersions.SelectedValue != null)
            {
                GameVer = GameVersions.SelectedValue.ToString();

                // 自动构建 .minecraft 路径
                string baseMinecraftPath = @"F:\MC lucha\MCLA\MCLA\bin\Debug\net6.0-windows\.minecraft"; // 这里可以是自定义路径
                string versionPath = Path.Combine(baseMinecraftPath, "versions", GameVer);

                if (Directory.Exists(versionPath))
                {
                    MinecraftPath = baseMinecraftPath;
                }
                else
                {
                    MessageBox.Show("所选版本的目录不存在！");
                }
            }
        }

        // Java路径选择变化时
        private void JavaPath_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (JavaPath.SelectedValue != null)
            {
                JavaLibrary = JavaPath.SelectedValue.ToString();
            }
        }
    }
}
