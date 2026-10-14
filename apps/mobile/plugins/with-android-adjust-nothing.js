const { withAndroidManifest } = require("expo/config-plugins");

/** Edge-to-edge ignores adjustResize; adjustPan clips the composer card. KeyboardDock lifts instead. */
function withAndroidAdjustNothing(config) {
  return withAndroidManifest(config, (config) => {
    const activities = config.modResults.manifest.application?.[0]?.activity ?? [];
    for (const activity of activities) {
      if (activity.$["android:name"] === ".MainActivity") {
        activity.$["android:windowSoftInputMode"] = "adjustNothing";
      }
    }
    return config;
  });
}

module.exports = withAndroidAdjustNothing;
