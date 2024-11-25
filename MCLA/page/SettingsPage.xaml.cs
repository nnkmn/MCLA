using StarLight_Core.Utilities;
using System;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using MCLA.Enums;

namespace MCLA.page
{
    /// <summary>
    /// SettingPage.xaml 的交互逻辑
    /// </summary>
    public partial class SettingsPage : Page
    {
        public static string GameVer { get; set; }
        public static string JaveLibrary { get; set; }
        public static int Login { get; set; }
        public static string UserName { get; set; }

       


        public SettingsPage()
        {
            InitializeComponent();
            GetgameVer();
            GetJavas();
            LoginMode.SelectedIndex = 0; // 默认选中在线模式
        }

        void GetgameVer()
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

        void GetJavas()
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

        private void LoginMode_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            Login = LoginMode.SelectedIndex;
            bool isOfflineMode = LoginMode.SelectedIndex == 0;

            PlayerNameText.Visibility = isOfflineMode ? Visibility.Visible : Visibility.Collapsed;
            PlayerName.Visibility = isOfflineMode ? Visibility.Visible : Visibility.Collapsed;
        }

        private void GameVersions_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (GameVersions.SelectedValue != null)
            {
                GameVer = GameVersions.SelectedValue.ToString();
            }
        }

        private void JavaPath_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (JavaPath.SelectedValue != null)
            {
                JaveLibrary = JavaPath.SelectedValue.ToString();
            }
        }

        private void PlayerName_TextChanged(object sender, TextChangedEventArgs e)
        {
            UserName = PlayerName.Text;
        }
    }
}
