import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.dryousef.tasks",
  appName: "Dr.Yousef Tasks",
  webDir: "out",
  android: { backgroundColor: "#F5F6FA", allowMixedContent: false },
  plugins: { LocalNotifications: { smallIcon: "ic_stat_icon_config_sample", iconColor: "#6C63FF" } },
};
export default config;
